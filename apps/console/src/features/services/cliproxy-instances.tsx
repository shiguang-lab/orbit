import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Drawer,
  Empty,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  Upload,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import {
  ApartmentOutlined,
  AppstoreOutlined,
  ArrowLeftOutlined,
  ArrowRightOutlined,
  BorderOutlined,
  CaretRightOutlined,
  CloudServerOutlined,
  CopyOutlined,
  DeleteOutlined,
  FileTextOutlined,
  InboxOutlined,
  KeyOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
  SyncOutlined,
  ThunderboltOutlined,
  UnorderedListOutlined,
  UploadOutlined,
} from "@ant-design/icons";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/zh-cn";
import { useSearchParams } from "react-router-dom";
import { api } from "@/entities/api";
import { useI18n } from "@/i18n";

dayjs.extend(relativeTime);

const useStyles = createStyles(({ token, css }) => ({
  toolbar: css`
    width: 100%;
    padding: 8px 12px;
    border-radius: 8px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
  `,
  instanceGrid: css`
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
    gap: 14px;
    width: 100%;
  `,
  instanceCard: css`
    border-radius: 10px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    flex-direction: column;
    overflow: hidden;
    cursor: pointer;

    &:hover {
      border-color: ${token.colorPrimaryBorder};
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.16);
    }
  `,
  cardHeader: css`
    padding: 12px 14px 10px;
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 10px;
  `,
  nodeIconBox: css`
    width: 36px;
    height: 36px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  `,
  cardBody: css`
    padding: 0 14px 12px;
    display: flex;
    flex-direction: column;
    gap: 8px;
    flex: 1;
  `,
  endpointBox: css`
    padding: 5px 8px;
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: monospace;
    font-size: 12px;
  `,
  metricsGrid: css`
    padding: 8px 10px;
    border-radius: 8px;
    background: rgba(255, 255, 255, 0.02);
    border: 1px solid rgba(255, 255, 255, 0.05);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 6px;
  `,
  metricCell: css`
    display: flex;
    flex-direction: column;
    gap: 2px;
    overflow: hidden;
  `,
  cardFooter: css`
    padding: 8px 14px;
    border-top: 1px solid ${token.colorBorderSecondary};
    background: rgba(255, 255, 255, 0.015);
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
  `,
  detailBar: css`
    width: 100%;
    padding: 10px 14px;
    border-radius: 8px;
    background: ${token.colorBgContainer};
    border: 1px solid ${token.colorBorderSecondary};
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 12px;
  `,
  statCard: css`
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 6px;
    transition: all 0.2s ease;
    &:hover {
      border-color: ${token.colorPrimaryBorder};
    }
  `,
  sectionCard: css`
    border-radius: 8px;
    border: 1px solid ${token.colorBorderSecondary};
    background: ${token.colorBgContainer};
  `,
  statusRow: css`
    width: 100%;
    min-width: 0;
  `,
  statusLabel: css`
    flex: 0 0 auto;
    color: ${token.colorTextSecondary};
  `,
  statusValue: css`
    min-width: 0;
    flex: 1 1 auto;
    justify-content: flex-end;
    margin-inline-start: 12px;
  `,
  statusText: css`
    min-width: 0;
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  `,
  codeSnippet: css`
    background: #09090b;
    color: #f4f4f5;
    border-radius: 6px;
    padding: 8px 12px;
    font-family: monospace;
    font-size: 12px;
    overflow-x: auto;
    border: 1px solid rgba(255, 255, 255, 0.08);
    margin: 0;
  `,
  terminal: css`
    background: #09090b;
    color: #22c55e;
    border-radius: 6px;
    padding: 10px 14px;
    font-family: monospace;
    font-size: 12px;
    line-height: 1.5;
    height: 160px;
    overflow-y: auto;
    border: 1px solid rgba(255, 255, 255, 0.1);
    margin: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    &::-webkit-scrollbar {
      width: 5px;
    }
    &::-webkit-scrollbar-thumb {
      background-color: rgba(255, 255, 255, 0.2);
      border-radius: 3px;
    }
  `,
}));

interface Instance {
  pid?: number;
  startedAt?: string;
  autoStart?: boolean;
  providerExpose?: boolean;
  id: string;
  name: string;
  port: number;
  version: string;
  state: string;
  desiredState: string;
  healthy: boolean;
  latencyMs: number;
  restartCount: number;
  lastError?: string;
  catalogError?: string;
  credentials?: {
    id: string;
    name: string;
    provider: string;
    routable: boolean;
    disabled: boolean;
    error?: string;
    models: string[];
  }[];
}
interface Job {
  id: string;
  instanceId: string;
  action: string;
  status: string;
  error?: string;
  createdAt: string;
}
interface NodeReport {
  metrics: {
    managerHeapBytes: number;
    diskAvailableBytes?: number;
    memoryTotalBytes?: number;
    memoryAvailableBytes?: number;
    load1?: number;
  };
  os: string;
  arch: string;
  managerVersion: string;
  uptimeSeconds: number;
  instances: Instance[];
  jobs: Job[];
  reportError?: string;
}
interface ServiceNode {
  scopePrefix?: string;
  scopeId?: string;
  id: string;
  name: string;
  endpoint: string;
  online: boolean;
  lastSeenAt: string | null;
  report: NodeReport | null;
}
const base = "/service-nodes";
const instancePath = (node: string, instance: string) =>
  `${base}/${encodeURIComponent(node)}/instances/${encodeURIComponent(instance)}`;

