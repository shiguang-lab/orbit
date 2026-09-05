import { Alert, Button, Card, Input, Space, Spin, Typography } from "antd";
import { useEffect, useState, type FormEvent } from "react";

type LoginSettings = {
  authenticated?: boolean;
  requireLogin?: boolean;
  hasPassword?: boolean;
  setupComplete?: boolean;
  oidcEnabled?: boolean;
  oidcDisablePasswordLogin?: boolean;
};

function safeReturnTo(): string {
  const value = new URLSearchParams(window.location.search).get("return_to");
  if (!value) return "/dashboard";
  try {
    const parsed = new URL(value, window.location.origin);
    return parsed.origin === window.location.origin
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : "/dashboard";
  } catch {
    return "/dashboard";
  }
}

/** Shiguang Gateway's native management login. Provider OAuth login is handled separately by CLIProxyAPI. */
export default function LoginPage() {
  const [settings, setSettings] = useState<LoginSettings | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 5000);
    void fetch("/api/settings/require-login", { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        const body = (await response.json()) as LoginSettings;
        if (response.ok) {
          if (body.authenticated === true || body.requireLogin === false) {
            window.location.replace(safeReturnTo());
            return;
          }
          setSettings(body);
        } else {
          setSettings({ hasPassword: true, setupComplete: true });
        }
      })
      .catch(() => setSettings({ hasPassword: true, setupComplete: true }))
      .finally(() => window.clearTimeout(timer));
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, []);

  async function submitPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ password }),
      });
      const body = (await response.json().catch(() => ({}))) as { error?: string; needsSetup?: boolean };
      if (!response.ok) {
        setError(body.needsSetup ? "尚未配置管理密码，请先完成 Shiguang Gateway 初始化。" : body.error || "登录失败");
        return;
      }
      window.location.replace(safeReturnTo());
    } catch {
      setError("无法连接服务，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }

  if (!settings) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}><Spin size="large" /></div>;
  }

  const oidcOnly = settings.oidcEnabled && settings.oidcDisablePasswordLogin;
  return (
    <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24 }}>
      <Card style={{ width: "min(100%, 420px)" }}>
        <Space direction="vertical" size="large" style={{ width: "100%" }}>
          <div>
            <Typography.Title level={2} style={{ marginBottom: 8 }}>Shiguang Gateway</Typography.Title>
            <Typography.Text type="secondary">管理控制台登录</Typography.Text>
          </div>
          {error && <Alert type="error" showIcon message={error} />}
          {oidcOnly ? (
            <Button type="primary" block href="/api/auth/oidc/login">使用 OIDC 登录</Button>
          ) : (
            <form onSubmit={(event) => void submitPassword(event)}>
              <Space direction="vertical" style={{ width: "100%" }}>
                <Input.Password autoFocus value={password} onChange={(event) => setPassword(event.target.value)} placeholder="管理密码" />
                <Button type="primary" htmlType="submit" loading={loading} block>登录</Button>
              </Space>
            </form>
          )}
          {settings.oidcEnabled && !oidcOnly && <Button block href="/api/auth/oidc/login">使用 OIDC 登录</Button>}
        </Space>
      </Card>
    </div>
  );
}
