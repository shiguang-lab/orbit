import { useState, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Modal,
  Row,
  Space,
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

const { Text, Title, Paragraph } = Typography;

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

function extractTunnelUrl(tunnel?: { running?: boolean; publicUrl?: string | null; apiUrl?: string | null; [key: string]: unknown } | null): string | null {
  if (!tunnel || !tunnel.running) return null;
  const raw = tunnel.publicUrl || tunnel.apiUrl || (tunnel["tunnelUrl"] as string | undefined);
  if (typeof raw === "string" && raw.trim()) {
    const trimmed = raw.trim().replace(/\/$/, "");
    return trimmed.endsWith("/v1") ? trimmed : `${trimmed}/v1`;
  }
  return null;
}

export default function EndpointsPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("apis");
  const [customPublicUrl, setCustomPublicUrl] = useState<string>("");
  const [customUrlModalOpen, setCustomUrlModalOpen] = useState(false);

  const [ngrokToken, setNgrokToken] = useState("");
  const [ngrokModalOpen, setNgrokModalOpen] = useState(false);

  // Network info query
  const networkQuery = useQuery({
    queryKey: ["network-info"],
    queryFn: endpointsApi.networkInfo,
    staleTime: 30_000,
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
      message.success("Cloudflared 状态已更新");
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : "操作 Cloudflared 失败"),
  });

  const toggleTailscale = useMutation({
    mutationFn: () =>
      tailscaleQuery.data?.running
        ? endpointsApi.stopTailscaleTunnel()
        : endpointsApi.startTailscaleTunnel(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tunnel-tailscale"] });
      message.success("Tailscale Funnel 状态已更新");
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : "操作 Tailscale 失败"),
  });

  const startNgrok = useMutation({
    mutationFn: (token: string) => endpointsApi.startNgrokTunnel(token),
    onSuccess: () => {
      setNgrokModalOpen(false);
      void queryClient.invalidateQueries({ queryKey: ["tunnel-ngrok"] });
      message.success("Ngrok 隧道已启动");
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : "启动 Ngrok 失败"),
  });

  const stopNgrok = useMutation({
    mutationFn: () => endpointsApi.stopNgrokTunnel(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["tunnel-ngrok"] });
      message.success("Ngrok 隧道已停止");
    },
    onError: (err: unknown) =>
      message.error(err instanceof Error ? err.message : "停止 Ngrok 失败"),
  });

  const localBaseUrl = networkQuery.data?.localUrl || "http://localhost:20128/v1";
  const lanUrls = networkQuery.data?.lanUrls || [];
  const tailscaleUrl = networkQuery.data?.tailscaleUrl;

  // Active public URL calculation
  const publicBaseUrl = useMemo(() => {
    if (customPublicUrl.trim()) {
      const url = customPublicUrl.trim().replace(/\/$/, "");
      return url.endsWith("/v1") ? url : `${url}/v1`;
    }
    const cfUrl = extractTunnelUrl(cloudflaredQuery.data);
    if (cfUrl) return cfUrl;
    const tsUrl = extractTunnelUrl(tailscaleQuery.data);
    if (tsUrl) return tsUrl;
    const ngrokUrl = extractTunnelUrl(ngrokQuery.data);
    if (ngrokUrl) return ngrokUrl;
    if (
      typeof window !== "undefined" &&
      window.location.hostname !== "localhost" &&
      window.location.hostname !== "127.0.0.1"
    ) {
      return `${window.location.origin}/v1`;
    }
    return null;
  }, [customPublicUrl, cloudflaredQuery.data, tailscaleQuery.data, ngrokQuery.data]);

  const effectiveBaseUrl = publicBaseUrl || localBaseUrl;

  const copyToClipboard = (text: string, tip = "已复制到剪贴板") => {
    navigator.clipboard.writeText(text);
    message.success(tip);
  };

  return (
    <Flex vertical gap={16}>
      {/* Top Header */}
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 20 }}>
            端点与连接网关
          </Title>
          <Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
            查看服务基准地址、配置公网安全穿透隧道及探索全量 OpenAI / MCP / A2A 协议 API 端点
          </Paragraph>
        </div>

        <Button
          icon={<MaterialIcon name="refresh" size={14} />}
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: ["network-info"] });
            void queryClient.invalidateQueries({ queryKey: ["tunnel-cloudflared"] });
            void queryClient.invalidateQueries({ queryKey: ["tunnel-tailscale"] });
            void queryClient.invalidateQueries({ queryKey: ["tunnel-ngrok"] });
            message.success("端点连接状态已刷新");
          }}
        >
          刷新网关状态
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
                    公网访问基址
                  </Text>
                </Flex>
                <Tag
                  color={publicBaseUrl ? "success" : "default"}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {publicBaseUrl ? "在线 (HTTPS)" : "未开启"}
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
                      onClick={() => copyToClipboard(publicBaseUrl, "已复制公网端点基址")}
                    />
                  </>
                ) : (
                  <>
                    <Text type="secondary" ellipsis style={{ fontSize: 11 }}>
                      尚未开启公网隧道
                    </Text>
                    <Button
                      type="link"
                      size="small"
                      loading={toggleCloudflared.isPending}
                      onClick={() => toggleCloudflared.mutate()}
                      style={{ padding: 0, height: "auto", fontSize: 11 }}
                    >
                      开启隧道
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
                    本地访问基址
                  </Text>
                </Flex>
                <Tag color="success" style={{ margin: 0, fontSize: 10 }}>
                  在线
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
                  onClick={() => copyToClipboard(localBaseUrl, "已复制本地基址")}
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
                    局域网内网基址
                  </Text>
                </Flex>
                <Tag
                  color={lanUrls.length > 0 ? "blue" : "default"}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {lanUrls.length > 0 ? `${lanUrls.length} 个地址` : "未分配"}
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
                    copyToClipboard(lanUrls[0] || "http://192.168.x.x:20128/v1", "已复制局域网基址")
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
                  color={tailscaleUrl ? "purple" : "default"}
                  style={{ margin: 0, fontSize: 10 }}
                >
                  {tailscaleUrl ? "已连接" : "未启动"}
                </Tag>
              </Flex>
              <div className={styles.urlCodeBox}>
                <Text ellipsis code strong style={{ fontSize: 12 }}>
                  {tailscaleUrl || "http://100.x.x.x:20128/v1"}
                </Text>
                <Button
                  type="text"
                  size="small"
                  icon={<MaterialIcon name="content_copy" size={14} />}
                  onClick={() =>
                    copyToClipboard(tailscaleUrl || "http://100.x.x.x:20128/v1", "已复制专网基址")
                  }
                />
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
                onClick={() => setCustomUrlModalOpen(true)}
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
          setCustomUrlModalOpen(false);
          if (customPublicUrl.trim()) {
            message.success("已设置自定义公开域名");
          }
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
            value={customPublicUrl}
            onChange={(e) => setCustomPublicUrl(e.target.value)}
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
                <span>OpenAI 兼容 API</span>
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
                <span>上下文源</span>
              </Flex>
            ),
            children: <ContextSources />,
          },
        ]}
      />
    </Flex>
  );
}