export default function CliproxyInstances() {
  const { tt, locale } = useI18n();
  const { message } = App.useApp();
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [view, setView] = useState<"list" | "cards">(() =>
    typeof localStorage !== "undefined" &&
    localStorage.getItem("cliproxy-instance-view") === "cards"
      ? "cards"
      : "list",
  );
  const [mountModalOpen, setMountModalOpen] = useState(false);
  const [mappingModalOpen, setMappingModalOpen] = useState(false);
  const [configOpen, setConfigOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [enrolling, setEnrolling] = useState(false);
  const [creating, setCreating] = useState<string>();
  const [operation, setOperation] = useState<{
    instance: Instance;
    action: string;
    nodeId: string;
    nodeName: string;
  }>();
  const [version, setVersion] = useState("latest");
  const [authProvider, setAuthProvider] = useState("codex");
  const [authFlow, setAuthFlow] = useState<{
    url: string;
    state: string;
    user_code?: string;
  }>();
  const [callbackURL, setCallbackURL] = useState("");
  const [credentialName, setCredentialName] = useState("");
  const [credentialJSON, setCredentialJSON] = useState("");
  const [detail, setDetail] = useState<{ title: string; text: string }>();
  const [nodeForm] = Form.useForm();
  const [instanceForm] = Form.useForm();
  const query = useQuery({
    queryKey: ["service-nodes"],
    queryFn: () => api<ServiceNode[]>(base),
    refetchInterval: 5000,
  });
  const nodes = query.data ?? [];
  const node = nodes.find((n) => n.id === params.get("instance"));
  const fallbackInstance: Instance = {
    id: node ? `${node.id}-default` : "default",
    name: node ? `${node.name}` : "CLIProxyAPI",
    port: 8317,
    version: "",
    state: node?.online ? "stopped" : "offline",
    desiredState: "stopped",
    healthy: false,
    latencyMs: 0,
    restartCount: 0,
    credentials: [],
  };
  const instance =
    node?.report?.instances.find((i) => i.id === params.get("process")) ??
    node?.report?.instances[0] ??
    (node ? fallbackInstance : undefined);
  const credentialTarget =
    node && instance ? { nodeId: node.id, instance } : undefined;
  const inDetail = params.has("instance");
  const openInstance = (item: ServiceNode) =>
    setParams({ tab: "cliproxy", instance: item.id });
  const rows = nodes.filter((item) =>
    `${item.name} ${item.endpoint} ${item.scopePrefix ?? ""}`
      .toLowerCase()
      .includes(search.toLowerCase()),
  );
  const onlineCount = nodes.filter((n) => n.online).length;
  const refresh = () =>
    client.invalidateQueries({ queryKey: ["service-nodes"] });
  const mutation = useMutation({
    mutationFn: async (run: () => Promise<unknown>) => run(),
    onSuccess: () => {
      void refresh();
    },
    onError: (error) => message.error(error.message),
  });

  const handleRefreshNode = async (nodeId: string) => {
    try {
      await api(`${base}/${encodeURIComponent(nodeId)}/refresh`, {
        method: "POST",
      });
      message.success(tt("已发送刷新探测请求", "Refresh request sent"));
      void refresh();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : tt("刷新失败", "Refresh failed"),
      );
    }
  };

  const handleDeleteNode = async (nodeId: string) => {
    try {
      await api(`${base}/${encodeURIComponent(nodeId)}`, { method: "DELETE" });
      message.success(tt("实例已成功移除", "Instance removed"));
      if (params.get("instance") === nodeId) {
        setParams({ tab: "cliproxy" });
      }
      void refresh();
    } catch (err) {
      message.error(
        err instanceof Error ? err.message : tt("移除失败", "Remove failed"),
      );
    }
  };

  const stateText = (state: string) =>
    ({
      not_installed: tt("未安装", "Not installed"),
      stopped: tt("已停止", "Stopped"),
      starting: tt("启动中", "Starting"),
      running: tt("运行中", "Running"),
      stopping: tt("停止中", "Stopping"),
      unhealthy: tt("不健康", "Unhealthy"),
      error: tt("异常", "Error"),
      succeeded: tt("成功", "Succeeded"),
      failed: tt("失败", "Failed"),
    })[state] ?? state;

  const getNodeMeta = (item: ServiceNode) => {
    const instances = item.report?.instances ?? [];
    const primaryInstance = instances[0];
    const totalCredentials = instances.reduce(
      (acc, inst) => acc + (inst.credentials?.length ?? 0),
      0,
    );
    const totalModels = new Set(
      instances.flatMap((i) =>
        (i.credentials ?? []).flatMap((c) => c.models ?? []),
      ),
    ).size;
    const versions = instances.map((i) => i.version).filter(Boolean);
    const versionStr =
      versions.length > 0
        ? versions.join(", ")
        : item.online
          ? (primaryInstance?.version ||
            (primaryInstance
              ? stateText(primaryInstance.state)
              : tt("未安装", "Not installed")))
          : "—";
    const latency = instances.find(
      (i) => typeof i.latencyMs === "number" && i.latencyMs > 0,
    )?.latencyMs;
    const port = instances[0]?.port;
    const lastSeenText = item.lastSeenAt
      ? dayjs(item.lastSeenAt).locale(locale === "zh-CN" ? "zh-cn" : "en").fromNow()
      : item.online
        ? tt("刚刚", "Just now")
        : tt("从未连通", "Never");
    return {
      instances,
      primaryInstance,
      totalCredentials,
      totalModels,
      versionStr,
      latency,
      port,
      lastSeenText,
    };
  };

  const manageCredential = async (
    method: string,
    path: string,
    payload?: unknown,
  ) => {
    if (!credentialTarget)
      throw new Error(tt("请选择实例", "Select an instance"));
    return api<{
      url?: string;
      state?: string;
      user_code?: string;
      status?: string;
    }>(
      `${instancePath(credentialTarget.nodeId, credentialTarget.instance.id)}/management`,
      { method: "POST", body: JSON.stringify({ method, path, payload }) },
    );
  };

  const credentials = useQuery({
    queryKey: [
      "node-credentials",
      credentialTarget?.nodeId,
      credentialTarget?.instance.id,
    ],
    enabled:
      !!credentialTarget &&
      !!node?.online &&
      !!instance?.healthy &&
      mountModalOpen,
    queryFn: () =>
      api<{
        files?: Array<{
          name: string;
          email?: string;
          provider?: string;
          disabled?: boolean;
          status?: string;
        }>;
      }>(
        `${instancePath(credentialTarget!.nodeId, credentialTarget!.instance.id)}/accounts`,
      ),
    refetchInterval: mountModalOpen ? 10000 : false,
  });

  const authStatus = useQuery({
    queryKey: [
      "node-oauth-status",
      credentialTarget?.nodeId,
      credentialTarget?.instance.id,
      authFlow?.state,
    ],
    enabled: !!credentialTarget && !!authFlow,
    queryFn: () =>
      manageCredential(
        "GET",
        `get-auth-status?state=${encodeURIComponent(authFlow!.state)}`,
      ),
    refetchInterval: (q) =>
      q.state.data?.status === "wait" || !q.state.data ? 2000 : false,
  });

  useEffect(() => {
    if (authStatus.data?.status === "ok") {
      void credentials.refetch();
      message.success(tt("账号授权成功！", "Account authorized successfully!"));
    }
  }, [authStatus.data?.status]);

  const settingsMutation = useMutation({
    mutationFn: async (settings: { autoStart?: boolean; providerExpose?: boolean }) => {
      await api(instancePath(node!.id, instance!.id), { method: "PATCH", body: JSON.stringify(settings) });
    },
    onSuccess: () => { void client.invalidateQueries({ queryKey: ["service-nodes"] }); message.success(tt("配置已保存", "Settings saved")); },
    onError: (error: Error) => message.error(error.message),
  });

  const logsQuery = useQuery({
    queryKey: ["managed-instance-logs", node?.id, instance?.id],
    queryFn: () =>
      api<{ text: string }>(`${instancePath(node!.id, instance!.id)}/logs`),
    enabled: Boolean(node?.online && instance?.id),
    refetchInterval: instance?.healthy ? 4000 : false,
  });

  const modelAliasesQuery = useQuery({
    queryKey: ["managed-instance-model-aliases", node?.id, instance?.id],
    queryFn: () => api<{ "oauth-model-alias": Record<string, ModelAlias[]> }>(
      `${instancePath(node!.id, instance!.id)}/management`,
      { method: "POST", body: JSON.stringify({ method: "GET", path: "oauth-model-alias" }) },
    ),
    enabled: Boolean(node?.online && instance?.healthy),
  });

  const mappingsList: [string, string][] = Object.values(
    modelAliasesQuery.data?.["oauth-model-alias"] ?? {},
  ).flatMap((list) =>
    Array.isArray(list)
      ? list.map((item) => [item.alias, item.name] as [string, string])
      : [],
  );

  const busy = mutation.isPending;
  const actionText = (action: string) =>
    ({
      install: tt("安装", "Install"),
      upgrade: tt("升级", "Upgrade"),
      start: tt("启动", "Start"),
      stop: tt("停止", "Stop"),
      restart: tt("重启", "Restart"),
    })[action] ?? action;
  const doAction = async (target = operation) => {
    if (!target) return;
    const targetNode = target.nodeId;
    const job = await api<Job>(
      `${instancePath(targetNode, target.instance.id)}/actions`,
      {
        method: "POST",
        body: JSON.stringify({ action: target.action, version }),
      },
    );
    setOperation(undefined);
    setHistoryOpen(true);
    message.success(
      tt(
        "操作已提交，可在操作记录中查看结果",
        "Operation submitted. Follow its result in operation history.",
      ),
    );
    await api(`${base}/${targetNode}/refresh`, { method: "POST" });
    return job;
  };
  const statusTag = (i: Instance, server: ServiceNode) => (
    <Tag
      color={
        !server.online
          ? "default"
          : i.healthy
            ? "success"
            : i.state === "error"
              ? "error"
              : i.state === "stopped"
                ? "warning"
                : "processing"
      }
      style={{ margin: 0 }}
    >
      <Badge
        status={
          !server.online
            ? "default"
            : i.healthy
              ? "success"
              : i.state === "error"
                ? "error"
                : i.state === "stopped"
                  ? "warning"
                  : "processing"
        }
        style={{ marginInlineEnd: 4 }}
      />
      {server.online ? stateText(i.state) : tt("实例尚未连接", "Instance is disconnected")}
    </Tag>
  );

  const renderCardStatus = (item: ServiceNode) => {
    const { primaryInstance, latency } = getNodeMeta(item);
    if (!item.online) {
      return (
        <Tag
          color="default"
          style={{
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Badge status="default" style={{ margin: 0 }} />
          <span>{tt("离线", "Offline")}</span>
        </Tag>
      );
    }
    if (!primaryInstance || !primaryInstance.version) {
      return (
        <Tag
          color="purple"
          style={{
            margin: 0,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <Badge status="processing" style={{ margin: 0 }} />
          <span>{tt("待安装", "Not installed")}</span>
        </Tag>
      );
    }
    if (primaryInstance.healthy) {
      return (
        <Space size={4}>
          <Tag
            color="success"
            style={{
              margin: 0,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Badge status="success" style={{ margin: 0 }} />
            <span>{stateText(primaryInstance.state)}</span>
          </Tag>
          {latency !== undefined && (
            <Tag
              color={
                latency < 100
                  ? "success"
                  : latency < 300
                    ? "warning"
                    : "error"
              }
              style={{ margin: 0, fontSize: 11 }}
            >
              {latency}ms
            </Tag>
          )}
        </Space>
      );
    }
    return (
      <Tag
        color="warning"
        style={{
          margin: 0,
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <Badge status="warning" style={{ margin: 0 }} />
        <span>{stateText(primaryInstance.state || "unhealthy")}</span>
      </Tag>
    );
  };
  return (
    <Space
      direction="vertical"
      size={20}
      style={{ width: "100%", maxWidth: "100%", overflowX: "hidden" }}
    >
      {query.error && (
        <Alert type="error" showIcon message={query.error.message} />
      )}
      {inDetail ? (
        <>
          {node && (
            <div className={styles.detailBar}>
              <Flex align="center" gap={12} wrap="wrap">
                <Button
                  icon={<ArrowLeftOutlined />}
                  onClick={() => {
                    setParams({ tab: "cliproxy" });
                    setAuthFlow(undefined);
                  }}
                >
                  {tt("返回", "Back")}
                </Button>
                <Divider type="vertical" style={{ height: 20 }} />
                <Space align="center" size={8} wrap>
                  <Typography.Text strong style={{ fontSize: 16 }}>
                    {node.name}
                  </Typography.Text>
                  {node.scopePrefix && (
                    <Tag
                      color="blue"
                      style={{ fontFamily: "monospace", margin: 0 }}
                    >
                      {node.scopePrefix}
                    </Tag>
                  )}
                  {instance && statusTag(instance, node)}
                </Space>
                <Typography.Text
                  copyable={{ text: node.endpoint }}
                  type="secondary"
                  style={{ fontFamily: "monospace", fontSize: 12 }}
                >
                  {node.endpoint}
                </Typography.Text>
              </Flex>
              <Space wrap align="center">
                {(node.report?.instances.length ?? 0) > 1 && (
                  <Select
                    aria-label={tt("CLIProxyAPI 进程", "CLIProxyAPI process")}
                    value={instance?.id}
                    onChange={(process) =>
                      setParams({ tab: "cliproxy", instance: node.id, process })
                    }
                    options={node.report?.instances.map((i) => ({
                      value: i.id,
                      label: i.name,
                    }))}
                  />
                )}
                {instance?.version && (
                  <Button disabled={!node.online || busy} onClick={() => {
                    setVersion("latest");
                    setOperation({ instance, action: "upgrade", nodeId: node.id, nodeName: node.name });
                  }}>{tt("升级", "Upgrade")}</Button>
                )}
                <Button disabled={!instance?.healthy || !node.online} onClick={() => setConfigOpen(true)}>
                  {tt("运行配置", "Runtime settings")}
                </Button>
                <Button onClick={() => setHistoryOpen(true)}>{tt("操作记录", "Operation history")}</Button>
                <Button
                  icon={<ReloadOutlined />}
                  loading={busy}
                  onClick={() => void handleRefreshNode(node.id)}
                >
                  {tt("刷新状态", "Refresh status")}
                </Button>
                <Popconfirm
                  title={tt(
                    "移除此实例连接？远端进程会继续运行。",
                    "Remove this instance connection? Remote processes will keep running.",
                  )}
                  onConfirm={() => void handleDeleteNode(node.id)}
                >
                  <Button danger icon={<DeleteOutlined />}>
                    {tt("移除实例", "Remove instance")}
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          )}
          {node && instance ? (
            <>
              <div style={{ display: "flex", flexDirection: "column", gap: 10, width: "100%" }}>
                        {/* ROW 1: 服务运行时状态 (Left 50%) + 自动化与安全凭据 (Right 50%) (100% Equal Height & Full Width) */}
                        <Row gutter={[10, 10]} align="stretch" style={{ width: "100%", margin: 0 }}>
                          <Col xs={24} md={12} style={{ display: "flex", padding: 5 }}>
                            <Card
                              title={tt("服务运行时状态", "Service Runtime Status")}
                              className={styles.sectionCard}
                              size="small"
                              style={{ width: "100%", flex: 1 }}
                              styles={{
                                body: {
                                  display: "flex",
                                  flexDirection: "column",
                                  flex: 1,
                                  justifyContent: "space-between",
                                  padding: "12px 14px",
                                },
                              }}
                            >
                              <Space direction="vertical" size={7} style={{ width: "100%", fontSize: 13 }}>
                                <Flex className={styles.statusRow} justify="space-between" align="center">
                                  <Typography.Text className={styles.statusLabel} type="secondary">
                                    {tt("运行状态:", "Runtime Status:")}
                                  </Typography.Text>
                                  <Flex className={styles.statusValue} align="center" gap={6}>
                                    <Badge
                                      status={
                                        !node.online
                                          ? "default"
                                          : instance.healthy
                                            ? "success"
                                            : instance.state === "error"
                                              ? "error"
                                              : "default"
                                      }
                                    />
                                    <Typography.Text strong className={styles.statusText}>
                                      {!node.online
                                        ? tt("离线 / 未连接", "Offline / Disconnected")
                                        : !instance.version
                                          ? tt("未安装", "Not installed")
                                          : instance.healthy
                                            ? tt("正常在线 (Healthy)", "Healthy (Online)")
                                            : instance.state === "stopped"
                                              ? tt("已停止", "Stopped")
                                              : stateText(instance.state)}
                                    </Typography.Text>
                                  </Flex>
                                </Flex>
                                <Flex className={styles.statusRow} justify="space-between" align="center">
                                  <Typography.Text className={styles.statusLabel} type="secondary">
                                    {tt("绑定本地环回端口:", "Loopback Port:")}
                                  </Typography.Text>
                                  <Typography.Text code copyable>{instance.port || 8317}</Typography.Text>
                                </Flex>
                                <Flex className={styles.statusRow} justify="space-between" align="center">
                                  <Typography.Text className={styles.statusLabel} type="secondary">
                                    {tt("进程 PID:", "Process PID:")}
                                  </Typography.Text>
                                  <Typography.Text code>{instance.pid || "—"}</Typography.Text>
                                </Flex>
                                <Flex className={styles.statusRow} justify="space-between" align="center">
                                  <Typography.Text className={styles.statusLabel} type="secondary">
                                    {tt("当前版本:", "Version:")}
                                  </Typography.Text>
                                  {instance.version ? (
                                    <Tag color="blue">v{instance.version.replace(/^v/, "")}</Tag>
                                  ) : (
                                    <Tag>{tt("未安装", "Not installed")}</Tag>
                                  )}
                                </Flex>
                                <Flex className={styles.statusRow} justify="space-between" align="center">
                                  <Typography.Text className={styles.statusLabel} type="secondary">
                                    {tt("启动时间:", "Started At:")}
                                  </Typography.Text>
                                  <Typography.Text style={{ fontSize: 11 }}>
                                    {instance.startedAt
                                      ? dayjs(instance.startedAt).format("YYYY/M/D HH:mm:ss")
                                      : "—"}
                                  </Typography.Text>
                                </Flex>
                              </Space>

                              {/* Action Buttons */}
                              <div
                                style={{
                                  marginTop: 10,
                                  paddingTop: 8,
                                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                                }}
                              >
                                <Flex gap={8} wrap>
                                  {!instance.version ? (
                                    <Button
                                      type="primary"
                                      loading={busy}
                                      disabled={!node.online}
                                      onClick={() => {
                                        setVersion("latest");
                                        setOperation({ instance, action: "install", nodeId: node.id, nodeName: node.name });
                                      }}
                                      style={{ flex: 1 }}
                                    >
                                      {tt("安装服务", "Install service")}
                                    </Button>
                                  ) : instance.desiredState === "running" ? (
                                    <>
                                      <Popconfirm
                                        title={tt("确定要停止此内嵌服务吗？", "Stop this service?")}
                                        description={tt("停止后相关模型的本地代理路由将暂停服务。", "Local proxy routes will be paused after stopping.")}
                                        onConfirm={() => {
                                          mutation.mutate(() => doAction({ instance, action: "stop", nodeId: node.id, nodeName: node.name }));
                                        }}
                                        okText={tt("确认停止", "Stop")}
                                        cancelText={tt("取消", "Cancel")}
                                      >
                                        <Button
                                          danger
                                          icon={<BorderOutlined />}
                                          loading={busy}
                                          disabled={!node.online}
                                          style={{ flex: 1 }}
                                        >
                                          {tt("停止", "Stop")}
                                        </Button>
                                      </Popconfirm>
                                      <Button
                                        icon={<ReloadOutlined />}
                                        loading={busy}
                                        disabled={!node.online}
                                        onClick={() => {
                                          setOperation({ instance, action: "restart", nodeId: node.id, nodeName: node.name });
                                        }}
                                        style={{ flex: 1 }}
                                      >
                                        {tt("重启", "Restart")}
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        type="primary"
                                        icon={<CaretRightOutlined />}
                                        loading={busy}
                                        disabled={!node.online}
                                        onClick={() => {
                                          setOperation({ instance, action: "start", nodeId: node.id, nodeName: node.name });
                                        }}
                                        style={{ flex: 1 }}
                                      >
                                        {tt("启动服务", "Start service")}
                                      </Button>
                                      <Button
                                        icon={<ReloadOutlined />}
                                        loading={busy}
                                        disabled={!node.online}
                                        onClick={() => {
                                          setOperation({ instance, action: "restart", nodeId: node.id, nodeName: node.name });
                                        }}
                                        style={{ flex: 1 }}
                                      >
                                        {tt("重启", "Restart")}
                                      </Button>
                                    </>
                                  )}
                                </Flex>
                              </div>
                            </Card>
                          </Col>

                          <Col xs={24} md={12} style={{ display: "flex", padding: 5 }}>
                            <Card
                              title={tt("自动化与安全凭据", "Automation & Security")}
                              className={styles.sectionCard}
                              size="small"
                              style={{ width: "100%", flex: 1 }}
                              styles={{
                                body: {
                                  display: "flex",
                                  flexDirection: "column",
                                  flex: 1,
                                  justifyContent: "space-between",
                                  padding: "12px 14px",
                                },
                              }}
                            >
                              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <Flex justify="space-between" align="center">
                                  <div>
                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                      {tt("实例服务启动时自动运行", "Auto Start")}
                                    </Typography.Text>
                                    <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                      {tt("cliproxy-manager 重启后自动恢复运行", "Resume the process when cliproxy-manager restarts")}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={instance.autoStart ?? true}
                                    disabled={!node.online || settingsMutation.isPending}
                                    onChange={(val) => {
                                      settingsMutation.mutate({ autoStart: val });
                                    }}
                                  />
                                </Flex>

                                <Flex justify="space-between" align="center">
                                  <div>
                                    <Typography.Text strong style={{ fontSize: 13 }}>
                                      {tt("参与模型路由", "Provider Expose")}
                                    </Typography.Text>
                                    <div style={{ fontSize: 11, color: token.colorTextSecondary }}>
                                      {tt("允许模型组合选择此实例的凭据", "Allow other gateway upstreams to forward via this service")}
                                    </div>
                                  </div>
                                  <Switch
                                    checked={instance.providerExpose ?? true}
                                    disabled={!node.online || settingsMutation.isPending}
                                    onChange={(val) => {
                                      settingsMutation.mutate({ providerExpose: val });
                                    }}
                                  />
                                </Flex>
                              </Space>
                            </Card>
                          </Col>
                        </Row>

                        {/* ROW 2: 已挂载 CLI 凭据与账号健康度 (Left 50%) + 智能模型映射 (Right 50%) */}
                        <Row gutter={[10, 10]} align="stretch" style={{ width: "100%", margin: 0 }}>
                          <Col xs={24} md={12} style={{ display: "flex", padding: 5 }}>
                            <Card
                              title={tt("已挂载 CLI 凭据与账号健康度", "Mounted CLI Credentials & Account Health")}
                              className={styles.sectionCard}
                              size="small"
                              style={{ width: "100%", flex: 1 }}
                              styles={{ body: { flex: 1, padding: 8, display: "flex", flexDirection: "column" } }}
                              extra={
                                <Button
                                  icon={<PlusOutlined />}
                                  onClick={() => setMountModalOpen(true)}
                                >
                                  {tt("挂载新凭据", "Mount Credential")}
                                </Button>
                              }
                            >
                              <Table
                                rowKey="id"
                                size="small"
                                pagination={false}
                                scroll={{ y: 150 }}
                                dataSource={instance.credentials ?? []}
                                columns={[
                                  {
                                    title: tt("账号 / 凭据来源", "Account / Source"),
                                    key: "name",
                                    render: (_, record) => (
                                      <div>
                                        <Typography.Text strong style={{ fontSize: 12 }}>{record.name}</Typography.Text>
                                        <div style={{ fontSize: 10, color: token.colorTextSecondary }}>ID: {record.id}</div>
                                      </div>
                                    ),
                                  },
                                  {
                                    title: tt("提供商", "Provider"),
                                    dataIndex: "provider",
                                    key: "provider",
                                    width: 90,
                                    render: (p: string) => <Tag color="blue">{(p || "codex").toUpperCase()}</Tag>,
                                  },
                                  {
                                    title: tt("状态", "Status"),
                                    key: "status",
                                    width: 80,
                                    render: (_, record) => (
                                      <Tag color={record.disabled ? "default" : record.routable ? "success" : "error"}>
                                        {record.disabled ? tt("已停用", "Disabled") : record.routable ? tt("在线", "Online") : tt("失效", "Offline")}
                                      </Tag>
                                    ),
                                  },
                                  {
                                    title: tt("模型", "Models"),
                                    key: "modelCount",
                                    width: 70,
                                    render: (_, record) => (
                                      <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 11 }}>
                                        {record.models.length}
                                      </span>
                                    ),
                                  },
                                  {
                                    title: tt("操作", "Actions"),
                                    key: "action",
                                    width: 65,
                                    render: () => (
                                      <Button
                                        onClick={() => void handleRefreshNode(node.id)}
                                      >
                                        {tt("刷新", "Refresh")}
                                      </Button>
                                    ),
                                  },
                                ]}
                              />
                            </Card>
                          </Col>

                          <Col xs={24} md={12} style={{ display: "flex", padding: 5 }}>
                            <Card
                              title={tt("智能模型映射", "Smart Model Mapping")}
                              className={styles.sectionCard}
                              size="small"
                              style={{ width: "100%", flex: 1 }}
                              styles={{ body: { flex: 1, display: "flex", flexDirection: "column", padding: "10px 14px" } }}
                              extra={
                                <Button
                                  type="primary"
                                  style={{ background: "#6366f1" }}
                                  onClick={() => setMappingModalOpen(true)}
                                >
                                  {tt("编辑映射规则", "Edit Mapping Rules")}
                                </Button>
                              }
                            >
                              <Typography.Paragraph type="secondary" style={{ fontSize: 11, margin: "0 0 6px 0" }}>
                                {tt("配置客户端请求模型到 CLI 上游真实模型的自动重写：", "Configure automatic rewriting of client request models to CLI upstream models:")}
                              </Typography.Paragraph>
                              {modelAliasesQuery.error && <Alert type="error" message={modelAliasesQuery.error.message} />}
                              <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1, maxHeight: 110, overflowY: "auto", paddingRight: 2 }}>
                                {mappingsList.length === 0 ? (
                                  <Empty
                                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                                    description={tt("暂无自定义模型映射", "No custom model mappings")}
                                    style={{ padding: "8px 0" }}
                                  />
                                ) : (
                                  mappingsList.map(([from, to]) => (
                                    <Flex
                                      key={from}
                                      justify="space-between"
                                      align="center"
                                      style={{
                                        padding: "4px 8px",
                                        background: "rgba(255,255,255,0.02)",
                                        borderRadius: 4,
                                        border: `1px solid ${token.colorBorderSecondary}`,
                                        fontSize: 12,
                                      }}
                                    >
                                      <Typography.Text strong style={{ fontFamily: "monospace", color: "#818cf8" }}>{from}</Typography.Text>
                                      <ArrowRightOutlined style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }} />
                                      <Typography.Text strong style={{ fontFamily: "monospace", color: "#34d399" }}>{to}</Typography.Text>
                                    </Flex>
                                  ))
                                )}
                              </div>
                              <div style={{ marginTop: 8, paddingTop: 6, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                                <Typography.Text type="secondary" style={{ fontSize: 11 }}>{tt("终端导出指引：", "Terminal Export Guide:")}</Typography.Text>
                                <pre className={styles.codeSnippet} style={{ marginTop: 4 }}>
                                  {`export OPENAI_BASE_URL="${typeof window === "undefined" ? "" : window.location.origin}/v1"
# model: ${node.scopePrefix}/<model>`}
                                </pre>
                              </div>
                            </Card>
                          </Col>
                        </Row>

                        {/* ROW 3: 实时控制台输出日志 (Full Width at Bottom) */}
                        <Card
                          title={
                            <Flex justify="space-between" align="center">
                              <Flex align="center" gap={6}>
                                <FileTextOutlined style={{ fontSize: 16 }} />
                                <span>{tt("实时控制台输出日志", "Real-time Console Output Logs")}</span>
                              </Flex>
                              <Space size={4}>
                                <Button
                                  type="text"
                                  icon={<CopyOutlined style={{ fontSize: 14 }} />}
                                  onClick={() => {
                                    const allLogs = logsQuery.data?.text ?? "";
                                    void navigator.clipboard.writeText(allLogs);
                                    message.success(tt("日志已复制到剪贴板", "Logs copied to clipboard"));
                                  }}
                                />
                                <Button
                                  type="text"
                                  aria-label={tt("刷新日志", "Refresh logs")}
                                  icon={<ReloadOutlined style={{ fontSize: 14 }} />}
                                  loading={logsQuery.isFetching}
                                  onClick={() => void logsQuery.refetch()}
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
                            {!logsQuery.data?.text ? (
                              <span style={{ color: "rgba(255,255,255,0.3)" }}>{tt("暂无输出日志...", "No console output logs...")}</span>
                            ) : (
                              logsQuery.data.text
                            )}
                          </pre>
                        </Card>
                      </div>

              {/* Modal for Mount Credential */}
              <Modal
                title={
                  <Space size={6}>
                    <PlusOutlined style={{ color: token.colorPrimary }} />
                    <span>{tt("挂载新凭据", "Mount Credential")}</span>
                  </Space>
                }
                open={mountModalOpen}
                onCancel={() => {
                  setMountModalOpen(false);
                  setAuthFlow(undefined);
                }}
                footer={null}
                destroyOnClose
                width={680}
              >
                <div style={{ marginTop: 16 }}>
                  {!node.online || !instance.healthy ? (
                    <Alert
                      type="info"
                      showIcon
                      message={tt(
                        "实例运行且健康时可管理凭据。",
                        "Start a healthy instance to manage credentials.",
                      )}
                    />
                  ) : (
                    <Tabs
                      defaultActiveKey="oauth"
                      items={[
                        {
                          key: "oauth",
                          label: (
                            <Space size={6}>
                              <ThunderboltOutlined />
                              <span>{tt("添加授权账号", "Authorize an account")}</span>
                            </Space>
                          ),
                          children: (
                            <Space direction="vertical" size={14} style={{ width: "100%", padding: "10px 0" }}>
                              <Typography.Text type="secondary">
                                {tt(
                                  "选择 AI 提供商并通过官方 OAuth 网页完成一键授权。系统将自动轮询并存储凭据。",
                                  "Select an AI provider to initiate OAuth login. Tokens are automatically persisted to this instance.",
                                )}
                              </Typography.Text>
                              <Flex align="center" gap={12} wrap="wrap">
                                <Select
                                  value={authProvider}
                                  disabled={!!authFlow}
                                  onChange={setAuthProvider}
                                  style={{ width: 220 }}
                                  options={[
                                    { value: "codex", label: "Codex (OpenAI)" },
                                    { value: "anthropic", label: "Claude (Anthropic)" },
                                    { value: "antigravity", label: "Antigravity (Google)" },
                                    { value: "kimi", label: "Kimi (Moonshot)" },
                                    { value: "xai", label: "xAI (Grok)" },
                                  ]}
                                />
                                <Button
                                  type="primary"
                                  disabled={busy || !!authFlow}
                                  icon={<ThunderboltOutlined />}
                                  onClick={() =>
                                    mutation.mutate(async () => {
                                      const flow = await manageCredential(
                                        "GET",
                                        `${authProvider}-auth-url?is_webui=true`,
                                      );
                                      if (!flow.url || !flow.state)
                                        throw new Error(
                                          tt(
                                            "实例未返回授权地址",
                                            "Instance returned no authorization URL",
                                          ),
                                        );
                                      const url = new URL(flow.url);
                                      if (url.protocol !== "https:")
                                        throw new Error(
                                          tt(
                                            "授权地址必须使用 HTTPS",
                                            "Authorization URL must use HTTPS",
                                          ),
                                        );
                                      setAuthFlow({
                                        url: flow.url,
                                        state: flow.state,
                                        user_code: flow.user_code,
                                      });
                                    })
                                  }
                                >
                                  {tt("获取授权链接", "Get authorization link")}
                                </Button>
                              </Flex>

                              {authFlow && (
                                <div
                                  style={{
                                    padding: "14px 16px",
                                    borderRadius: 8,
                                    background: "rgba(255, 255, 255, 0.02)",
                                    border: `1px solid ${token.colorBorderSecondary}`,
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                  }}
                                >
                                  <Flex align="center" gap={12} wrap="wrap">
                                    <Button
                                      type="primary"
                                      icon={<LinkOutlined />}
                                      href={authFlow.url}
                                      target="_blank"
                                      rel="noreferrer"
                                    >
                                      {tt("打开授权页面", "Open authorization page")}
                                    </Button>
                                    <Button
                                      onClick={() => {
                                        mutation.mutate(async () => {
                                          await manageCredential(
                                            "DELETE",
                                            `oauth-session?state=${encodeURIComponent(authFlow.state)}`,
                                          );
                                          setAuthFlow(undefined);
                                        });
                                      }}
                                    >
                                      {tt("结束此授权流程", "Close authorization flow")}
                                    </Button>
                                  </Flex>

                                  {authFlow.user_code && (
                                    <Flex align="center" gap={8}>
                                      <Typography.Text type="secondary">
                                        {tt("设备验证码（若网页提示输入）：", "User Code: ")}
                                      </Typography.Text>
                                      <Typography.Text
                                        copyable
                                        code
                                        style={{ fontSize: 16, fontWeight: "bold", letterSpacing: 2 }}
                                      >
                                        {authFlow.user_code}
                                      </Typography.Text>
                                    </Flex>
                                  )}

                                  <Alert
                                    type={
                                      authStatus.data?.status === "ok"
                                        ? "success"
                                        : authStatus.data?.status === "error"
                                          ? "error"
                                          : "info"
                                    }
                                    showIcon
                                    icon={
                                      authStatus.data?.status === "wait" || !authStatus.data ? (
                                        <SyncOutlined spin />
                                      ) : undefined
                                    }
                                    message={
                                      authStatus.data?.status === "ok"
                                        ? tt("授权成功", "Authorization completed")
                                        : authStatus.data?.status === "error"
                                          ? tt("授权失败或已过期", "Authorization failed or expired")
                                          : tt(
                                              "等待完成授权；如果跳转到无法打开的本地地址，请将完整回调地址粘贴到下方。",
                                              "Waiting for authorization. If redirected to an inaccessible localhost address, paste the full callback URL below.",
                                            )
                                    }
                                  />

                                  <div style={{ marginTop: 4 }}>
                                    <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                                      {tt(
                                        "💡 远程 / NAS 提示：如果在无头或远程服务器上授权，网页可能跳转至无法访问的 localhost 地址，请复制浏览器完整回调链接并粘贴至下方：",
                                        "If redirected to an inaccessible localhost address, paste the full callback URL below.",
                                      )}
                                    </Typography.Text>
                                    <Flex gap={8}>
                                      <Input
                                        value={callbackURL}
                                        onChange={(e) => setCallbackURL(e.target.value)}
                                        placeholder={tt(
                                          "完整回调地址",
                                          "Full callback URL",
                                        )}
                                        style={{ flex: 1 }}
                                      />
                                      <Button
                                        disabled={!callbackURL || busy}
                                        type="primary"
                                        onClick={() =>
                                          mutation.mutate(async () => {
                                            await manageCredential(
                                              "POST",
                                              "oauth-callback",
                                              {
                                                provider: authProvider,
                                                state: authFlow.state,
                                                redirect_url: callbackURL,
                                              },
                                            );
                                            setCallbackURL("");
                                            await authStatus.refetch();
                                            await credentials.refetch();
                                            void handleRefreshNode(node.id);
                                          })
                                        }
                                      >
                                        {tt("提交回调", "Submit callback")}
                                      </Button>
                                    </Flex>
                                  </div>
                                </div>
                              )}
                            </Space>
                          ),
                        },
                        {
                          key: "upload",
                          label: (
                            <Space size={6}>
                              <UploadOutlined />
                              <span>{tt("导入凭证文件", "Import credential file")}</span>
                            </Space>
                          ),
                          children: (
                            <Space direction="vertical" size={14} style={{ width: "100%", padding: "10px 0" }}>
                              <Upload.Dragger
                                accept=".json,application/json"
                                showUploadList={false}
                                beforeUpload={(file) => {
                                  if (file.size > 1024 * 1024) {
                                    message.error(tt("文件不能超过 1 MiB", "File must not exceed 1 MiB"));
                                    return false;
                                  }
                                  setCredentialName(file.name);
                                  void file.text().then(setCredentialJSON).catch((error: Error) => message.error(error.message));
                                  return false;
                                }}
                                style={{ padding: "16px 0" }}
                              >
                                <p className="ant-upload-drag-icon" style={{ marginBottom: 8 }}>
                                  <InboxOutlined style={{ fontSize: 36, color: token.colorPrimary }} />
                                </p>
                                <p className="ant-upload-text" style={{ fontSize: 14 }}>
                                  {tt("点击或拖拽凭证 JSON 文件到此区域", "Choose credential file")}
                                </p>
                                <p className="ant-upload-hint" style={{ fontSize: 12 }}>
                                  {tt("支持 account.json 等官方 CLI 导出的凭据文件（大小不超过 1 MiB）", "Upload account.json or other credential JSON files")}
                                </p>
                              </Upload.Dragger>

                              <Input
                                prefix={<FileTextOutlined style={{ color: token.colorPrimary }} />}
                                placeholder={tt("文件名，例如 account.json", "Filename, e.g. account.json")}
                                value={credentialName}
                                onChange={(e) => setCredentialName(e.target.value)}
                              />
                              {credentialJSON && (
                                <Input.TextArea
                                  rows={4}
                                  style={{ fontFamily: "monospace", fontSize: 12 }}
                                  value={credentialJSON}
                                  onChange={(e) => setCredentialJSON(e.target.value)}
                                  placeholder="{ ... }"
                                />
                              )}
                              <Button
                                type="primary"
                                icon={<UploadOutlined />}
                                disabled={!credentialName.endsWith(".json") || !credentialJSON || busy}
                                onClick={() =>
                                  mutation.mutate(async () => {
                                    await manageCredential(
                                      "POST",
                                      `auth-files?name=${encodeURIComponent(credentialName)}`,
                                      JSON.parse(credentialJSON),
                                    );
                                    setCredentialJSON("");
                                    setCredentialName("");
                                    await credentials.refetch();
                                    void handleRefreshNode(node.id);
                                    setMountModalOpen(false);
                                    message.success(tt("凭据文件已成功导入", "Credential file imported"));
                                  })
                                }
                              >
                                {tt("上传到此实例", "Upload to this instance")}
                              </Button>
                            </Space>
                          ),
                        },
                        {
                          key: "manage",
                          label: (
                            <Space size={6}>
                              <KeyOutlined />
                              <span>{tt("管理已存凭据", "Manage stored credentials")}</span>
                            </Space>
                          ),
                          children: (
                            <div style={{ padding: "10px 0" }}>
                              <Table
                                rowKey="name"
                                size="small"
                                loading={credentials.isFetching}
                                dataSource={credentials.data?.files ?? []}
                                pagination={{ pageSize: 5, hideOnSinglePage: true }}
                                columns={[
                                  {
                                    title: tt("凭据标识", "Credential"),
                                    dataIndex: "name",
                                    render: (name) => (
                                      <Space size={6}>
                                        <KeyOutlined style={{ color: token.colorPrimary }} />
                                        <Typography.Text code>{name}</Typography.Text>
                                      </Space>
                                    ),
                                  },
                                  {
                                    title: tt("账号", "Account"),
                                    dataIndex: "email",
                                    render: (email) =>
                                      email || <Typography.Text type="secondary">—</Typography.Text>,
                                  },
                                  {
                                    title: tt("状态", "Status"),
                                    render: (_, record) => (
                                      <Tag color={record.disabled ? "default" : "success"}>
                                        {record.disabled
                                          ? tt("已禁用", "Disabled")
                                          : record.status || tt("已启用", "Enabled")}
                                      </Tag>
                                    ),
                                  },
                                  {
                                    title: tt("操作", "Actions"),
                                    align: "right",
                                    render: (_, record) => (
                                      <Space size={8}>
                                        <Button
                                          disabled={busy}
                                          onClick={() =>
                                            mutation.mutate(async () => {
                                              await manageCredential(
                                                "PATCH",
                                                "auth-files/status",
                                                {
                                                  name: record.name,
                                                  disabled: !record.disabled,
                                                },
                                              );
                                              await credentials.refetch();
                                              void handleRefreshNode(node.id);
                                            })
                                          }
                                        >
                                          {record.disabled
                                            ? tt("启用", "Enable")
                                            : tt("禁用", "Disable")}
                                        </Button>
                                        <Popconfirm
                                          title={tt(
                                            "删除此凭据？",
                                            "Delete this credential?",
                                          )}
                                          onConfirm={() =>
                                            mutation.mutate(async () => {
                                              await manageCredential(
                                                "DELETE",
                                                `auth-files?name=${encodeURIComponent(record.name)}`,
                                              );
                                              await credentials.refetch();
                                              void handleRefreshNode(node.id);
                                            })
                                          }
                                        >
                                          <Button danger>
                                            {tt("删除", "Delete")}
                                          </Button>
                                        </Popconfirm>
                                      </Space>
                                    ),
                                  },
                                ]}
                              />
                            </div>
                          ),
                        },
                      ]}
                    />
                  )}
                </div>
              </Modal>

              <Modal title={tt("运行配置", "Runtime settings")} open={configOpen}
                onCancel={() => setConfigOpen(false)} footer={null} destroyOnClose>
                <InstanceSettings nodeId={node.id} instanceId={instance.id}
                  enabled={Boolean(configOpen && node.online && instance.healthy)} mode="config" />
              </Modal>
              <Drawer title={tt("操作记录", "Operation history")} open={historyOpen}
                onClose={() => setHistoryOpen(false)} width={720}>
                <Table<Job> rowKey="id" pagination={false}
                  dataSource={(node.report?.jobs ?? []).filter(job => job.instanceId === instance.id)
                    .slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))}
                  columns={[
                    { title: tt("操作", "Action"), dataIndex: "action", render: actionText },
                    { title: tt("状态", "Status"), dataIndex: "status", render: (status: string) => ({
                      queued: tt("排队中", "Queued"), running: tt("执行中", "Running"),
                      succeeded: tt("成功", "Succeeded"), failed: tt("失败", "Failed"),
                    })[status] ?? status },
                    { title: tt("提交时间", "Created at"), dataIndex: "createdAt", render: (value: string) => dayjs(value).format("YYYY-MM-DD HH:mm:ss") },
                    { title: tt("错误", "Error"), dataIndex: "error" },
                  ]} />
              </Drawer>
              {/* Modal for Edit Model Mapping Rules */}
              <Modal
                title={
                  <Space size={6}>
                    <ApartmentOutlined style={{ color: token.colorPrimary }} />
                    <span>{tt("编辑模型映射规则", "Edit Model Mapping Rules")}</span>
                  </Space>
                }
                open={mappingModalOpen}
                onCancel={() => {
                  setMappingModalOpen(false);
                  void modelAliasesQuery.refetch();
                }}
                footer={null}
                destroyOnClose
                width={720}
              >
                <div style={{ marginTop: 12 }}>
                  <InstanceSettings
                    key={`${node.id}/${instance.id}/models`}
                    nodeId={node.id}
                    instanceId={instance.id}
                    enabled={Boolean(node.online && instance.healthy && mappingModalOpen)}
                    mode="models"
                  />
                </div>
              </Modal>
            </>
          ) : (
            <Empty
              description={
                query.isLoading
                  ? tt("正在加载实例", "Loading instance")
                  : tt("实例不存在", "Instance not found")
              }
            />
          )}
        </>
      ) : (
        <>
          <div className={styles.toolbar}>
            <Flex align="center" gap={12} wrap="wrap" style={{ flex: 1, minWidth: 280 }}>
              <Input
                allowClear
                prefix={<SearchOutlined style={{ color: token.colorTextTertiary }} />}
                aria-label={tt("搜索实例", "Search instances")}
                placeholder={tt(
                  "搜索实例名称、地址或作用域",
                  "Search instance name, address or scope",
                )}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{ width: 280, maxWidth: "100%" }}
              />
              <Space size={6} wrap>
                <Tag bordered={false} color="blue">
                  {tt(`共 ${nodes.length} 个实例`, `Total: ${nodes.length}`)}
                </Tag>
                <Tag bordered={false} color={onlineCount > 0 ? "success" : "default"}>
                  {tt(`${onlineCount} 在线`, `${onlineCount} Online`)}
                </Tag>
                {nodes.length - onlineCount > 0 && (
                  <Tag bordered={false} color="warning">
                    {tt(
                      `${nodes.length - onlineCount} 离线`,
                      `${nodes.length - onlineCount} Offline`,
                    )}
                  </Tag>
                )}
              </Space>
            </Flex>
            <Flex align="center" gap={10} wrap="wrap">
              <Tooltip title={tt("刷新探测全部实例", "Refresh all instances")}>
                <Button
                  icon={<ReloadOutlined />}
                  loading={query.isFetching}
                  onClick={() => void query.refetch()}
                >
                  {tt("刷新", "Refresh")}
                </Button>
              </Tooltip>
              <Segmented
                value={view}
                aria-label={tt("实例显示方式", "Instance view")}
                options={[
                  {
                    value: "list",
                    icon: <UnorderedListOutlined />,
                    label: tt("列表", "List"),
                  },
                  {
                    value: "cards",
                    icon: <AppstoreOutlined />,
                    label: tt("卡片", "Cards"),
                  },
                ]}
                onChange={(value) => {
                  setView(value as "list" | "cards");
                  localStorage.setItem("cliproxy-instance-view", value);
                }}
              />
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  nodeForm.resetFields();
                  setEnrolling(true);
                }}
              >
                {tt("创建实例", "Create instance")}
              </Button>
            </Flex>
          </div>
          {view === "list" ? (
            <Table<ServiceNode>
              rowKey="id"
              dataSource={rows}
              loading={query.isLoading}
              pagination={{ pageSize: 10, hideOnSinglePage: true }}
              onRow={(item) => ({
                onClick: () => openInstance(item),
                style: { cursor: "pointer" },
              })}
              columns={[
                {
                  title: tt("实例", "Instance"),
                  dataIndex: "name",
                  render: (name, item) => (
                    <Flex align="center" gap={8}>
                      <CloudServerOutlined
                        style={{
                          fontSize: 16,
                          color: item.online
                            ? token.colorSuccess
                            : token.colorTextTertiary,
                        }}
                      />
                      <Button
                        type="link"
                        style={{ paddingInline: 0, fontWeight: 500 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openInstance(item);
                        }}
                      >
                        {name}
                      </Button>
                      {item.scopePrefix && (
                        <Tag
                          bordered={false}
                          color="blue"
                          style={{
                            fontSize: 11,
                            fontFamily: "monospace",
                            margin: 0,
                          }}
                        >
                          {item.scopePrefix}
                        </Tag>
                      )}
                    </Flex>
                  ),
                },
                {
                  title: tt("实例地址", "Instance address"),
                  dataIndex: "endpoint",
                  render: (endpoint) => (
                    <Typography.Text
                      copyable={{ text: endpoint }}
                      style={{ fontFamily: "monospace", fontSize: 12 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {endpoint}
                    </Typography.Text>
                  ),
                },
                {
                  title: tt("状态", "Status"),
                  render: (_, item) => renderCardStatus(item),
                },
                {
                  title: tt("CLIProxyAPI 版本", "CLIProxyAPI version"),
                  render: (_, item) => {
                    const { versionStr, port } = getNodeMeta(item);
                    return (
                      <Space size={4}>
                        <Tag bordered={false}>{versionStr}</Tag>
                        {port && (
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 12 }}
                          >
                            :{port}
                          </Typography.Text>
                        )}
                      </Space>
                    );
                  },
                },
                {
                  title: tt("已纳管凭据", "Managed Credentials"),
                  render: (_, item) => {
                    const { totalCredentials, totalModels } = getNodeMeta(item);
                    return (
                      <Space size={4}>
                        <Tag
                          bordered={false}
                          color={totalCredentials > 0 ? "cyan" : "default"}
                          style={{ margin: 0 }}
                        >
                          {tt(
                            `${totalCredentials} 个`,
                            `${totalCredentials} creds`,
                          )}
                        </Tag>
                        {totalModels > 0 && (
                          <Tag
                            bordered={false}
                            color="blue"
                            style={{ margin: 0 }}
                          >
                            {tt(
                              `${totalModels} 模型`,
                              `${totalModels} models`,
                            )}
                          </Tag>
                        )}
                      </Space>
                    );
                  },
                },
                {
                  title: tt("系统架构", "Platform"),
                  responsive: ["lg"],
                  render: (_, item) =>
                    item.report?.os ? (
                      <Tag bordered={false} style={{ margin: 0 }}>
                        {item.report.os}
                        {item.report.arch ? ` / ${item.report.arch}` : ""}
                      </Tag>
                    ) : (
                      "—"
                    ),
                },
                {
                  title: tt("最近活跃", "Last active"),
                  responsive: ["md"],
                  render: (_, item) => {
                    const { lastSeenText } = getNodeMeta(item);
                    return (
                      <Tooltip
                        title={
                          item.lastSeenAt
                            ? dayjs(item.lastSeenAt).format(
                                "YYYY-MM-DD HH:mm:ss",
                              )
                            : "—"
                        }
                      >
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12, whiteSpace: "nowrap" }}
                        >
                          {lastSeenText}
                        </Typography.Text>
                      </Tooltip>
                    );
                  },
                },
                {
                  title: tt("操作", "Actions"),
                  align: "right",
                  render: (_, item) => (
                    <Space size={6} onClick={(e) => e.stopPropagation()}>
                      <Button
                        type="link"
                        icon={<SettingOutlined />}
                        style={{ paddingInline: 2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          openInstance(item);
                        }}
                      >
                        {tt("管理", "Manage")}
                      </Button>
                      <Button
                        type="link"
                        icon={<ReloadOutlined />}
                        style={{ paddingInline: 2 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRefreshNode(item.id);
                        }}
                      >
                        {tt("刷新", "Refresh")}
                      </Button>
                      <Popconfirm
                        title={tt(
                          "移除此实例连接？",
                          "Remove instance connection?",
                        )}
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          void handleDeleteNode(item.id);
                        }}
                      >
                        <Button
                          type="link"
                          danger
                          icon={<DeleteOutlined />}
                          style={{ paddingInline: 2 }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {tt("移除", "Remove")}
                        </Button>
                      </Popconfirm>
                    </Space>
                  ),
                },
              ]}
            />
          ) : rows.length ? (
            <div className={styles.instanceGrid}>
              {rows.map((item) => {
                const {
                  totalCredentials,
                  totalModels,
                  versionStr,
                  latency,
                  port,
                  lastSeenText,
                } = getNodeMeta(item);
                return (
                  <div
                    key={item.id}
                    className={styles.instanceCard}
                    onClick={() => openInstance(item)}
                  >
                    <div className={styles.cardHeader}>
                      <Flex
                        align="center"
                        gap={12}
                        style={{ minWidth: 0, flex: 1 }}
                      >
                        <div
                          className={styles.nodeIconBox}
                          style={{
                            background: item.online
                              ? "rgba(82, 196, 26, 0.12)"
                              : "rgba(255, 255, 255, 0.04)",
                            border: `1px solid ${
                              item.online
                                ? "rgba(82, 196, 26, 0.25)"
                                : token.colorBorderSecondary
                            }`,
                          }}
                        >
                          <CloudServerOutlined
                            style={{
                              fontSize: 20,
                              color: item.online
                                ? token.colorSuccess
                                : token.colorTextTertiary,
                            }}
                          />
                        </div>
                        <Flex vertical style={{ minWidth: 0, flex: 1 }}>
                          <Typography.Text
                            strong
                            ellipsis
                            style={{ fontSize: 15 }}
                          >
                            {item.name}
                          </Typography.Text>
                          <Space size={4} style={{ marginTop: 2 }}>
                            {item.scopePrefix ? (
                              <Tag
                                bordered={false}
                                color="blue"
                                style={{
                                  fontSize: 11,
                                  lineHeight: "18px",
                                  margin: 0,
                                  fontFamily: "monospace",
                                }}
                              >
                                {item.scopePrefix}
                              </Tag>
                            ) : (
                              <Typography.Text
                                type="secondary"
                                style={{
                                  fontSize: 11,
                                  fontFamily: "monospace",
                                }}
                              >
                                {item.id}
                              </Typography.Text>
                            )}
                          </Space>
                        </Flex>
                      </Flex>
                      {renderCardStatus(item)}
                    </div>

                    <div className={styles.cardBody}>
                      <div className={styles.endpointBox}>
                        <LinkOutlined
                          style={{
                            color: token.colorTextTertiary,
                            flexShrink: 0,
                          }}
                        />
                        <Typography.Text
                          ellipsis
                          copyable={{ text: item.endpoint }}
                          style={{
                            fontFamily: "monospace",
                            fontSize: 12,
                            color: token.colorTextSecondary,
                            flex: 1,
                          }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          {item.endpoint}
                        </Typography.Text>
                      </div>

                      <div className={styles.metricsGrid}>
                        <div className={styles.metricCell}>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            {tt("版本", "Version")}
                          </Typography.Text>
                          <Typography.Text
                            strong
                            ellipsis
                            style={{ fontSize: 13 }}
                          >
                            {versionStr}
                          </Typography.Text>
                        </div>
                        <div className={styles.metricCell}>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            {latency !== undefined
                              ? tt("延迟", "Latency")
                              : tt("端口", "Port")}
                          </Typography.Text>
                          <Typography.Text
                            strong
                            style={{
                              fontSize: 13,
                              color:
                                latency !== undefined
                                  ? latency < 100
                                    ? token.colorSuccess
                                    : latency < 300
                                      ? token.colorWarning
                                      : token.colorError
                                  : undefined,
                            }}
                          >
                            {latency !== undefined
                              ? `${latency}ms`
                              : port
                                ? `:${port}`
                                : "—"}
                          </Typography.Text>
                        </div>
                        <div className={styles.metricCell}>
                          <Typography.Text
                            type="secondary"
                            style={{ fontSize: 11 }}
                          >
                            {tt("凭据与模型", "Creds / Models")}
                          </Typography.Text>
                          <Typography.Text
                            strong
                            style={{
                              fontSize: 13,
                              color:
                                totalCredentials > 0
                                  ? token.colorPrimary
                                  : undefined,
                            }}
                          >
                            {totalCredentials} / {totalModels}
                          </Typography.Text>
                        </div>
                      </div>

                      {item.report?.os && (
                        <Flex
                          justify="space-between"
                          align="center"
                          style={{ fontSize: 11 }}
                        >
                          <Typography.Text type="secondary">
                            {tt("系统架构", "Platform")}
                          </Typography.Text>
                          <Tag
                            bordered={false}
                            style={{ margin: 0, fontSize: 11 }}
                          >
                            {item.report.os}
                            {item.report.arch ? ` / ${item.report.arch}` : ""}
                          </Tag>
                        </Flex>
                      )}
                    </div>

                    <div className={styles.cardFooter}>
                      <Tooltip
                        title={
                          item.lastSeenAt
                            ? dayjs(item.lastSeenAt).format(
                                "YYYY-MM-DD HH:mm:ss",
                              )
                            : "—"
                        }
                      >
                        <Typography.Text
                          type="secondary"
                          style={{ fontSize: 12, whiteSpace: "nowrap" }}
                        >
                          {lastSeenText}
                        </Typography.Text>
                      </Tooltip>
                      <Space size={6} onClick={(e) => e.stopPropagation()}>
                        <Button
                          icon={<ReloadOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleRefreshNode(item.id);
                          }}
                        >
                          {tt("刷新", "Refresh")}
                        </Button>
                        <Popconfirm
                          title={tt(
                            "移除此实例连接？",
                            "Remove instance?",
                          )}
                          onConfirm={(e) => {
                            e?.stopPropagation();
                            void handleDeleteNode(item.id);
                          }}
                        >
                          <Button
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {tt("移除", "Remove")}
                          </Button>
                        </Popconfirm>
                        <Button
                          type="primary"
                          ghost
                          icon={<SettingOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            openInstance(item);
                          }}
                        >
                          {tt("管理", "Manage")}
                        </Button>
                      </Space>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <Empty
              description={
                query.isLoading
                  ? tt("正在加载实例", "Loading instances")
                  : tt("暂无实例", "No instances")
              }
            />
          )}
        </>
      )}
      <Modal
        title={tt("创建实例", "Create instance")}
        open={enrolling}
        onCancel={() => setEnrolling(false)}
        confirmLoading={busy}
        onOk={() =>
          mutation.mutate(async () => {
            const values = await nodeForm.validateFields();
            await api(base, {
              method: "POST",
              body: JSON.stringify(values),
            });
            setEnrolling(false);
            message.success(tt("实例已创建", "Instance created"));
          })
        }
      >
        <Form form={nodeForm} layout="vertical">
          <Form.Item
            name="name"
            label={tt("实例名称", "Instance name")}
            rules={[{ required: true }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            name="id"
            label={tt("实例标识（可选）", "Instance ID (optional)")}
            rules={[{ pattern: /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/ }]}
          >
            <Input placeholder="nas" />
          </Form.Item>
          <Form.Item
            name="endpoint"
            label={tt("实例地址", "Instance address")}
            rules={[{ required: true }, { type: "url" }]}
          >
            <Input placeholder="http://orbit-cliproxy-manager:8792" />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title={tt("安装 CLIProxyAPI", "Install CLIProxyAPI")}
        open={!!creating}
        onCancel={() => setCreating(undefined)}
        confirmLoading={busy}
        onOk={() =>
          mutation.mutate(async () => {
            const values = await instanceForm.validateFields();
            const created = await api<Instance>(
              `${base}/${creating}/instances`,
              {
                method: "POST",
                body: JSON.stringify({
                  name: node?.name ?? "CLIProxyAPI",
                  port: values.port,
                }),
              },
            );
            setCreating(undefined);
            await refresh();
            await api(`${instancePath(node!.id, created.id)}/actions`, {
              method: "POST",
              body: JSON.stringify({
                action: "install",
                version: values.version || "latest",
              }),
            });
            await api(`${base}/${node!.id}/refresh`, { method: "POST" });
          })
        }
      >
        <Form
          form={instanceForm}
          layout="vertical"
          initialValues={{ port: 8317 }}
        >
          <Form.Item name="version" label={tt("版本", "Version")}>
            <Input placeholder="latest" />
          </Form.Item>
          <Form.Item
            name="port"
            label={tt("实例监听端口", "Instance port")}
            rules={[{ required: true }]}
          >
            <InputNumber min={1024} max={65535} style={{ width: "100%" }} />
          </Form.Item>
          <Typography.Text type="secondary">
            {tt(
              "安装完成后可在详情中启动 CLIProxyAPI。凭据由实例保存。",
              "Start CLIProxyAPI from the detail page after installation. Credentials are stored by this instance.",
            )}
          </Typography.Text>
        </Form>
      </Modal>
      <Modal
        title={`${operation?.nodeName ?? ""} / ${operation?.instance.name ?? ""} · ${actionText(operation?.action ?? "")}`}
        open={!!operation}
        onCancel={() => setOperation(undefined)}
        confirmLoading={busy}
        onOk={() => mutation.mutate(doAction)}
      >
        {operation && ["install", "upgrade"].includes(operation.action) ? (
          <Space direction="vertical" style={{ width: "100%" }}>
            <Typography.Text>
              {tt(
                "版本号，留空使用最新稳定版本",
                "Version; leave empty for the latest stable release",
              )}
            </Typography.Text>
            <Input
              value={version}
              onChange={(e) => setVersion(e.target.value || "latest")}
              placeholder="latest"
            />
            <Alert
              type="info"
              message={tt(
                "升级会短暂中断当前实例的请求。新版本启动失败时自动恢复旧版本。",
                "Upgrade briefly interrupts requests to this instance. Startup failure restores the previous version.",
              )}
            />
          </Space>
        ) : (
          <Typography.Text>
            {tt(
              "确认对该实例执行此操作？",
              "Execute this operation on the selected instance?",
            )}
          </Typography.Text>
        )}
      </Modal>

      <Drawer
        title={detail?.title}
        open={!!detail}
        onClose={() => setDetail(undefined)}
        width={780}
      >
        <pre style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
          {detail?.text || tt("暂无记录", "No records")}
        </pre>
      </Drawer>
    </Space>
  );
}

export function InstanceLogs({
  nodeId,
  instanceId,
  enabled,
}: {
  nodeId: string;
  instanceId: string;
  enabled: boolean;
}) {
  const { tt } = useI18n();
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { styles } = useStyles();
  const logs = useQuery({
    queryKey: ["managed-instance-logs", nodeId, instanceId],
    queryFn: () =>
      api<{ text: string }>(`${instancePath(nodeId, instanceId)}/logs`),
    enabled,
    refetchInterval: enabled ? 5000 : false,
  });
  return (
    <Card
      size="small"
      className={styles.sectionCard}
      title={
        <Flex justify="space-between" align="center" wrap="wrap" gap={8}>
          <Space size={8}>
            <FileTextOutlined style={{ color: token.colorPrimary }} />
            <span>{tt("实时运行日志", "Live Process Logs")}</span>
            <Tag color="processing" style={{ margin: 0, fontSize: 11 }}>
              <SyncOutlined spin={logs.isFetching} style={{ marginInlineEnd: 4 }} />
              {tt("5秒自动轮询", "5s Auto-refresh")}
            </Tag>
          </Space>
          <Space size={8}>
            <Button
              icon={<CopyOutlined />}
              disabled={!logs.data?.text}
              onClick={() => {
                if (logs.data?.text) {
                  void navigator.clipboard.writeText(logs.data.text);
                  message.success(tt("日志已复制到剪贴板", "Logs copied to clipboard"));
                }
              }}
            >
              {tt("复制日志", "Copy logs")}
            </Button>
            <Button
              icon={<ReloadOutlined />}
              disabled={!enabled}
              loading={logs.isFetching}
              onClick={() => void logs.refetch()}
            >
              {tt("刷新日志", "Refresh logs")}
            </Button>
          </Space>
        </Flex>
      }
      styles={{ body: { padding: 10 } }}
    >
      {logs.error && (
        <Alert
          type="error"
          showIcon
          message={logs.error.message}
          style={{ marginBottom: 10 }}
        />
      )}
      <pre className={styles.terminal}>
        {logs.data?.text || tt("暂无日志", "No logs")}
      </pre>
    </Card>
  );
}

type ModelAlias = { name: string; alias: string; fork?: boolean };
function InstanceSettings({
  nodeId,
  instanceId,
  enabled,
  mode,
}: {
  nodeId: string;
  instanceId: string;
  enabled: boolean;
  mode: "models" | "config";
}) {
  const { tt } = useI18n();
  const { message } = App.useApp();
  const client = useQueryClient();
  const [channel, setChannel] = useState("codex");
  const [form] = Form.useForm();
  const request = (method: string, path: string, payload?: unknown) =>
    api<Record<string, unknown>>(
      `${instancePath(nodeId, instanceId)}/management`,
      { method: "POST", body: JSON.stringify({ method, path, payload }) },
    );
  const settings = useQuery({
    queryKey: ["managed-instance-settings", nodeId, instanceId, mode],
    refetchOnWindowFocus: false,
    enabled,
    queryFn: async () => {
      if (mode === "models") return request("GET", "oauth-model-alias");
      const [proxy, retry, strategy] = await Promise.all([
        request("GET", "proxy-url"),
        request("GET", "request-retry"),
        request("GET", "routing/strategy"),
      ]);
      return { ...proxy, ...retry, ...strategy };
    },
  });
  useEffect(() => {
    if (!settings.data) return;
    const mappings = settings.data["oauth-model-alias"] as
      | Record<string, ModelAlias[]>
      | undefined;
    form.resetFields();
    form.setFieldsValue(
      mode === "models"
        ? { aliases: mappings?.[channel] ?? [] }
        : {
            proxyURL: settings.data["proxy-url"] ?? "",
            retry: settings.data["request-retry"] ?? 0,
            strategy: settings.data.strategy ?? "round-robin",
          },
    );
  }, [settings.data, channel, mode, form]);
  const save = useMutation({
    mutationFn: async () => {
      const values = await form.validateFields();
      if (mode === "models") {
        const aliases = (values.aliases ?? []) as ModelAlias[];
        if (new Set(aliases.map((a) => a.alias.trim())).size !== aliases.length)
          throw new Error(tt("映射名称不能重复", "Aliases must be unique"));
        await request("PATCH", "oauth-model-alias", {
          channel,
          aliases: aliases.map((a) => ({
            ...a,
            name: a.name.trim(),
            alias: a.alias.trim(),
          })),
        });
      } else {
        // Keep partial failures visible; refetch on success only so edits remain retryable.
        await request("PUT", "proxy-url", { value: values.proxyURL ?? "" });
        await request("PUT", "request-retry", { value: values.retry });
        await request("PUT", "routing/strategy", { value: values.strategy });
      }
      await settings.refetch();
      await client.invalidateQueries({ queryKey: ["managed-instance-model-aliases", nodeId, instanceId] });
      await client.invalidateQueries({ queryKey: ["service-nodes"] });
      message.success(tt("已保存", "Saved"));
    },
    onError: (error) => message.error(error.message),
  });
  if (!enabled)
    return (
      <Alert
        type="info"
        message={tt(
          "实例运行且健康时可管理此配置。",
          "Start a healthy instance to manage this configuration.",
        )}
      />
    );
  if (settings.error)
    return (
      <Alert
        type="error"
        message={settings.error.message}
        action={
          <Button onClick={() => void settings.refetch()}>
            {tt("重试", "Retry")}
          </Button>
        }
      />
    );
  if (!settings.data) return <Card loading />;
  const aliases = settings.data["oauth-model-alias"] as
    | Record<string, ModelAlias[]>
    | undefined;
  return (
    <Space direction="vertical" size={16} style={{ width: "100%" }}>
      {mode === "models" && (
        <Flex justify="space-between" align="center" wrap="wrap" gap={12}>
          <Typography.Text type="secondary" style={{ fontSize: 13 }}>
            {tt(
              "为此实例中的 OAuth 提供商配置模型别名。模型组合中的调度规则单独管理。",
              "Configure OAuth model aliases for this instance. Routing rules are managed in model combos.",
            )}
          </Typography.Text>
          <Space size={8}>
            <Typography.Text type="secondary">{tt("提供商：", "Provider: ")}</Typography.Text>
            <Select
              aria-label={tt("提供商", "Provider")}
              value={channel}
              disabled={save.isPending}
              onChange={(value) => {
                setChannel(value);
                form.resetFields();
              }}
              style={{ width: 180 }}
              options={[
                "codex",
                "claude",
                "gemini",
                "antigravity",
                "qwen",
                "kimi",
                "xai",
              ].map((value) => ({ value, label: value }))}
            />
          </Space>
        </Flex>
      )}
      <Form
        key={`${mode}/${channel}/${settings.dataUpdatedAt}`}
        form={form}
        layout="vertical"
        initialValues={
          mode === "models"
            ? { aliases: aliases?.[channel] ?? [] }
            : {
                proxyURL: settings.data["proxy-url"] ?? "",
                retry: settings.data["request-retry"] ?? 0,
                strategy: settings.data.strategy ?? "round-robin",
              }
        }
      >
        {mode === "models" ? (
          <Form.List name="aliases">
            {(fields, { add, remove }) => (
              <Space direction="vertical" style={{ width: "100%" }}>
                {fields.map((field) => (
                  <Flex key={field.key} gap={12} align="start" wrap>
                    <Form.Item
                      name={[field.name, "alias"]}
                      label={tt("调用模型名", "Request model")}
                      rules={[{ required: true, whitespace: true }]}
                      style={{ flex: 1, minWidth: 160 }}
                    >
                      <Input placeholder="e.g. gpt-4o" />
                    </Form.Item>
                    <Form.Item
                      name={[field.name, "name"]}
                      label={tt("实际模型名", "Upstream model")}
                      rules={[{ required: true, whitespace: true }]}
                      style={{ flex: 1, minWidth: 160 }}
                    >
                      <Input placeholder="e.g. o3-mini" />
                    </Form.Item>
                    <Button
                      danger
                      icon={<DeleteOutlined />}
                      style={{ marginTop: 30 }}
                      onClick={() => remove(field.name)}
                    >
                      {tt("删除", "Delete")}
                    </Button>
                  </Flex>
                ))}
                <Button
                  icon={<PlusOutlined />}
                  onClick={() => add({ name: "", alias: "" })}
                >
                  {tt("添加映射", "Add mapping")}
                </Button>
              </Space>
            )}
          </Form.List>
        ) : (
          <>
            <Form.Item
              name="proxyURL"
              label={tt("出站代理地址", "Outbound proxy URL")}
            >
              <Input
                placeholder={tt(
                  "留空使用默认网络",
                  "Leave empty for default network",
                )}
              />
            </Form.Item>
            <Form.Item
              name="retry"
              label={tt("请求重试次数", "Request retries")}
              rules={[{ required: true }]}
            >
              <InputNumber min={0} precision={0} />
            </Form.Item>
            <Form.Item
              name="strategy"
              label={tt("实例内凭据选择策略", "Instance credential strategy")}
              rules={[{ required: true }]}
            >
              <Select
                options={[
                  { value: "round-robin", label: tt("轮询", "Round robin") },
                  {
                    value: "fill-first",
                    label: tt(
                      "优先使用首个可用凭据",
                      "First available credential",
                    ),
                  },
                ]}
              />
            </Form.Item>
          </>
        )}
      </Form>
      <Button
        type="primary"
        loading={save.isPending}
        onClick={() => save.mutate()}
      >
        {tt("保存", "Save")}
      </Button>
    </Space>
  );
}
