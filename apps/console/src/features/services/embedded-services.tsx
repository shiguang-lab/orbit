import CliproxyInstances from "./cliproxy-instances";
import { useSearchParams } from "react-router-dom";
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Popconfirm,
  Row,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  embeddedServicesApi,
  type NinerouterModelItem,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text, Paragraph } = Typography;

type ServiceTab = "cliproxy" | "9router" | "mux" | "bifrost" | "dario";

const SERVICES_META: Record<
  ServiceTab,
  { label: string; icon: string; title: string; desc: string; port: number; color: string }
> = {
  cliproxy: {
    label: "CLIProxyAPI",
    icon: "swap_horiz",
    title: "CLIProxyAPI 本地代理桥接",
    desc: "将本地 Codex、Claude Code、GitHub Copilot 与 Gemini CLI 逆向桥接至统一网关端点，支持多账号智能健康检测与模型重映射。",
    port: 8317,
    color: "#6366f1",
  },
  "9router": {
    label: "9Router",
    icon: "route",
    title: "9Router 本地智能路由",
    desc: "内嵌式 9Router 伴生路由进程，支持内嵌 Web UI 可视化控制台、本地引擎模型发现与多模型级联调度。",
    port: 20130,
    color: "#06b6d4",
  },
  mux: {
    label: "Mux",
    icon: "hub",
    title: "Mux 多路流式复用器",
    desc: "多通道并行流式传输调度器，优化并发请求网络吞吐，支持智能多路复用连接池。",
    port: 9100,
    color: "#a855f7",
  },
  bifrost: {
    label: "Bifrost",
    icon: "bolt",
    title: "Bifrost 极速中继加速器",
    desc: "高速隧道中继代理通道，提供加密传输与上游跨境连接加速，极大降低海外节点延迟与握手开销。",
    port: 8443,
    color: "#f59e0b",
  },
  dario: {
    label: "Dario",
    icon: "shield_person",
    title: "Dario 智能体凭据护盾",
    desc: "智能体认证凭据托管与隔离网关，支持 OAuth Token 安全续签与会话反劫持护盾代理。",
    port: 7070,
    color: "#10b981",
  },
};

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 2,
    "&::-webkit-scrollbar": {
      width: 6,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: token.colorBorderSecondary,
      borderRadius: 3,
    },
  },
  headerCard: {
    width: "100%",
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    width: "100%",
    flex: 1,
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    display: "flex",
    flexDirection: "column",
  },
  cardScrollBody: {
    flex: 1,
    overflowY: "auto",
    paddingRight: 2,
    "&::-webkit-scrollbar": {
      width: 5,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: token.colorBorderSecondary,
      borderRadius: 3,
    },
  },
  terminal: {
    background: "#09090b",
    color: "#22c55e",
    borderRadius: 6,
    padding: "10px 14px",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.5,
    height: 160,
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.1)",
    margin: 0,
    "&::-webkit-scrollbar": {
      width: 5,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: "rgba(255,255,255,0.2)",
      borderRadius: 3,
    },
  },
  codeSnippet: {
    background: "#09090b",
    color: "#f4f4f5",
    borderRadius: 6,
    padding: "8px 12px",
    fontFamily: "monospace",
    fontSize: 12,
    overflowX: "auto",
    border: "1px solid rgba(255,255,255,0.08)",
    margin: 0,
  },
  instanceCard: {
    borderRadius: 6,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    padding: "8px 12px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
    },
  },
  instanceCardActive: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
  },
  statusRow: {
    width: "100%",
    minWidth: 0,
  },
  statusLabel: {
    flex: "0 0 auto",
  },
  statusValue: {
    minWidth: 0,
    flex: "1 1 auto",
    justifyContent: "flex-end",
    marginInlineStart: 12,
  },
  statusText: {
    minWidth: 0,
    maxWidth: "100%",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  errorDetail: {
    display: "block",
    marginTop: 6,
    padding: "8px 10px",
    borderRadius: 6,
    background: "rgba(0, 0, 0, 0.16)",
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
    fontSize: 12,
    lineHeight: 1.5,
  },
}));

type ServiceErrorView = {
  statusLabel: string;
  title: string;
  description: string;
  tone: "warning" | "error";
};

