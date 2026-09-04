import { useState, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { endpointsApi } from "@/entities/api";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { OpenAiApiTab } from "./openai-api-tab";
import { McpDashboard } from "./mcp-dashboard";
import { A2aDashboard } from "./a2a-dashboard";
import { ContextSources } from "./context-sources";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Text, Title, Paragraph } = Typography;
const CUSTOM_PUBLIC_URL_STORAGE_KEY = "omniroute.endpoints.customPublicUrl";

function readStoredCustomPublicUrl(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(CUSTOM_PUBLIC_URL_STORAGE_KEY)?.trim() ?? "";
  } catch {
    return "";
  }
}

function persistCustomPublicUrl(value: string): boolean {
  try {
    if (value) {
      window.localStorage.setItem(CUSTOM_PUBLIC_URL_STORAGE_KEY, value);
    } else {
      window.localStorage.removeItem(CUSTOM_PUBLIC_URL_STORAGE_KEY);
    }
    return true;
  } catch {
    return false;
  }
}

function isLocalNetworkHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const isPrivateIpv6 = host.includes(":") && (/^f[cd]/.test(host) || /^fe[89ab]/.test(host));
  if (
    host === "localhost" ||
    host === "::1" ||
    host.endsWith(".localhost") ||
    host.endsWith(".local") ||
    isPrivateIpv6
  ) {
    return true;
  }

  const octets = host.split(".").map(Number);
  if (octets.length !== 4 || octets.some((octet) => !Number.isInteger(octet))) return false;
  const [first, second] = octets;
  return (
    first === 10 ||
    first === 127 ||
    (first === 169 && second === 254) ||
    (first === 172 && second >= 16 && second <= 31) ||
    (first === 192 && second === 168) ||
    (first === 100 && second >= 64 && second <= 127)
  );
}

function getCurrentPublicBaseUrl(): string {
  if (typeof window === "undefined") return "";
  const { protocol, hostname, origin } = window.location;
  if (protocol !== "https:" || isLocalNetworkHostname(hostname)) return "";
  return `${origin.replace(/\/$/, "")}/v1`;
}

const useStyles = createStyles(({ token }) => ({
  networkCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "border-color 0.2s, box-shadow 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
      boxShadow: token.boxShadowTertiary,
    },
  },
  urlCodeBox: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: 600,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: "4px 8px",
    borderRadius: 4,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    minHeight: 32,
  },
  tunnelCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    padding: 12,
  },
}));

