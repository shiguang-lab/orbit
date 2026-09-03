/**
 * 入口：启动守卫(完全仿 asset-hub main.tsx)。
 * bootstrap → requireAuthSession()：已登录渲染应用；未登录进入 Orbit 原生登录页。
 */
import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { App, Spin } from "antd";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { router } from "@/app/router";
import {
  BrokerUnavailableError,
  requireAuthSession,
  type AuthSession,
} from "@/auth/session";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 15_000,
    },
  },
});

function AppRoot() {
  const isLoginRoute = window.location.pathname === "/login";
  // undefined=探测中(SSO 跳转前), AuthSession=已登录
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [brokerError, setBrokerError] = useState(false);

  useEffect(() => {
    if (isLoginRoute) {
      setSession(null);
      return;
    }
    let cancelled = false;
    void requireAuthSession()
      .then((s) => {
        if (!cancelled) setSession(s);
      })
      .catch((error: unknown) => {
        if (!cancelled && error instanceof BrokerUnavailableError) {
          setBrokerError(true);
          setSession(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [isLoginRoute]);

  if (isLoginRoute) return <RouterProvider router={router} />;

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (brokerError) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <div>
          <h2>本地 SSO Broker 不可用</h2>
          <p>请检查线上 auth-service 的 Local Broker 配置，或关闭 SG_LOCAL_BROKER_ENABLED。</p>
          <button type="button" onClick={() => window.location.reload()}>
            重试
          </button>
        </div>
      </div>
    );
  }

  // 未登录时 requireAuthSession 已跳转当前模式的登录页。
  if (!session) {
    return null;
  }

  return <RouterProvider router={router} />;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider>
      <App>
        <QueryClientProvider client={queryClient}>
          <AppRoot />
        </QueryClientProvider>
      </App>
    </ThemeProvider>
  </StrictMode>,
);