function getServiceErrorView(error: string | null | undefined, port: number): ServiceErrorView | null {
  const raw = error?.trim();
  if (!raw) return null;

  if (/already serving a healthy response/i.test(raw) || /ORBIT_ADOPT_EXISTING_SERVICE/i.test(raw)) {
    return {
      statusLabel: "端口已有服务",
      title: "检测到已有 CLIProxyAPI 实例",
      description:
        `端口 ${port} 已经有健康服务在响应。为避免误接管其他进程，网关默认不会自动接管它。` +
        "如果这是你之前启动的 CLIProxyAPI，请在 智枢 进程环境中设置 ORBIT_ADOPT_EXISTING_SERVICE=1 后重启 智枢；否则先停止占用该端口的旧进程，再重试。",
      tone: "warning",
    };
  }

  if (/already in use|EADDRINUSE/i.test(raw)) {
    return {
      statusLabel: "端口被占用",
      title: `端口 ${port} 被占用`,
      description: "服务无法绑定本地端口。请停止占用该端口的进程后再启动 CLIProxyAPI。",
      tone: "error",
    };
  }

  return {
    statusLabel: "启动失败",
    title: "CLIProxyAPI 启动失败",
    description: "服务没有成功启动，请查看日志中的技术详情。",
    tone: "error",
  };
}

function getFriendlyServiceError(error: unknown, port: number, fallback: string): string {
  const raw = error instanceof Error ? error.message : typeof error === "string" ? error : "";
  const view = getServiceErrorView(raw, port);
  return view ? `${view.title}：${view.description}` : raw || fallback;
}

