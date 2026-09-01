import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ command, mode }) => {
  // Load the workspace-level env so admin and the BFF use the same local broker
  // credentials regardless of whether Vite is started from the package or root.
  const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const env = { ...loadEnv(mode, repoRoot, ""), ...loadEnv(mode, ".", ""), ...process.env };
  // 新 BFF(Fastify)地址，复用引擎；本地起 BFF 后指向它
  const bffTarget = env.OMNIROUTE_ADMIN_BFF_TARGET ?? "http://127.0.0.1:8787";
  // shiguang 统一登录(auth-service)
  const authTarget = env.VITE_UNIFIED_LOGIN_ORIGIN ?? "https://shiguanglab.com";
  const brokerRequested = env.SG_LOCAL_BROKER_ENABLED === "true";
  if (command === "build" && brokerRequested) {
    throw new Error("SG_LOCAL_BROKER_ENABLED is only allowed for the local dev server");
  }

  const unifiedLoginProxy = () => ({
    target: authTarget,
    changeOrigin: true,
    cookieDomainRewrite: "",
    headers: { Origin: authTarget },
  });


  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // The BFF owns local auth (dev identity or broker); keep the dev server loopback-only.
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        // Authentication/session is handled by the local BFF in every dev mode.
        "/api/auth": { target: bffTarget, changeOrigin: true },
        // 业务 API → 新 BFF(Fastify, 复用引擎)
        "/api": { target: bffTarget, changeOrigin: true },
        // shiguang 统一登录页(asset-hub 同款)
        "/login": unifiedLoginProxy(),
        "/register": unifiedLoginProxy(),
        "/auth": unifiedLoginProxy(),
        // 长连接 WS（live server 独立端口，默认 20132）
        "/live-ws": {
          target: "ws://100.87.115.78:20132",
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            react: ["react", "react-dom", "react-router-dom"],
            antd: ["antd", "@ant-design/icons"],
            query: ["@tanstack/react-query"],
          },
        },
      },
    },
  };
});