export default function EndpointsPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const { tt } = useI18n();

  const [activeTab, setActiveTab] = useState<string>("apis");
  const [customPublicUrl, setCustomPublicUrl] = useState<string>(readStoredCustomPublicUrl);
  const [customPublicUrlDraft, setCustomPublicUrlDraft] = useState<string>(customPublicUrl);
  const [customUrlModalOpen, setCustomUrlModalOpen] = useState(false);

  const [ngrokToken, setNgrokToken] = useState("");
  const [ngrokModalOpen, setNgrokModalOpen] = useState(false);

  // Tailscale Tsnet State
  const [tailscaleModalOpen, setTailscaleModalOpen] = useState(false);
  const [tailscaleAuthKey, setTailscaleAuthKey] = useState("");
  const [tailscaleHostname, setTailscaleHostname] = useState("omniroute-gateway");
  const [tailscaleEphemeral, setTailscaleEphemeral] = useState(false);

  // Network info query
  const networkQuery = useQuery({
    queryKey: ["network-info"],
    queryFn: endpointsApi.networkInfo,
    staleTime: 30_000,
  });

  const tailscaleStatusQuery = useQuery({
    queryKey: ["tailscale-status"],
    queryFn: endpointsApi.getTailscaleStatus,
    staleTime: 10_000,
  });

  // Tunnels queries
  const cloudflaredQuery = useQuery({
    queryKey: ["tunnel-cloudflared"],
    queryFn: endpointsApi.cloudflaredTunnel,
    staleTime: 15_000,
  });
  const tailscaleQuery = useQuery({
    queryKey: ["tunnel-tailscale"],
    queryFn: endpointsApi.tailscaleTunnel,
    staleTime: 15_000,
  });
  const ngrokQuery = useQuery({
    queryKey: ["tunnel-ngrok"],
    queryFn: endpointsApi.ngrokTunnel,
    staleTime: 15_000,
  });

  // Tunnel Mutations
  const toggleCloudflared = useMutation({
    mutationFn: () =>
      cloudflaredQuery.data?.running
        ? endpointsApi.stopCloudflaredTunnel()
        : endpointsApi.startCloudflaredTunnel(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tunnel-cloudflared"] });
      message.success(tt("Cloudflared 状态已更新", "Cloudflared status updated"));
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : tt("操作 Cloudflared 失败", "Cloudflared operation failed")),
  });

  const toggleTailscale = useMutation({
    mutationFn: () =>
      tailscaleQuery.data?.running
        ? endpointsApi.stopTailscaleTunnel()
        : endpointsApi.startTailscaleTunnel(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tunnel-tailscale"] });
      message.success(tt("Tailscale Funnel 状态已更新", "Tailscale Funnel status updated"));
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : tt("操作 Tailscale Funnel 失败", "Tailscale Funnel operation failed")),
  });

  const startNgrok = useMutation({
    mutationFn: (token: string) => endpointsApi.startNgrokTunnel(token),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tunnel-ngrok"] });
      message.success(tt("Ngrok 隧道已启动", "Ngrok tunnel started"));
      setNgrokModalOpen(false);
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : tt("启动 Ngrok 失败", "Failed to start Ngrok")),
  });

  const stopNgrok = useMutation({
    mutationFn: endpointsApi.stopNgrokTunnel,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tunnel-ngrok"] });
      message.success(tt("Ngrok 隧道已停止", "Ngrok tunnel stopped"));
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : tt("停止 Ngrok 失败", "Failed to stop Ngrok")),
  });

  // Tsnet Node Mutations
  const connectTailscale = useMutation({
    mutationFn: (payload: { authKey: string; hostname?: string; ephemeral?: boolean }) =>
      endpointsApi.connectTailscaleAuthKey(payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tailscale-status"] });
      message.success(tt("已成功接入 Tailscale 专网！", "Connected to Tailscale network!"));
      setTailscaleModalOpen(false);
      setTailscaleAuthKey("");
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : tt("接入 Tailscale 失败", "Failed to connect to Tailscale")),
  });

  const disconnectTailscale = useMutation({
    mutationFn: endpointsApi.disconnectTailscale,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tailscale-status"] });
      message.success(tt("已断开 Tailscale 专网连接", "Disconnected from Tailscale"));
      setTailscaleModalOpen(false);
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : tt("断开 Tailscale 失败", "Failed to disconnect Tailscale")),
  });

  const copyToClipboard = (text: string, successMsg: string) => {
    navigator.clipboard.writeText(text);
    message.success(successMsg);
  };

  // Compute addresses
  const port = networkQuery.data?.port || (typeof window !== "undefined" && window.location.port ? window.location.port : "20128");
  const localBaseUrl = networkQuery.data?.localUrl || "http://localhost:20128/v1";
  const lanUrls = networkQuery.data?.lanUrls || [];
  const currentPublicBaseUrl = getCurrentPublicBaseUrl();

  const publicBaseUrl = useMemo(() => {
    if (customPublicUrl.trim()) return customPublicUrl.trim();
    if (cloudflaredQuery.data?.publicUrl) return `${cloudflaredQuery.data.publicUrl}/v1`;
    if (tailscaleQuery.data?.publicUrl) return `${tailscaleQuery.data.publicUrl}/v1`;
    if (ngrokQuery.data?.publicUrl) return `${ngrokQuery.data.publicUrl}/v1`;
    return currentPublicBaseUrl;
  }, [customPublicUrl, cloudflaredQuery.data, tailscaleQuery.data, ngrokQuery.data, currentPublicBaseUrl]);

  const clientIsOverTailscale = useMemo(() => {
    if (typeof window === "undefined") return false;
    const host = window.location.hostname.toLowerCase();
    if (host.endsWith(".ts.net") || host.endsWith(".tailscale.net")) return true;
    const octets = host.split(".").map(Number);
    if (octets.length === 4 && octets.every((o) => Number.isInteger(o))) {
      const [first, second] = octets;
      if (first === 100 && second >= 64 && second <= 127) return true;
    }
    return false;
  }, []);

  const clientTailscaleUrl = useMemo(() => {
    if (typeof window === "undefined" || !clientIsOverTailscale) return "";
    return `${window.location.origin.replace(/\/$/, "")}/v1`;
  }, [clientIsOverTailscale]);

  const isTailscaleConnected =
    Boolean(tailscaleStatusQuery.data?.connected) ||
    Boolean(networkQuery.data?.tailscaleUrl) ||
    Boolean(networkQuery.data?.tailscaleIpUrl) ||
    Boolean(tailscaleQuery.data?.running) ||
    clientIsOverTailscale;

  const effectiveTailscaleUrl = useMemo(() => {
    if (networkQuery.data?.tailscaleUrl) return networkQuery.data.tailscaleUrl;
    if (tailscaleStatusQuery.data?.magicDns) return `https://${tailscaleStatusQuery.data.magicDns}/v1`;
    if (tailscaleStatusQuery.data?.tailscaleUrl) return `${tailscaleStatusQuery.data.tailscaleUrl.replace(/\/$/, "")}/v1`;
    if (tailscaleStatusQuery.data?.ip) return `http://${tailscaleStatusQuery.data.ip}:${port}/v1`;
    if (networkQuery.data?.tailscaleIpUrl) return networkQuery.data.tailscaleIpUrl;
    if (tailscaleQuery.data?.publicUrl) return `${tailscaleQuery.data.publicUrl.replace(/\/$/, "")}/v1`;
    if (clientTailscaleUrl) return clientTailscaleUrl;
    return "";
  }, [networkQuery.data, tailscaleStatusQuery.data, tailscaleQuery.data, clientTailscaleUrl, port]);

  const effectiveBaseUrl = publicBaseUrl || localBaseUrl;

  if (networkQuery.isLoading && !networkQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <Flex vertical gap={16}>
      {/* Top Header */}
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 20 }}>
            {tt("端点与连接网关", "Endpoints & Gateway")}
          </Title>
          <Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {tt(
              "查看服务基准地址、配置公网安全穿透隧道及探索全量 OpenAI / MCP / A2A 协议 API 端点",
              "View service base URLs, configure secure tunnels, and explore OpenAI, MCP, and A2A endpoints."
            )}
          </Paragraph>
        </div>

        <Button
          icon={<MaterialIcon name="refresh" size={14} />}
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["network-info"] });
            void queryClient.invalidateQueries({ queryKey: ["tailscale-status"] });
            void queryClient.invalidateQueries({ queryKey: ["tunnel-cloudflared"] });
            void queryClient.invalidateQueries({ queryKey: ["tunnel-tailscale"] });
            void queryClient.invalidateQueries({ queryKey: ["tunnel-ngrok"] });
            message.success(tt("端点连接状态已刷新", "Endpoint status refreshed"));
          }}
        >
          {tt("刷新网关状态", "Refresh Gateway")}
        </Button>
      </Flex>

      {/* Network Access Cards (4 Cards Grid) */}
      <Row gutter={[12, 12]}>
        {/* 1. Public Endpoint */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className={styles.networkCard}>
            <Flex vertical gap={8}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={6}>
                  <MaterialIcon name="language" size={16} style={{ color: "#F59E0B" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("公网访问基址", "Public Base URL")}
                  </Text>
                </Flex>
                <Tag
                  color={publicBaseUrl ? "success" : "default"}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {publicBaseUrl ? tt("在线 (HTTPS)", "Online (HTTPS)") : tt("未开启", "Disabled")}
                </Tag>
              </Flex>

              <div className={styles.urlCodeBox}>
                {publicBaseUrl ? (
                  <>
                    <Text ellipsis code strong style={{ fontSize: 12, color: "#D97706" }}>
                      {publicBaseUrl}
                    </Text>
                    <Button
                      type="text"
                      size="small"
                      icon={<MaterialIcon name="content_copy" size={14} />}
                      onClick={() => copyToClipboard(publicBaseUrl, tt("已复制公网端点基址", "Copied public URL"))}
                    />
                  </>
                ) : (
                  <>
                    <Text type="secondary" ellipsis style={{ fontSize: 11 }}>
                      {tt("尚未开启公网隧道", "No public tunnel enabled")}
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      loading={toggleCloudflared.isPending}
                      onClick={() => toggleCloudflared.mutate()}
                      style={{ padding: 0, height: "auto", fontSize: 11 }}
                    >
                      {tt("开启隧道", "Enable Tunnel")}
                    </Button>
                  </>
                )}
              </div>
            </Flex>
          </Card>
        </Col>

        {/* 2. Localhost */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className={styles.networkCard}>
            <Flex vertical gap={8}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={6}>
                  <MaterialIcon name="computer" size={16} style={{ color: "#10B981" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("本地访问基址", "Local Base URL")}
                  </Text>
                </Flex>
                <Tag color="success" style={{ margin: 0, fontSize: 10 }}>
                  {tt("在线", "Online")}
                </Tag>
              </Flex>
              <div className={styles.urlCodeBox}>
                <Text ellipsis code strong style={{ fontSize: 12 }}>
                  {localBaseUrl}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<MaterialIcon name="content_copy" size={14} />}
                  onClick={() => copyToClipboard(localBaseUrl, tt("已复制本地基址", "Copied local URL"))}
                />
              </div>
            </Flex>
          </Card>
        </Col>

        {/* 3. LAN Access */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className={styles.networkCard}>
            <Flex vertical gap={8}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={6}>
                  <MaterialIcon name="lan" size={16} style={{ color: "#3B82F6" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("局域网内网基址", "LAN Base URL")}
                  </Text>
                </Flex>
                <Tag
                  color={lanUrls.length > 0 ? "blue" : "default"}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {lanUrls.length > 0 ? `${lanUrls.length} ${tt("个地址", "URLs")}` : tt("未分配", "Unassigned")}
                </Tag>
              </Flex>
              <div className={styles.urlCodeBox}>
                <Text ellipsis code strong style={{ fontSize: 12 }}>
                  {lanUrls[0] || "http://192.168.x.x:20128/v1"}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<MaterialIcon name="content_copy" size={14} />}
                  onClick={() =>
                    copyToClipboard(lanUrls[0] || "http://192.168.x.x:20128/v1", tt("已复制局域网基址", "Copied LAN URL"))
                  }
                />
              </div>
            </Flex>
          </Card>
        </Col>

        {/* 4. Tailscale / VPN */}
        <Col xs={24} sm={12} lg={6}>
          <Card size="small" className={styles.networkCard}>
            <Flex vertical gap={8}>
              <Flex align="center" justify="space-between">
                <Flex align="center" gap={6}>
                  <MaterialIcon name="vpn_lock" size={16} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    Tailscale 专网基址
                  </Text>
                </Flex>
                <Tag
                  color={isTailscaleConnected ? "purple" : "default"}
                  style={{ margin: 0, fontSize: 10, cursor: "pointer" }}
                  onClick={() => setTailscaleModalOpen(true)}
                >
                  {isTailscaleConnected ? "在线 (Tailnet)" : "未接入"}
                </Tag>
              </Flex>
              <div className={styles.urlCodeBox}>
                {isTailscaleConnected && effectiveTailscaleUrl ? (
                  <>
                    <Text ellipsis code strong style={{ fontSize: 12, color: "#a855f7" }}>
                      {effectiveTailscaleUrl}
                    </Text>
                    <Space size={2}>
                      <Button
                        type="text"
                        size="small"
                        icon={<MaterialIcon name="content_copy" size={14} />}
                        onClick={() => copyToClipboard(effectiveTailscaleUrl, "已复制专网基址")}
                      />
                      <Button
                        type="text"
                        size="small"
                        icon={<MaterialIcon name="settings" size={14} />}
                        onClick={() => setTailscaleModalOpen(true)}
                        title="管理专网连接"
                      />
                    </Space>
                  </>
                ) : (
                  <>
                    <Text type="secondary" ellipsis style={{ fontSize: 11 }}>
                      未接入 Tailnet 专网
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      onClick={() => setTailscaleModalOpen(true)}
                      style={{ padding: 0, height: "auto", fontSize: 11, fontWeight: 600 }}
                    >
                      🔑 填入 Auth Key
                    </Button>
                  </>
                )}
              </div>
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Public Tunnels Card */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Flex vertical gap={12}>
          <Flex align="center" justify="space-between" wrap gap={8}>
            <Flex align="center" gap={8}>
              <MaterialIcon name="hub" size={18} style={{ color: "#F59E0B" }} />
              <Text strong style={{ fontSize: 14, lineHeight: 1 }}>
                公网安全穿透隧道 (Tunnels & Gateways)
              </Text>
            </Flex>
            <Space size={8}>
              <Button
                size="small"
                type="dashed"
                onClick={() => {
                  setCustomPublicUrlDraft(customPublicUrl);
                  setCustomUrlModalOpen(true);
                }}
              >
                {customPublicUrl ? "修改自定义公网域名" : "配置自定义公网域名"}
              </Button>
              <Text type="secondary" style={{ fontSize: 12 }}>
                支持免公网 IP 安全对外提供 HTTPS 访问
              </Text>
            </Space>
          </Flex>

          <Row gutter={[12, 12]}>
            {/* Cloudflared */}
            <Col xs={24} md={8}>
              <div className={styles.tunnelCard}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 6 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    Cloudflare Tunnel
                  </Text>
                  <Tag color={cloudflaredQuery.data?.running ? "success" : "default"}>
                    {cloudflaredQuery.data?.running ? "运行中" : "未启动"}
                  </Tag>
                </Flex>
                <Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 8, minHeight: 28 }}>
                  {cloudflaredQuery.data?.publicUrl || "基于 Cloudflare 边缘节点快速免费穿透"}
                </Paragraph>
                <Flex justify="space-between" align="center">
                  <Button
                    size="small"
                    type={cloudflaredQuery.data?.running ? "default" : "primary"}
                    loading={toggleCloudflared.isPending}
                    onClick={() => toggleCloudflared.mutate()}
                  >
                    {cloudflaredQuery.data?.running ? "停止隧道" : "启动隧道"}
                  </Button>
                  {cloudflaredQuery.data?.publicUrl && (
                    <Button
                      size="small"
                      type="link"
                      icon={<MaterialIcon name="content_copy" size={13} />}
                      onClick={() =>
                        copyToClipboard(
                          `${cloudflaredQuery.data?.publicUrl}/v1`,
                          "已复制 Cloudflare 公网地址"
                        )
                      }
                    >
                      复制公网 URL
                    </Button>
                  )}
                </Flex>
              </div>
            </Col>

            {/* Tailscale Funnel */}
            <Col xs={24} md={8}>
              <div className={styles.tunnelCard}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 6 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    Tailscale Funnel
                  </Text>
                  <Tag color={tailscaleQuery.data?.running ? "success" : "default"}>
                    {tailscaleQuery.data?.running ? "运行中" : "未启动"}
                  </Tag>
                </Flex>
                <Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 8, minHeight: 28 }}>
                  {tailscaleQuery.data?.publicUrl || "基于 Tailscale MagicDNS 与 Funnel 安全公开"}
                </Paragraph>
                <Flex justify="space-between" align="center">
                  <Button
                    size="small"
                    type={tailscaleQuery.data?.running ? "default" : "primary"}
                    loading={toggleTailscale.isPending}
                    onClick={() => toggleTailscale.mutate()}
                  >
                    {tailscaleQuery.data?.running ? "关闭 Funnel" : "开启 Funnel"}
                  </Button>
                  {tailscaleQuery.data?.publicUrl && (
                    <Button
                      size="small"
                      type="link"
                      icon={<MaterialIcon name="content_copy" size={13} />}
                      onClick={() =>
                        copyToClipboard(
                          `${tailscaleQuery.data?.publicUrl}/v1`,
                          "已复制 Tailscale 公网地址"
                        )
                      }
                    >
                      复制公网 URL
                    </Button>
                  )}
                </Flex>
              </div>
            </Col>

            {/* Ngrok */}
            <Col xs={24} md={8}>
              <div className={styles.tunnelCard}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 6 }}>
                  <Text strong style={{ fontSize: 13 }}>
                    Ngrok Tunnel
                  </Text>
                  <Tag color={ngrokQuery.data?.running ? "success" : "default"}>
                    {ngrokQuery.data?.running ? "运行中" : "未启动"}
                  </Tag>
                </Flex>
                <Paragraph type="secondary" style={{ fontSize: 11, marginBottom: 8, minHeight: 28 }}>
                  {ngrokQuery.data?.publicUrl || "通用反向代理通道 (需提供 Auth Token)"}
                </Paragraph>
                <Flex justify="space-between" align="center">
                  {ngrokQuery.data?.running ? (
                    <Button
                      size="small"
                      loading={stopNgrok.isPending}
                      onClick={() => stopNgrok.mutate()}
                    >
                      停止 Ngrok
                    </Button>
                  ) : (
                    <Button size="small" onClick={() => setNgrokModalOpen(true)}>
                      配置并启动
                    </Button>
                  )}
                  {ngrokQuery.data?.publicUrl && (
                    <Button
                      size="small"
                      type="link"
                      icon={<MaterialIcon name="content_copy" size={13} />}
                      onClick={() =>
                        copyToClipboard(
                          `${ngrokQuery.data?.publicUrl}/v1`,
                          "已复制 Ngrok 公网地址"
                        )
                      }
                    >
                      复制公网 URL
                    </Button>
                  )}
                </Flex>
              </div>
            </Col>
          </Row>
        </Flex>
      </Card>

      {/* Custom Public URL Modal */}
      <Modal
        open={customUrlModalOpen}
        onCancel={() => setCustomUrlModalOpen(false)}
        title="设置自定义公开域名 / 反向代理基址"
        onOk={() => {
          const nextUrl = customPublicUrlDraft.trim().replace(/\/+$/, "");
          if (nextUrl) {
            try {
              const parsedUrl = new URL(nextUrl);
              if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
                throw new Error("unsupported protocol");
              }
            } catch {
              message.error("请输入有效的 HTTP 或 HTTPS 地址");
              return;
            }
          }
          if (!persistCustomPublicUrl(nextUrl)) {
            message.error("浏览器无法保存自定义公网域名");
            return;
          }
          setCustomPublicUrl(nextUrl);
          setCustomUrlModalOpen(false);
          message.success(nextUrl ? "已保存自定义公开域名" : "已清除自定义公开域名");
        }}
        okText="保存"
        cancelText="取消"
      >
        <Flex vertical gap={12} style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            若您使用 Nginx / Caddy 反向代理或已有独立域名，可在此填入公开访问前缀（例如：
            <Text code>https://api.mycompany.com</Text>）：
          </Text>
          <Input
            placeholder="https://api.example.com"
            value={customPublicUrlDraft}
            onChange={(e) => setCustomPublicUrlDraft(e.target.value)}
          />
        </Flex>
      </Modal>

      {/* Ngrok Config Modal */}
      <Modal
        open={ngrokModalOpen}
        onCancel={() => setNgrokModalOpen(false)}
        title="启动 Ngrok 隧道"
        onOk={() => startNgrok.mutate(ngrokToken)}
        confirmLoading={startNgrok.isPending}
        okText="启动"
        cancelText="取消"
      >
        <Flex vertical gap={12} style={{ marginTop: 12 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            请输入您的 Ngrok Auth Token（可从 ngrok.com 控制台获取）：
          </Text>
          <Input.Password
            placeholder="2N... (AuthToken)"
            value={ngrokToken}
            onChange={(e) => setNgrokToken(e.target.value)}
          />
        </Flex>
      </Modal>

      {/* Tailscale Tsnet Auth Key Modal */}
      <Modal
        open={tailscaleModalOpen}
        onCancel={() => setTailscaleModalOpen(false)}
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="vpn_lock" size={20} style={{ color: "#8B5CF6" }} />
            <span>接入 Tailscale 专网 (Tsnet 免特权直连)</span>
          </Flex>
        }
        footer={null}
        width={560}
      >
        {isTailscaleConnected ? (
          <Flex vertical gap={16} style={{ marginTop: 16 }}>
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 8,
                background: "rgba(139, 92, 246, 0.08)",
                border: "1px solid rgba(139, 92, 246, 0.25)",
              }}
            >
              <Flex
                align="center"
                gap={8}
                style={{ color: "#8B5CF6", fontWeight: 700, marginBottom: 8 }}
              >
                <MaterialIcon name="check_circle" size={16} />
                <span>网关已成功加入 Tailnet 专网</span>
              </Flex>
              <Space direction="vertical" size={6} style={{ width: "100%", fontSize: 13 }}>
                <Flex justify="space-between">
                  <Text type="secondary">专网分配 IP:</Text>
                  <Text code copyable>{tailscaleStatusQuery.data?.ip || "100.x.x.x"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">MagicDNS 域名:</Text>
                  <Text code copyable>
                    {tailscaleStatusQuery.data?.magicDns ||
                      `${tailscaleStatusQuery.data?.hostname || "omniroute"}.ts.net`}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">接入模式:</Text>
                  <Tag color="purple">纯用户态 (Tsnet 免特权运行)</Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">完整接入基址:</Text>
                  <Text strong style={{ fontFamily: "monospace", color: "#8B5CF6" }}>
                    {effectiveTailscaleUrl}
                  </Text>
                </Flex>
              </Space>
            </div>

            <Flex justify="flex-end" gap={8}>
              <Button onClick={() => setTailscaleModalOpen(false)}>关闭</Button>
              <Popconfirm
                title="确认断开 Tailscale 专网？"
                description="断开后将无法再通过 Tailscale 专网地址访问此网关。"
                onConfirm={() => disconnectTailscale.mutate()}
                okText="断开"
                cancelText="取消"
              >
                <Button danger loading={disconnectTailscale.isPending}>
                  断开专网连接
                </Button>
              </Popconfirm>
            </Flex>
          </Flex>
        ) : (
          <Flex vertical gap={14} style={{ marginTop: 16 }}>
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 8,
                background: "rgba(255,255,255,0.03)",
                border: "1px solid var(--ant-color-border-secondary)",
                fontSize: 12,
                lineHeight: 1.6,
              }}
            >
              💡 <b>免特权一键直连</b>：通过提供 Tailscale Auth Key，网关将在内存中直接启动纯用户态节点加入您的 Tailnet，<b>无需在 NAS 宿主机上安装任何驱动、无需 root 特权，也无需单独维护容器</b>。
            </div>

            <Flex vertical gap={6}>
              <Flex justify="space-between" align="center">
                <Text strong style={{ fontSize: 13 }}>
                  Tailscale Auth Key *
                </Text>
                <a
                  href="https://login.tailscale.com/admin/settings/keys"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 12 }}
                >
                  获取 Auth Key ↗
                </a>
              </Flex>
              <Input.Password
                placeholder="tskey-auth-kXXXXX-XXXXXXXXXXXX"
                value={tailscaleAuthKey}
                onChange={(e) => setTailscaleAuthKey(e.target.value)}
              />
              <Text type="secondary" style={{ fontSize: 11 }}>
                请在 Tailscale 控制台 Settings → Keys 中生成一个 Reusable（可复用）或 Pre-authorized 密钥。
              </Text>
            </Flex>

            <Flex vertical gap={6}>
              <Text strong style={{ fontSize: 13 }}>
                自定义节点主机名 (Hostname)
              </Text>
              <Input
                placeholder="omniroute-gateway"
                value={tailscaleHostname}
                onChange={(e) => setTailscaleHostname(e.target.value)}
              />
            </Flex>

            <Flex justify="space-between" align="center" style={{ paddingTop: 4 }}>
              <div>
                <Text strong style={{ fontSize: 13 }}>
                  临时节点 (Ephemeral)
                </Text>
                <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                  网关容器离线或重启时自动从 Tailnet 中注销该节点
                </div>
              </div>
              <Switch checked={tailscaleEphemeral} onChange={setTailscaleEphemeral} />
            </Flex>

            <Flex justify="flex-end" gap={8} style={{ marginTop: 8 }}>
              <Button onClick={() => setTailscaleModalOpen(false)}>取消</Button>
              <Button
                type="primary"
                loading={connectTailscale.isPending}
                disabled={!tailscaleAuthKey.trim()}
                onClick={() =>
                  connectTailscale.mutate({
                    authKey: tailscaleAuthKey.trim(),
                    hostname: tailscaleHostname.trim() || "omniroute-gateway",
                    ephemeral: tailscaleEphemeral,
                  })
                }
              >
                立即接入 Tailscale
              </Button>
            </Flex>
          </Flex>
        )}
      </Modal>

      {/* Main Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        type="card"
        items={[
          {
            key: "apis",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="api" size={16} />
                <span>{tt("OpenAI 兼容 API", "OpenAI Compatible API")}</span>
              </Flex>
            ),
            children: <OpenAiApiTab baseUrl={effectiveBaseUrl} />,
          },
          {
            key: "mcp",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="extension" size={16} />
                <span>MCP</span>
              </Flex>
            ),
            children: <McpDashboard />,
          },
          {
            key: "a2a",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="hub" size={16} />
                <span>A2A</span>
              </Flex>
            ),
            children: <A2aDashboard />,
          },
          {
            key: "context-sources",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="database" size={16} />
                <span>{tt("上下文源", "Context Sources")}</span>
              </Flex>
            ),
            children: <ContextSources />,
          },
        ]}
      />
    </Flex>
  );
}