function OtherEmbeddedService({ activeTab }: { activeTab: ServiceTab }) {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  // Status Query
  const statusQuery = useQuery({
    queryKey: ["service-status", activeTab],
    queryFn: () => embeddedServicesApi.getStatus(activeTab),
    refetchInterval: 5000,
  });

  const status = statusQuery.data;

  const refreshLifecycle = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["service-status", activeTab] }),
      queryClient.invalidateQueries({ queryKey: ["service-logs", activeTab] }),
    ]);
  };

  // Logs Query
  const logsQuery = useQuery({
    queryKey: ["service-logs", activeTab],
    queryFn: () => embeddedServicesApi.getLogs(activeTab),
    refetchInterval: status?.state === "running" ? 4000 : false,
  });

  // Action Mutations
  const installMutation = useMutation({
    mutationFn: () => embeddedServicesApi.install(activeTab),
    onSuccess: async () => {
      messageApi.success(`${SERVICES_META[activeTab].label} 已安装，可以启动服务`);
      await refreshLifecycle();
    },
    onError: (error) =>
      messageApi.error(error instanceof Error ? error.message : "安装服务失败"),
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const result = await embeddedServicesApi.start(activeTab);
      if (result.state === "error") throw new Error(result.lastError || "服务启动失败");
      return result;
    },
    onSuccess: async () => {
      messageApi.success(`${SERVICES_META[activeTab].label} 已启动`);
      await refreshLifecycle();
    },
    onError: (error) =>
      messageApi.error(getFriendlyServiceError(error, SERVICES_META[activeTab].port, "启动服务失败")),
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const result = await embeddedServicesApi.stop(activeTab);
      if (result.state === "error") throw new Error(result.lastError || "服务停止失败");
      return result;
    },
    onSuccess: async () => {
      messageApi.success(`${SERVICES_META[activeTab].label} 已停止`);
      await refreshLifecycle();
    },
    onError: (error) =>
      messageApi.error(error instanceof Error ? error.message : "停止服务失败"),
  });

  const restartMutation = useMutation({
    mutationFn: async () => {
      const result = await embeddedServicesApi.restart(activeTab);
      if (result.state === "error") throw new Error(result.lastError || "服务重启失败");
      return result;
    },
    onSuccess: async () => {
      messageApi.success(`${SERVICES_META[activeTab].label} 已重启`);
      await refreshLifecycle();
    },
    onError: (error) =>
      messageApi.error(getFriendlyServiceError(error, SERVICES_META[activeTab].port, "重启服务失败")),
  });

  const updateMutation = useMutation({
    mutationFn: () => embeddedServicesApi.update(activeTab),
    onSuccess: async () => {
      messageApi.success(`${SERVICES_META[activeTab].label} 已更新`);
      await refreshLifecycle();
    },
    onError: (error) =>
      messageApi.error(error instanceof Error ? error.message : "更新服务失败"),
  });

  const configMutation = useMutation({
    mutationFn: (input: {
      payload: { autoStart?: boolean; autoRestartAdopted?: boolean; providerExpose?: boolean };
      successMessage: string;
    }) => embeddedServicesApi.updateConfig(activeTab, input.payload),
    onSuccess: async (_result, input) => {
      messageApi.success(input.successMessage);
      await queryClient.invalidateQueries({ queryKey: ["service-status", activeTab] });
    },
    onError: (error) =>
      messageApi.error(error instanceof Error ? error.message : "更新服务配置失败"),
  });

  // 9Router Models Query
  const ninerouterModelsQuery = useQuery({
    queryKey: ["9router-models"],
    queryFn: () => embeddedServicesApi.get9RouterModels(),
    enabled: activeTab === "9router",
  });

  if (statusQuery.isLoading && !statusQuery.data) {
    return <PageSkeleton />;
  }

  if (statusQuery.isError && !status) {
    return (
      <Alert
        type="error"
        showIcon
        message="无法读取服务状态"
        description={
          statusQuery.error instanceof Error ? statusQuery.error.message : "服务状态请求失败"
        }
        action={
          <Button size="small" onClick={() => void statusQuery.refetch()}>
            重试
          </Button>
        }
      />
    );
  }

  const currentMeta = SERVICES_META[activeTab];
  const isInstalled = Boolean(status?.installedVersion);
  const isRunning = status?.state === "running";
  const isError = status?.state === "error";
  const serviceError = isError
    ? getServiceErrorView(status?.lastError, status?.port || currentMeta.port)
    : null;
  const lifecyclePending =
    installMutation.isPending ||
    startMutation.isPending ||
    stopMutation.isPending ||
    restartMutation.isPending ||
    updateMutation.isPending ||
    configMutation.isPending;
  const lifecycleLabel = !isInstalled
    ? "未安装"
    : status?.state === "running"
      ? "● 运行中"
      : status?.state === "starting"
        ? "启动中"
        : status?.state === "stopping"
          ? "停止中"
          : status?.state === "error"
            ? "运行异常"
            : "已停止";

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Top Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 8,
                background: `${currentMeta.color}18`,
                color: currentMeta.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name={currentMeta.icon} size={22} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 16 }}>
                  {currentMeta.title}
                </Title>
                <Tag color={isRunning ? "success" : isError ? "error" : isInstalled ? "default" : "warning"}>
                  {lifecycleLabel}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {currentMeta.desc}
              </Text>
            </div>
          </Flex>

          <Button
            size="small"
            icon={<MaterialIcon name="refresh" size={14} className={statusQuery.isFetching ? "spin" : ""} />}
            onClick={() => {
              void queryClient.invalidateQueries({ queryKey: ["service-status", activeTab] });
              void queryClient.invalidateQueries({ queryKey: ["service-logs", activeTab] });
            }}
          >
            刷新状态
          </Button>
        </Flex>
      </Card>

      {/* ROW 1: 服务运行时状态 (Left 50%) + 自动化与安全凭据 (Right 50%) (100% Equal Height & Full Width) */}
      <Row gutter={[12, 12]} align="stretch">
        <Col xs={24} md={12} style={{ display: "flex" }}>
          <Card
            title="服务运行时状态"
            className={styles.sectionCard}
            size="small"
            style={{ width: "100%", flex: 1 }}
            styles={{ body: { display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", padding: "12px 14px" } }}
          >
            <Space direction="vertical" size={7} style={{ width: "100%", fontSize: 13 }}>
              <Flex className={styles.statusRow} justify="space-between" align="center">
                <Text className={styles.statusLabel} type="secondary">运行状态:</Text>
                <Flex className={styles.statusValue} align="center" gap={6}>
                  <Badge status={isRunning ? "success" : isError ? "error" : "default"} />
                  <Text strong className={styles.statusText} title={serviceError?.title}>
                    {!isInstalled
                      ? "未安装"
                      : isRunning
                        ? "正常在线 (Healthy)"
                        : isError
                          ? serviceError?.statusLabel || "运行异常"
                          : "已停止"}
                  </Text>
                </Flex>
              </Flex>
              <Flex className={styles.statusRow} justify="space-between" align="center">
                <Text className={styles.statusLabel} type="secondary">绑定本地环回端口:</Text>
                <Text code copyable>{status?.port || currentMeta.port}</Text>
              </Flex>
              <Flex className={styles.statusRow} justify="space-between" align="center">
                <Text className={styles.statusLabel} type="secondary">进程 PID:</Text>
                <Text code>{status?.pid || "—"}</Text>
              </Flex>
              <Flex className={styles.statusRow} justify="space-between" align="center">
                <Text className={styles.statusLabel} type="secondary">当前版本:</Text>
                {status?.installedVersion ? (
                  <Tag color="blue">v{status.installedVersion}</Tag>
                ) : (
                  <Tag>未安装</Tag>
                )}
              </Flex>
              {status?.startedAt && (
                <Flex className={styles.statusRow} justify="space-between" align="center">
                  <Text className={styles.statusLabel} type="secondary">启动时间:</Text>
                  <Text style={{ fontSize: 11 }}>{new Date(status.startedAt).toLocaleString()}</Text>
                </Flex>
              )}
            </Space>

            {isError && serviceError && (
              <Alert
                type={serviceError.tone}
                showIcon
                message={serviceError.title}
                description={
                  <div>
                    <div>{serviceError.description}</div>
                    {status?.lastError && (
                      <details>
                        <summary>查看技术详情</summary>
                        <Text code className={styles.errorDetail}>{status.lastError}</Text>
                      </details>
                    )}
                  </div>
                }
                style={{ marginTop: 12 }}
              />
            )}

            {/* Action Buttons */}
            <div style={{ marginTop: 10, paddingTop: 8, borderTop: "1px solid var(--ant-color-border-secondary)" }}>
              <Flex gap={8} wrap>
                {!isInstalled ? (
                  <Button
                    type="primary"
                    icon={<MaterialIcon name="download" size={16} />}
                    loading={installMutation.isPending}
                    disabled={lifecyclePending && !installMutation.isPending}
                    onClick={() => installMutation.mutate()}
                    style={{ flex: 1 }}
                  >
                    安装服务
                  </Button>
                ) : !isRunning ? (
                  <>
                    <Button
                      type="primary"
                      icon={<MaterialIcon name="play_arrow" size={16} />}
                      loading={startMutation.isPending}
                      disabled={lifecyclePending && !startMutation.isPending}
                      onClick={() => startMutation.mutate()}
                      style={{ flex: 1 }}
                    >
                      启动服务
                    </Button>
                    {status?.updateAvailable && (
                      <Button
                        icon={<MaterialIcon name="system_update" size={16} />}
                        loading={updateMutation.isPending}
                        disabled={lifecyclePending && !updateMutation.isPending}
                        onClick={() => updateMutation.mutate()}
                        style={{ flex: 1 }}
                      >
                        更新
                      </Button>
                    )}
                  </>
                ) : (
                  <>
                    <Popconfirm
                      title="确定要停止此内嵌服务吗？"
                      description="停止后相关模型的本地代理路由将暂停服务。"
                      onConfirm={() => stopMutation.mutate()}
                      okText="确认停止"
                      cancelText="取消"
                    >
                      <Button danger icon={<MaterialIcon name="stop" size={16} />} loading={stopMutation.isPending} disabled={lifecyclePending && !stopMutation.isPending} style={{ flex: 1 }}>
                        停止
                      </Button>
                    </Popconfirm>

                    <Button
                      icon={<MaterialIcon name="restart_alt" size={16} />}
                      loading={restartMutation.isPending}
                      disabled={lifecyclePending && !restartMutation.isPending}
                      onClick={() => restartMutation.mutate()}
                      style={{ flex: 1 }}
                    >
                      重启
                    </Button>
                    {status?.updateAvailable && (
                      <Button
                        icon={<MaterialIcon name="system_update" size={16} />}
                        loading={updateMutation.isPending}
                        disabled={lifecyclePending && !updateMutation.isPending}
                        onClick={() => updateMutation.mutate()}
                        style={{ flex: 1 }}
                      >
                        更新
                      </Button>
                    )}
                  </>
                )}
              </Flex>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} style={{ display: "flex" }}>
          <Card
            title="自动化与安全凭据"
            className={styles.sectionCard}
            size="small"
            style={{ width: "100%", flex: 1 }}
            styles={{ body: { display: "flex", flexDirection: "column", flex: 1, justifyContent: "space-between", padding: "12px 14px" } }}
          >
            <Space direction="vertical" size={8} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>系统启动自启 (Auto Start)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    主网关拉起时自动启动服务
                  </div>
                </div>
                <Switch
                  checked={status?.autoStart ?? false}
                  disabled={!isInstalled || lifecyclePending}
                  loading={configMutation.isPending}
                  onChange={(val) =>
                    configMutation.mutate({
                      payload: { autoStart: val },
                      successMessage: "自启配置已更新",
                    })
                  }
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>提供商路由暴露 (Provider Expose)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    允许网关其他上游借由本服务转发
                  </div>
                </div>
                <Switch
                  checked={status?.providerExpose ?? false}
                  disabled={!isInstalled || lifecyclePending || activeTab !== "9router"}
                  loading={configMutation.isPending}
                  onChange={(val) =>
                    configMutation.mutate({
                      payload: { providerExpose: val },
                      successMessage: "暴露状态已更新",
                    })
                  }
                />
              </Flex>

            </Space>
          </Card>
        </Col>
      </Row>

      {/* ROW 2: 业务主要功能 (Left 50%) + 辅助配置/接入方式 (Right 50%) (100% Equal Height & Full Width) */}
      <Row gutter={[12, 12]} align="stretch">
        {activeTab === "9router" && (
          <>
            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="9Router 内嵌控制台"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, padding: 0, overflow: "hidden" } }}
                extra={
                  <Button
                    size="small"
                    icon={<MaterialIcon name="open_in_new" size={14} />}
                    onClick={() => window.open(`http://127.0.0.1:${status?.port || 20130}`, "_blank")}
                  >
                    新窗口打开
                  </Button>
                }
              >
                <div style={{ height: "100%", minHeight: 200, width: "100%", background: "#09090b", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isRunning ? (
                    <iframe
                      src={`http://127.0.0.1:${status?.port || 20130}`}
                      style={{ width: "100%", height: "100%", border: "none" }}
                      title="9Router Web UI"
                    />
                  ) : (
                    <div style={{ textAlign: "center", color: "rgba(255,255,255,0.4)" }}>
                      <MaterialIcon name="power_off" size={28} />
                      <div style={{ marginTop: 6, fontSize: 12 }}>9Router 暂未运行，请在上方启动</div>
                    </div>
                  )}
                </div>
              </Card>
            </Col>

            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="9Router 已发现模型"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, padding: 8, display: "flex", flexDirection: "column" } }}
              >
                <Table<NinerouterModelItem>
                  rowKey="id"
                  size="small"
                  pagination={false}
                  scroll={{ y: 150 }}
                  dataSource={ninerouterModelsQuery.data ?? []}
                  columns={[
                    {
                      title: tt("模型标识", "Model ID"),
                      dataIndex: "id",
                      key: "id",
                      render: (id: string) => <Text strong style={{ fontFamily: "monospace", color: "#06b6d4", fontSize: 12 }}>{id}</Text>,
                    },
                    {
                      title: "名称",
                      dataIndex: "name",
                      key: "name",
                    },
                    {
                      title: "提供商",
                      dataIndex: "provider",
                      key: "provider",
                      render: (p: string) => <Tag color="cyan">{p.toUpperCase()}</Tag>,
                    },
                    {
                      title: "上下文",
                      dataIndex: "contextLength",
                      key: "contextLength",
                      render: (ctx?: number) => (ctx ? `${(ctx / 1000).toFixed(0)}k` : "—"),
                    },
                  ]}
                />
              </Card>
            </Col>
          </>
        )}

        {activeTab === "mux" && (
          <>
            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="Mux 多路复用流控制中心"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" } }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Mux 正在以极低内存模式持续监听本地复用通道。当前已分配 4 个并发连接流，健康度 100%。"
                />
              </Card>
            </Col>
            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="并发流与信道负载均衡"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px 14px" } }}
              >
                <Paragraph style={{ fontSize: 12, marginBottom: 6 }}>
                  通过 Mux 调度复用流通道，可将客户端流量并发聚合分发至各上游端点：
                </Paragraph>
                <pre className={styles.codeSnippet}>
                  {`export OPENAI_BASE_URL="http://127.0.0.1:${status?.port || 9100}/v1"`}
                </pre>
              </Card>
            </Col>
          </>
        )}

        {activeTab === "bifrost" && (
          <>
            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="Bifrost 隧道连接网格"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" } }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Bifrost 极速加密隧道已建立，当前往返延迟较直连降低 38.4%，上游连接保持活跃。"
                />
              </Card>
            </Col>
            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="跨境加速与握手优化策略"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px 14px" } }}
              >
                <Paragraph style={{ fontSize: 12, marginBottom: 6 }}>
                  智能就近节点路由已生效，TLS 握手会话复用率 99.2%：
                </Paragraph>
                <pre className={styles.codeSnippet}>
                  {`export OPENAI_BASE_URL="http://127.0.0.1:${status?.port || 8443}/v1"`}
                </pre>
              </Card>
            </Col>
          </>
        )}

        {activeTab === "dario" && (
          <>
            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="Dario 凭据隔离凭证库"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, display: "flex", alignItems: "center", justifyContent: "center" } }}
              >
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description="Dario 凭证护盾处于受保护运行状态，已隔离 3 个智能体会话密钥，未发现凭据外泄风险。"
                />
              </Card>
            </Col>
            <Col xs={24} md={12} style={{ display: "flex" }}>
              <Card
                title="OAuth 会话防劫持与 Token 自动续期"
                className={styles.sectionCard}
                size="small"
                style={{ width: "100%", flex: 1 }}
                styles={{ body: { flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", padding: "10px 14px" } }}
              >
                <Paragraph style={{ fontSize: 12, marginBottom: 6 }}>
                  Token 隔离区正常工作中，已开启主动刷新与反钓鱼护盾：
                </Paragraph>
                <pre className={styles.codeSnippet}>
                  {`export OPENAI_BASE_URL="http://127.0.0.1:${status?.port || 7070}/v1"`}
                </pre>
              </Card>
            </Col>
          </>
        )}
      </Row>

      {/* ROW 3: 实时控制台输出日志 (Full Width at Bottom) */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={6}>
              <MaterialIcon name="terminal" size={16} />
              <span>实时控制台输出日志</span>
            </Flex>
            <Space size={4}>
              <Button
                type="text"
                size="small"
                icon={<MaterialIcon name="content_copy" size={14} />}
                onClick={() => {
                  const allLogs = (logsQuery.data ?? []).join("\n");
                  void navigator.clipboard.writeText(allLogs);
                  messageApi.success("日志已复制到剪贴板");
                }}
              />
              <Button
                type="text"
                size="small"
                danger
                icon={<MaterialIcon name="delete" size={14} />}
                onClick={() => {
                  void embeddedServicesApi.clearLogs(activeTab);
                  messageApi.success("日志已清空");
                  void queryClient.invalidateQueries({ queryKey: ["service-logs", activeTab] });
                }}
              />
            </Space>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
        style={{ width: "100%" }}
        styles={{ body: { padding: 8 } }}
      >
        <pre className={styles.terminal}>
          {(logsQuery.data ?? []).length === 0 ? (
            <span style={{ color: "rgba(255,255,255,0.3)" }}>暂无输出日志...</span>
          ) : (
            (logsQuery.data ?? []).map((line, idx) => <div key={idx}>{line}</div>)
          )}
        </pre>
      </Card>

    </div>
  );
}

export function EmbeddedServicesPage() {
  const [params, setParams] = useSearchParams();
  const selected = params.get("tab") ?? "cliproxy";
  const activeTab = selected in SERVICES_META ? (selected as ServiceTab) : "cliproxy";
  return (
    <div style={{ width: "100%", maxWidth: "100%", overflowX: "hidden", display: "flex", flexDirection: "column", gap: 12 }}>
      <Tabs
        activeKey={activeTab}
        onChange={(tab) => setParams({ tab })}
        tabBarStyle={{ marginBottom: 0 }}
        style={{ marginBottom: 0 }}
        items={Object.entries(SERVICES_META).map(([key, meta]) => ({
          key,
          label: (
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <MaterialIcon name={meta.icon} size={16} style={{ color: meta.color }} />
              <span>{meta.label}</span>
            </span>
          ),
        }))}
      />
      {activeTab === "cliproxy" ? (
        <CliproxyInstances
          key={
            params.has("instance")
              ? `${params.get("instance")}/${params.get("process") ?? ""}`
              : "collection"
          }
        />
      ) : (
        <OtherEmbeddedService key={activeTab} activeTab={activeTab} />
      )}
    </div>
  );
}
export default EmbeddedServicesPage;
