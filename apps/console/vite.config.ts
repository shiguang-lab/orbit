import { fileURLToPath, URL } from "node:url";
import { resolve } from "node:path";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig(({ mode }) => {
  // Load the workspace-level env so admin and the BFF use the same local broker
  // credentials regardless of whether Vite is started from the package or root.
  const repoRoot = resolve(fileURLToPath(new URL("../..", import.meta.url)));
  const env = { ...loadEnv(mode, repoRoot, ""), ...loadEnv(mode, ".", ""), ...process.env };
  // Independent service targets. The existing BFF remains a compatibility
  // launcher, but new development uses the split control/edge/realtime apps.
  const controlTarget = env.SHIGUANG_GATEWAY_CONTROL_API_TARGET ?? "http://127.0.0.1:8788";
  const edgeTarget = env.SHIGUANG_GATEWAY_EDGE_GATEWAY_TARGET ?? "http://127.0.0.1:8787";

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./src", import.meta.url)),
      },
    },
    server: {
      // Local control API verifies broker assertions; keep the dev server loopback-only.
      host: "127.0.0.1",
      port: 5173,
      proxy: {
        // Authentication/session is handled by the local BFF in every dev mode.
        "/api/v1": { target: edgeTarget, changeOrigin: true },
        "/api/v1beta": { target: edgeTarget, changeOrigin: true },
        "/api/auth": { target: controlTarget, changeOrigin: false },
        // 管理 API → control(Fastify + 本地 runtime)
        "/api": { target: controlTarget, changeOrigin: true },
        // 长连接 WS；生产环境由同源反向代理转发到本地 realtime 服务。
        "/live-ws": {
          target: env.SHIGUANG_GATEWAY_LIVE_WS_TARGET ?? "ws://127.0.0.1:20132",
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
