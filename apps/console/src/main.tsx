import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "react-router-dom";
import { App, Spin, Alert, Button, Space } from "antd";
import { ThemeProvider } from "@/theme/ThemeProvider";
import { router } from "@/app/router";
import {
  DEV_DEFAULT_SESSION,
  retryUnifiedLogin,
  requireAuthSession,
  type AuthSession,
} from "@/auth/session";

import { useI18n } from "@/i18n";

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
  const { tt } = useI18n();
  // undefined=探测中(SSO 跳转前), AuthSession=已登录
  const [session, setSession] = useState<AuthSession | null | undefined>(undefined);
  const [sessionError, setSessionError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void requireAuthSession()
      .then((s) => {
        if (!cancelled) setSession(s ?? (import.meta.env.DEV ? DEV_DEFAULT_SESSION : null));
      })
      .catch(() => {
        if (!cancelled) {
          if (import.meta.env.DEV) {
            setSession(DEV_DEFAULT_SESSION);
            return;
          }
          setSessionError(true);
          setSession(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (session === undefined) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (sessionError && !import.meta.env.DEV) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
        <Space direction="vertical">
          <Alert type="error" showIcon message={tt("SSO 会话验证失败", "SSO session verification failed")}
            description={tt("请检查账户的产品访问权限与认证服务状态。", "Check your product access permissions and authentication service status.")} />
          <Button onClick={() => window.location.reload()}>{tt("重新验证", "Verify again")}</Button>
          <Button onClick={retryUnifiedLogin}>{tt("重新登录", "Sign in again")}</Button>
        </Space>
      </div>
    );
  }

  // 未登录时 requireAuthSession 已跳转统一 SSO 登录页。
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
