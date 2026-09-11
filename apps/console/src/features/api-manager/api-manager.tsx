import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Collapse,
  Col,
  DatePicker,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Segmented,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  combosApi,
  keysApi,
  modelsApi,
  type ApiKeyView,
  type ApiKeyCreateInput,
} from "@/entities/api";
import { MaterialIcon } from "@/app/nav";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import dayjs from "dayjs";
import { CallerAccessFields, CallerSourceDrawer } from "./caller-access-panel";
import { callerClientName, parseCallerIpRules } from "./caller-access";
import { useI18n } from "@/i18n";
import {
  ALL_COMBOS_ACCESS_RULE,
  comboAccessSaveValue,
  editableComboAccessRules,
  listUnrenderableComboAccessRules,
} from "./combo-access";

const { Text, Title, Paragraph } = Typography;

const useStyles = createStyles(({ token }) => ({
  metricCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  keyText: {
    fontFamily: "monospace",
    fontSize: 12,
    fontWeight: 600,
  },
  codeSnippet: {
    fontFamily: "monospace",
    fontSize: 12,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 6,
    padding: "10px 14px",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
}));

function maskKeyClient(key: string | null | undefined): string {
  if (!key) return "—";
  if (key.length <= 12) return key;
  return `${key.slice(0, 8)}...${key.slice(-4)}`;
}

function isKeyActive(k: ApiKeyView): boolean {
  if (k.isBanned === true) return false;
  if (k.isActive === false) return false;
  if (k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()) return false;
  return true;
}

export default function ApiManagerPage() {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { tt } = useI18n();
  const edgeBaseUrl = (import.meta.env.VITE_EDGE_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/$/, "");

  const [sourceKeyId, setSourceKeyId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [featureFilter, setFeatureFilter] = useState<string>("all");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [createdKey, setCreatedKey] = useState<{ key: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<ApiKeyView | null>(null);
  const [revealed, setRevealed] = useState<Record<string, string>>({});
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  // Form states
  const [createForm] = Form.useForm();
  const [editForm] = Form.useForm();

  const keysQuery = useQuery({
    queryKey: ["api-keys"],
    queryFn: keysApi.list,
    staleTime: 15_000,
  });

  const keys = keysQuery.data?.keys ?? [];
  const allowReveal = keysQuery.data?.allowKeyReveal ?? true;
  const modelCatalogQuery = useQuery({ queryKey: ["api-key-model-catalog"], queryFn: modelsApi.catalog, staleTime: 60_000 });
  const combosQuery = useQuery({
    queryKey: ["api-key-combos"],
    queryFn: combosApi.list,
    staleTime: 60_000,
  });
  const comboOptions = useMemo(
    () =>
      (combosQuery.data?.combos ?? [])
        .slice()
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((combo) => ({ value: combo.name, label: combo.name })),
    [combosQuery.data]
  );
  const modelOptions = useMemo(() => {
    const unique = new Map<string, string>();
    for (const group of Object.values(modelCatalogQuery.data?.catalog ?? {})) {
      for (const model of group.models ?? []) {
        const id = typeof model.id === "string" ? model.id.trim() : "";
        const name = typeof model.name === "string" ? model.name.trim() : "";
        if (!id) continue;
        unique.set(id, name || id);
      }
    }
    return Array.from(unique, ([value, label]) => ({ value, label: label === value ? value : `${label} (${value})` }));
  }, [modelCatalogQuery.data]);

  // Usage Statistics Query
  const usageQuery = useQuery({
    queryKey: ["api-keys-usage-stats", keys.map((k) => k.id).join(",")],
    queryFn: async () => {
      try {
        const [analyticsRes, logsRes] = await Promise.all([
          fetch("/api/usage/analytics?range=all"),
          fetch("/api/usage/call-logs?limit=1000"),
        ]);
        const analytics = analyticsRes.ok ? await analyticsRes.json() : null;
        const byApiKey: Array<{ apiKeyId?: string; requests?: number; cost?: number }> =
          analytics?.byApiKey || [];
        const logs: Array<{ apiKeyId?: string; apiKeyName?: string; timestamp?: string }> =
          logsRes.ok ? await logsRes.json() : [];

        const stats: Record<
          string,
          { totalRequests: number; totalCost: number; lastUsed: string | null }
        > = {};

        for (const key of keys) {
          const matches = byApiKey.filter((entry) => entry.apiKeyId === key.id);
          const totalRequests = matches.reduce(
            (sum, entry) => sum + (Number(entry.requests) || 0),
            0
          );
          const totalCost = matches.reduce((sum, entry) => {
            const cost = Number(entry.cost);
            return sum + (Number.isFinite(cost) ? cost : 0);
          }, 0);

          const lastUsed =
            logs.find(
              (log) => log.apiKeyId === key.id || (!log.apiKeyId && log.apiKeyName === key.name)
            )?.timestamp || null;

          stats[key.id] = {
            totalRequests,
            totalCost,
            lastUsed,
          };
        }
        return stats;
      } catch {
        return {} as Record<
          string,
          { totalRequests: number; totalCost: number; lastUsed: string | null }
        >;
      }
    },
    enabled: keys.length > 0,
    staleTime: 30_000,
  });

  const usageStats = usageQuery.data || {};

  // KPI Metrics
  const metrics = useMemo(() => {
    const total = keys.length;
    const active = keys.filter(isKeyActive).length;
    const banned = keys.filter((k) => k.isBanned === true).length;
    const expired = keys.filter(
      (k) => k.expiresAt && new Date(k.expiresAt).getTime() < Date.now()
    ).length;
    const noLog = keys.filter((k) => k.noLog).length;
    return { total, active, banned, expired, noLog };
  }, [keys]);

  // Filtering
  const filteredKeys = useMemo(() => {
    const q = search.trim().toLowerCase();
    return keys.filter((k) => {
      if (q) {
        const matchesName = k.name.toLowerCase().includes(q);
        const matchesKey = (k.key ?? "").toLowerCase().includes(q);
        const matchesMachine = (k.machineId ?? "").toLowerCase().includes(q);
        const matchesSource = [k.lastClientIp, k.lastClientUserAgent, callerClientName(k.lastClientUserAgent)].some((value) => value?.toLowerCase().includes(q));
        if (!matchesName && !matchesKey && !matchesMachine && !matchesSource) return false;
      }

      if (statusFilter === "active" && !isKeyActive(k)) return false;
      if (statusFilter === "disabled" && (k.isActive !== false || k.isBanned === true)) return false;
      if (statusFilter === "banned" && k.isBanned !== true) return false;
      if (statusFilter === "expired" && !(k.expiresAt && new Date(k.expiresAt).getTime() < Date.now())) return false;

      if (featureFilter === "manage" && !(k.scopes ?? []).includes("manage")) return false;
      if (featureFilter === "noLog" && !k.noLog) return false;
      if (featureFilter === "quota" && !k.usageLimitEnabled) return false;
      if (featureFilter === "chaos" && !k.chaosModeEnabled) return false;

      return true;
    });
  }, [keys, search, statusFilter, featureFilter]);

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["api-keys"] });

  // Mutations
  const createMutation = useMutation({
    mutationFn: keysApi.create,
    onSuccess: (res) => {
      setAddModalOpen(false);
      createForm.resetFields();
      setCreatedKey({ key: res.key, name: res.name });
      invalidate();
      message.success(`API 密钥 "${res.name}" 创建成功`);
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "创建 API 密钥失败"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Record<string, unknown> }) =>
      keysApi.update(id, patch),
    onSuccess: () => {
      setEditTarget(null);
      invalidate();
      message.success("密钥配置已更新");
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "更新密钥失败"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => keysApi.remove(id),
    onSuccess: () => {
      message.success("密钥已删除");
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "删除密钥失败"),
  });

  const regenerateMutation = useMutation({
    mutationFn: (id: string) => keysApi.regenerate(id),
    onSuccess: (res) => {
      message.success("密钥已重新生成");
      setCreatedKey({ key: res.key, name: "重新生成的密钥" });
      invalidate();
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "重新生成密钥失败"),
  });

  const revealKey = async (k: ApiKeyView) => {
    if (!k.id) return;
    if (revealed[k.id]) {
      setVisibleKeys((prev) => {
        const next = new Set(prev);
        if (next.has(k.id)) next.delete(k.id);
        else next.add(k.id);
        return next;
      });
      return;
    }
    try {
      const res = await keysApi.reveal(k.id);
      if (res.key) {
        setRevealed((prev) => ({ ...prev, [k.id]: res.key! }));
        setVisibleKeys((prev) => new Set(prev).add(k.id));
      }
    } catch (err) {
      message.error(err instanceof Error ? err.message : "获取明文密钥失败");
    }
  };

  const copyToClipboard = async (text: string, tip = "已复制到剪贴板") => {
    if (!text) {
      message.error(tt("没有可复制的密钥", "No key is available to copy"));
      return;
    }
    try {
      await navigator.clipboard.writeText(text);
      message.success(tip);
    } catch (err) {
      message.error(err instanceof Error ? err.message : tt("复制密钥失败", "Failed to copy key"));
    }
  };

  const copyKey = async (k: ApiKeyView) => {
    const existingPlainKey = revealed[k.id];
    if (existingPlainKey) {
      await copyToClipboard(existingPlainKey);
      return;
    }
    if (!allowReveal) {
      message.error(tt("系统已禁用明文密钥复制", "Plaintext key copying is disabled"));
      return;
    }
    try {
      const res = await keysApi.reveal(k.id);
      if (!res.key) {
        message.error(tt("无法获取明文密钥", "The plaintext key is unavailable"));
        return;
      }
      setRevealed((prev) => ({ ...prev, [k.id]: res.key! }));
      await copyToClipboard(res.key);
    } catch (err) {
      message.error(err instanceof Error ? err.message : tt("获取明文密钥失败", "Failed to reveal key"));
    }
  };

  const openEditModal = (k: ApiKeyView) => {
    setEditTarget(k);
    const scopes = k.scopes ?? [];
    const modelAccessMode =
      k.modelAccessMode === "restricted" || (k.allowedModels?.length ?? 0) > 0
        ? "custom"
        : (k.blockedModels?.length ?? 0) > 0
          ? "blacklist"
          : "all";
    editForm.setFieldsValue({
      name: k.name,
      ipAllowlist: (k.ipAllowlist ?? []).join("\n"),
      ipAccessMode: k.ipAllowlist?.length ? "restricted" : "all",
      isActive: k.isActive !== false,
      isBanned: k.isBanned === true,
      expiresAt: k.expiresAt ? dayjs(k.expiresAt) : null,
      manageEnabled: scopes.includes("manage"),
      selfUsageEnabled: scopes.includes("read:usage") || !scopes.length,
      selfAccountQuotaEnabled: scopes.includes("read:account_quota"),
      allowUsageCommand: Boolean(k.allowUsageCommand),
      noLog: Boolean(k.noLog),
      autoResolve: Boolean(k.autoResolve),
      compressionEnabled: k.compressionEnabled !== false,
      chaosModeEnabled: Boolean(k.chaosModeEnabled),
      disableNonPublicModels: Boolean(k.disableNonPublicModels),
      modelAccessMode,
      allowedModels: k.allowedModels ?? [],
      blockedModels: k.blockedModels ?? [],
      comboAccessMode: k.allowedCombos?.includes(ALL_COMBOS_ACCESS_RULE)
        ? "all"
        : "restricted",
      allowedCombos: editableComboAccessRules(k.allowedCombos),
      maxSessions: k.maxSessions ?? null,
      throttleDelayMs: k.throttleDelayMs ?? null,
      usageLimitEnabled: Boolean(k.usageLimitEnabled),
      dailyUsageLimitUsd: k.dailyUsageLimitUsd ?? null,
      weeklyUsageLimitUsd: k.weeklyUsageLimitUsd ?? null,
    });
  };

  const columns = [
    {
      title: tt("密钥", "API key"),
      key: "name",
      width: 250,
      render: (_: unknown, k: ApiKeyView) => {
        const isShown = visibleKeys.has(k.id) && revealed[k.id];
        const displayValue = isShown ? revealed[k.id] : k.key;
        return (
          <Flex vertical gap={4} style={{ minWidth: 0 }}>
            <Text strong ellipsis={{ tooltip: k.name }}>{k.name}</Text>
            <Flex gap={4} align="center">
              <Text className={styles.keyText} ellipsis={{ tooltip: isShown ? displayValue : undefined }} style={{ flex: 1, minWidth: 0 }}>{isShown ? displayValue : maskKeyClient(displayValue)}</Text>
              {allowReveal && <Tooltip title={isShown ? tt("隐藏明文", "Hide plaintext") : tt("显示完整明文", "Reveal plaintext")}>
                <Button type="text" aria-label={isShown ? tt("隐藏明文", "Hide plaintext") : tt("显示完整明文", "Reveal plaintext")} icon={<MaterialIcon name={isShown ? "visibility_off" : "visibility"} size={18} />} onClick={() => void revealKey(k)} />
              </Tooltip>}
              <Tooltip title={tt("复制密钥", "Copy key")}><Button type="text" aria-label={tt("复制密钥", "Copy key")} icon={<MaterialIcon name="content_copy" size={18} />} onClick={() => void copyKey(k)} /></Tooltip>
            </Flex>
            <Flex gap={8} align="center">
              <Switch aria-label={tt("启用密钥", "Enable key")} checked={k.isActive !== false && !k.isBanned} disabled={k.isBanned === true} onChange={(checked) => updateMutation.mutate({ id: k.id, patch: { isActive: checked } })} />
              <Tooltip title={k.expiresAt ? `${tt("到期", "Expires")}: ${dayjs(k.expiresAt).format("YYYY-MM-DD HH:mm")}` : tt("永久有效", "Never expires")}>
                <Text type={isKeyActive(k) ? "secondary" : "warning"} style={{ fontSize: 12 }}>{k.isBanned ? tt("已封禁", "Banned") : k.expiresAt && dayjs(k.expiresAt).isBefore(dayjs()) ? tt("已过期", "Expired") : k.isActive === false ? tt("已停用", "Disabled") : tt("已启用", "Enabled")}</Text>
              </Tooltip>
            </Flex>
          </Flex>
        );
      },
    },
    {
      title: tt("最近调用来源", "Latest caller"),
      key: "callerSource",
      width: 200,
      render: (_: unknown, k: ApiKeyView) => (
        <Flex vertical gap={4}>
          <Button type="link" onClick={() => setSourceKeyId(k.id)} style={{ padding: 0, height: "auto", justifyContent: "flex-start", maxWidth: "100%" }}>
            <MaterialIcon name={k.noLog ? "visibility_off" : k.lastClientAt ? "devices" : "history"} size={18} />
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{k.noLog ? tt("记录已关闭", "Recording disabled") : k.lastClientAt ? callerClientName(k.lastClientUserAgent) || tt("未知客户端", "Unknown client") : tt("暂无来源", "No caller yet")}</span>
          </Button>
          {!k.noLog && k.lastClientAt ? <>
            <Text style={{ fontFamily: "monospace", fontSize: 12 }} ellipsis={{ tooltip: k.lastClientIp }}>{k.lastClientIp || "—"}</Text>
            <Tooltip title={dayjs(k.lastClientAt).format("YYYY-MM-DD HH:mm:ss")}><Text type="secondary" style={{ fontSize: 12 }}>{dayjs(k.lastClientAt).format("MM-DD HH:mm")}</Text></Tooltip>
          </> : <Text type="secondary" style={{ fontSize: 12 }}>{k.noLog ? tt("免日志模式", "No-log mode") : tt("等待首次请求", "Awaiting first request")}</Text>}
        </Flex>
      ),
    },
    {
      title: tt("权限与安全特性", "Permissions & Features"),
      key: "permissions",
      width: 180,
      render: (_: unknown, k: ApiKeyView) => {
        const scopes = k.scopes ?? [];
        return (
          <Space wrap size={[4, 4]}>
            <Tooltip title={(k.modelAccessMode === "restricted" ? k.allowedModels : k.blockedModels)?.join(", ")}>
              <Tag color={k.modelAccessMode === "restricted" ? "geekblue" : k.blockedModels?.length ? "orange" : undefined}>{k.modelAccessMode === "restricted" ? tt(`限定 ${k.allowedModels?.length ?? 0} 个模型`, `${k.allowedModels?.length ?? 0} models allowed`) : k.blockedModels?.length ? tt(`排除 ${k.blockedModels.length} 个模型`, `${k.blockedModels.length} models blocked`) : tt("全部模型", "All models")}</Tag>
            </Tooltip>
            <Tag color={k.ipAllowlist?.length ? "blue" : undefined}>{k.ipAllowlist?.length ? tt(`IP 限制 · ${k.ipAllowlist.length} 条`, `IP restricted · ${k.ipAllowlist.length}`) : tt("不限 IP", "Any IP")}</Tag>
            {scopes.includes("manage") && <Tag color="magenta">{tt("管理访问", "Manage")}</Tag>}
            {k.noLog && <Tag color="purple">{tt("免日志审计", "No Log")}</Tag>}
            {k.autoResolve && <Tag color="blue">{tt("自动解析", "Auto-Resolve")}</Tag>}
            {k.compressionEnabled && <Tag color="cyan">{tt("压缩加速", "Compression")}</Tag>}
            {k.chaosModeEnabled && <Tag color="volcano">{tt("混沌测试", "Chaos Test")}</Tag>}
            {k.usageLimitEnabled && <Tag color="green">{tt("额度限制", "Quota")}</Tag>}
            {!scopes.includes("manage") && !k.noLog && !k.autoResolve && !k.compressionEnabled && (
              <Tag color="default">{tt("标准推理", "Standard")}</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: tt("用量与消耗", "Usage & Cost"),
      key: "usage",
      width: 120,
      render: (_: unknown, k: ApiKeyView) => {
        const stats = usageStats[k.id];
        const totalRequests = stats?.totalRequests ?? 0;
        const totalCost = stats?.totalCost ?? 0;
        const lastUsed = stats?.lastUsed;

        return (
          <Flex vertical gap={2}>
            <Flex align="center" gap={4}>
              <Text strong style={{ fontSize: 13, fontFamily: "monospace", lineHeight: 1 }}>
                {totalRequests}
              </Text>
              <Text type="secondary" style={{ fontSize: 11, lineHeight: 1 }}>
                {tt("次请求", "requests")}
              </Text>
            </Flex>
            {totalCost > 0 ? (
              <Text style={{ fontSize: 11, color: "#10B981", fontWeight: 500 }}>
                ${totalCost < 0.01 ? totalCost.toFixed(4) : totalCost.toFixed(3)}
              </Text>
            ) : totalRequests > 0 ? (
              <Text type="secondary" style={{ fontSize: 10 }}>
                $0.00
              </Text>
            ) : null}
            <Text type="secondary" style={{ fontSize: 10 }}>
              {lastUsed ? `${tt("最后活跃", "Last used")}: ${dayjs(lastUsed).format("MM-DD HH:mm")}` : tt("从未调用", "Never used")}
            </Text>
            {k.usageLimitEnabled && (k.dailyUsageLimitUsd || k.weeklyUsageLimitUsd) && (
              <Tag color="cyan" style={{ fontSize: 10, margin: "2px 0 0", width: "fit-content" }}>
                {tt("限额", "Limit")}: ${k.dailyUsageLimitUsd || k.weeklyUsageLimitUsd}/d
              </Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: tt("操作", "Actions"),
      key: "actions",
      fixed: "right" as const,
      width: 168,
      render: (_: unknown, k: ApiKeyView) => (
        <Space size={2}>
          <Tooltip title={tt(`查看 ${k.name} 的用量分析`, `View analytics for ${k.name}`)}>
            <Button
              type="text"
              icon={<MaterialIcon name="payments" size={15} style={{ color: "#10B981" }} />}
              onClick={() =>
                navigate(`/dashboard/analytics?range=all&apiKeyIds=${encodeURIComponent(k.id)}&groupBy=model`)
              }
            />
          </Tooltip>
          <Tooltip title="编辑权限与属性">
            <Button
              type="text"
              icon={<MaterialIcon name="tune" size={15} />}
              onClick={() => openEditModal(k)}
            />
          </Tooltip>
          <Tooltip title="重新生成密钥">
            <Popconfirm
              title="重新生成 API 密钥？"
              description="原密钥将立刻失效，使用旧密钥的客户端将无法再发起请求。"
              okText="确认重置"
              cancelText="取消"
              onConfirm={() => regenerateMutation.mutate(k.id)}
            >
              <Button
                type="text"
                  icon={<MaterialIcon name="refresh" size={15} style={{ color: "#F59E0B" }} />}
              />
            </Popconfirm>
          </Tooltip>
          <Tooltip title="删除密钥">
            <Popconfirm
              title="删除此 API 密钥？"
              description="删除后不可恢复。"
              okText="确认删除"
              okButtonProps={{ danger: true }}
              cancelText="取消"
              onConfirm={() => deleteMutation.mutate(k.id)}
            >
              <Button
                type="text"
                  danger
                icon={<MaterialIcon name="delete" size={15} />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  if (keysQuery.isLoading && !keysQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <Flex vertical gap={16}>
      {/* Header */}
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 20 }}>
            {tt("API 密钥管理", "API Keys Management")}
          </Title>
          <Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
            {tt(
              "创建与分发大模型客户端访问令牌，配置细粒度模型白名单、并发限流、免日志审计与额度消耗控制",
              "Create and distribute LLM client access tokens with fine-grained model whitelist, rate limits, no-log privacy, and usage quotas"
            )}
          </Paragraph>
        </div>

        <Space wrap>
          <Button icon={<MaterialIcon name="refresh" size={14} />} onClick={invalidate}>
            {tt("刷新", "Refresh")}
          </Button>
          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={14} />}
            onClick={() => { createForm.resetFields(); setAddModalOpen(true); }}
            style={{ background: "#8B5CF6", borderColor: "#8B5CF6" }}
          >
            {tt("新建", "New")}
          </Button>
        </Space>
      </Flex>

      {/* KPI Top 4 Blocks */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              {tt("密钥总量", "Total Keys")}
            </Text>
            <Title level={3} style={{ margin: "4px 0 0" }}>
              {metrics.total}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("系统已发放访问凭据", "Total issued credentials")}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              {tt("活跃中密钥", "Active Keys")}
            </Text>
            <Title level={3} style={{ margin: "4px 0 0", color: "#10B981" }}>
              {metrics.active}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt(`占总量 ${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 100}%`, `${metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 100}% of total`)}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              {tt("免日志模式", "No-Log Mode")}
            </Text>
            <Title level={3} style={{ margin: "4px 0 0", color: "#8B5CF6" }}>
              {metrics.noLog}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("高隐私脱敏密钥数", "High privacy keys")}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              {tt("已过期 / 封禁", "Expired / Banned")}
            </Text>
            <Title
              level={3}
              style={{
                margin: "4px 0 0",
                color: metrics.banned + metrics.expired > 0 ? "#EF4444" : undefined,
              }}
            >
              {metrics.banned + metrics.expired}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt(`封禁 ${metrics.banned} · 过期 ${metrics.expired}`, `Banned ${metrics.banned} · Expired ${metrics.expired}`)}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Filter Bar */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <Space size={8} wrap>
            <Input
              placeholder={tt("搜索密钥、来源 IP 或客户端", "Search key, caller IP or client")}
              prefix={<MaterialIcon name="search" size={16} />}
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            <Select
              value={featureFilter}
              onChange={setFeatureFilter}
              style={{ minWidth: 155 }}
              options={[
                { label: tt("全部特性", "All Features"), value: "all" },
                { label: tt("管理访问", "Manage Scope"), value: "manage" },
                { label: tt("免日志审计", "No-Log"), value: "noLog" },
                { label: tt("额度限制", "Quota"), value: "quota" },
                { label: tt("混沌测试", "Chaos"), value: "chaos" },
              ]}
            />
          </Space>

          <Segmented
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as never)}
            options={[
              { label: tt("全部", "All"), value: "all" },
              { label: tt("活跃", "Active"), value: "active" },
              { label: tt("已停用", "Disabled"), value: "disabled" },
              { label: tt("已过期", "Expired"), value: "expired" },
              { label: tt("已封禁", "Banned"), value: "banned" },
            ]}
          />
        </Flex>
      </Card>

      {keysQuery.isError && <Alert type="error" showIcon title={tt("无法加载密钥列表", "Unable to load API keys")} description={tt("请检查服务连接后重试。", "Check the service connection and retry.")} action={<Button onClick={() => void keysQuery.refetch()}>{tt("重试", "Retry")}</Button>} />}

      {/* Table */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Table
          dataSource={filteredKeys}
          columns={columns}
          rowKey="id"
          tableLayout="fixed"
          scroll={{ x: 920 }}
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 个密钥` }}
          loading={keysQuery.isLoading}
          size="middle"
          locale={{ emptyText: "暂无匹配的 API 密钥" }}
        />
      </Card>

      <CallerSourceDrawer
        apiKey={keys.find((key) => key.id === sourceKeyId) ?? null}
        onClose={() => setSourceKeyId(null)}
        onEdit={(key) => { setSourceKeyId(null); openEditModal(key); }}
      />

      {/* Create Modal */}
      <Modal
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="key" size={20} style={{ color: "#8B5CF6" }} />
            <span>{tt("新建 API 密钥", "New API Key")}</span>
          </Flex>
        }
        width={960}
        centered
        styles={{ body: { maxHeight: "calc(100dvh - 160px)", overflowY: "auto", overflowX: "hidden", paddingRight: 8 } }}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        okText={tt("确认创建", "Create Key")}
        cancelText={tt("取消", "Cancel")}
      >
        <Form
          form={createForm}
          layout="vertical"
          initialValues={{
            manageEnabled: false,
            selfUsageEnabled: true,
            selfAccountQuotaEnabled: false,
            allowUsageCommand: false,
            noLog: false,
            compressionEnabled: false,
          }}
          onFinish={(values) => {
            const scopes: string[] = [];
            if (values.manageEnabled) scopes.push("manage");
            if (values.selfUsageEnabled !== false) scopes.push("read:usage");
            if (values.selfUsageEnabled && values.selfAccountQuotaEnabled) scopes.push("read:account_quota");

            const payload: ApiKeyCreateInput = {
              name: values.name.trim(),
              ipAllowlist: values.ipAccessMode === "restricted" ? parseCallerIpRules(values.ipAllowlist) : [],
              scopes,
              noLog: Boolean(values.noLog),
              allowUsageCommand: Boolean(values.allowUsageCommand),
              compressionEnabled: Boolean(values.compressionEnabled),
            };
            createMutation.mutate(payload);
          }}
          style={{ marginTop: 16, maxWidth: "100%", overflowX: "hidden" }}
        >
          {/* Key Name - Full Width */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
              marginBottom: 16,
            }}
          >
            <Flex align="center" gap={6} style={{ marginBottom: 10 }}>
              <MaterialIcon name="badge" size={16} style={{ color: token.colorPrimary }} />
              <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                {tt("密钥标识", "Key Identity")}
              </Text>
            </Flex>
            <Form.Item
              name="name"
              label={<Text style={{ fontSize: 12 }}>{tt("密钥名称 / 标识", "Key name / identifier")}</Text>}
              rules={[{ required: true, message: tt("请输入密钥名称", "Enter a key name") }]}
              extra={<Text type="secondary" style={{ fontSize: 11 }}>{tt("用于识别该密钥用途的唯一标识名称（例如：我的应用、开发测试、Cursor 专用等）", "A unique name used to identify this key, such as an app, development environment, or Cursor.")}</Text>}
              style={{ marginBottom: 0 }}
            >
              <Input placeholder={tt("例如: 生产网关客户端 / Cursor 专用", "Example: production gateway client / Cursor")} maxLength={200} autoFocus />
            </Form.Item>
          </div>

          <Row gutter={[16, 16]} style={{ marginInline: 0 }}>
            {/* Left Column: Caller Access & Management */}
            <Col xs={24} md={12}>
              <CallerAccessFields />

              {/* Management Access */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  marginBottom: 16,
                }}
              >
                <Flex align="center" justify="space-between">
                  <div style={{ paddingRight: 12 }}>
                    <Flex align="center" gap={6}>
                      <MaterialIcon name="admin_panel_settings" size={16} style={{ color: "#F43F5E" }} />
                      <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                        {tt("管理访问权限", "Management Access")}
                      </Text>
                    </Flex>
                    <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                      {tt("允许此密钥访问管理控制台与系统配置接口（建议仅限管理员使用）", "Allow this key to access the management console and system configuration APIs. Recommended for administrators only.")}
                    </Text>
                  </div>
                  <Form.Item name="manageEnabled" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </div>
            </Col>

            {/* Right Column: Self-Service & Safety */}
            <Col xs={24} md={12}>
              {/* Self-Service & Usage Visibility */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  marginBottom: 16,
                }}
              >
                <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                  <MaterialIcon name="query_stats" size={16} style={{ color: "#10B981" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("自助服务与用量可见性", "Self-Service Visibility")}
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 12 }}>
                  {tt("控制客户端使用此密钥时能够直接查询的用量与配额范围：", "Control the usage and quota information clients can query directly with this key:")}
                </Text>

                <Flex vertical gap={12}>
                  <Flex align="center" justify="space-between">
                    <div>
                      <Text style={{ fontSize: 12 }}>{tt("自身用量可见性", "Own Usage Visibility")}</Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        {tt("允许持有者查询该密钥自身的用量统计和消耗明细", "Allow the holder to view this key's usage statistics and consumption details.")}
                      </Text>
                    </div>
                    <Form.Item name="selfUsageEnabled" valuePropName="checked" noStyle>
                      <Switch />
                    </Form.Item>
                  </Flex>

                  <Form.Item
                    noStyle
                    shouldUpdate={(prev, curr) => prev.selfUsageEnabled !== curr.selfUsageEnabled}
                  >
                    {({ getFieldValue }) => {
                      const selfUsage = getFieldValue("selfUsageEnabled");
                      return (
                        <Flex align="center" justify="space-between" style={{ opacity: selfUsage ? 1 : 0.5 }}>
                          <div>
                            <Text style={{ fontSize: 12 }}>{tt("共享账户额度可见性", "Shared Account Quota")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("允许此密钥查询账户剩余总额度（依赖自身用量可见性）", "Allow this key to view the account's remaining total quota. Requires own usage visibility.")}
                            </Text>
                          </div>
                          <Form.Item name="selfAccountQuotaEnabled" valuePropName="checked" noStyle>
                            <Switch disabled={!selfUsage} />
                          </Form.Item>
                        </Flex>
                      );
                    }}
                  </Form.Item>

                  <Flex align="center" justify="space-between">
                    <div>
                      <Text style={{ fontSize: 12 }}>{tt("本地用量快捷指令", "Local Usage Command")}</Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        {tt("允许在支持的客户端通过 /usage 指令直接返回当前配额", "Allow supported clients to return the current quota with the /usage command.")}
                      </Text>
                    </div>
                    <Form.Item name="allowUsageCommand" valuePropName="checked" noStyle>
                      <Switch />
                    </Form.Item>
                  </Flex>
                </Flex>
              </div>

              {/* Security & Advanced Options */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  marginBottom: 16,
                }}
              >
                <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                  <MaterialIcon name="security" size={16} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("安全与性能特性", "Safety & Performance")}
                  </Text>
                </Flex>

                <Flex vertical gap={12}>
                  <Flex align="center" justify="space-between">
                    <div>
                      <Text style={{ fontSize: 12 }}>{tt("免日志审计模式", "No-Log Mode")}</Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        {tt("不记录请求 Payload 与 Prompt，适用于极端隐私场景", "Do not record request payloads or prompts; suitable for highly private workloads.")}
                      </Text>
                    </div>
                    <Form.Item name="noLog" valuePropName="checked" noStyle>
                      <Switch />
                    </Form.Item>
                  </Flex>

                  <Flex align="center" justify="space-between">
                    <div>
                      <Text style={{ fontSize: 12 }}>{tt("压缩加速传输", "Compression")}</Text>
                      <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                        {tt("为该密钥开启请求与响应的 Gzip/Brotli 压缩传输", "Enable Gzip/Brotli compression for this key's requests and responses.")}
                      </Text>
                    </div>
                    <Form.Item name="compressionEnabled" valuePropName="checked" noStyle>
                      <Switch />
                    </Form.Item>
                  </Flex>
                </Flex>
              </div>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* Key Created Success Modal */}
      <Modal
        open={Boolean(createdKey)}
        onCancel={() => setCreatedKey(null)}
        title="API 密钥已生成"
        width={620}
        footer={[
          <Button key="close" type="primary" onClick={() => setCreatedKey(null)}>
            我已妥善保存
          </Button>,
        ]}
      >
        <Flex vertical gap={12} style={{ marginTop: 12 }}>
          <Alert
            type="warning"
            showIcon
            message="请立即复制并保存此密钥"
            description="为了您的账户安全，明文 API 密钥仅在创建完成时完整显示一次。后续系统将默认脱敏处理。"
          />

          <div>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              密钥名称: <Text strong>{createdKey?.name}</Text>
            </Text>
            <div className={styles.codeSnippet}>
              <Flex align="center" justify="space-between">
                <Text code strong style={{ fontSize: 13, color: "#10B981" }}>
                  {createdKey?.key}
                </Text>
                <Button
                  type="primary"
                  icon={<MaterialIcon name="content_copy" size={14} />}
                  onClick={() => copyToClipboard(createdKey?.key || "")}
                >
                  复制
                </Button>
              </Flex>
            </div>
          </div>

          <div>
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              cURL 快速接入调用示例:
            </Text>
            <pre className={styles.codeSnippet}>
{`curl ${edgeBaseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer ${createdKey?.key || "YOUR_KEY"}" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
            </pre>
          </div>
        </Flex>
      </Modal>

      {/* Edit Permissions Modal */}
      <Modal
        open={Boolean(editTarget)}
        onCancel={() => setEditTarget(null)}
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="tune" size={20} style={{ color: "#3B82F6" }} />
            <span>{editTarget ? `${tt("编辑密钥权限与配置", "Edit Key Permissions & Config")} · ${editTarget.name}` : ""}</span>
          </Flex>
        }
        width={1040}
        centered
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        okText={tt("保存更改", "Save Changes")}
        cancelText={tt("取消", "Cancel")}
        styles={{ body: { maxHeight: "calc(100dvh - 160px)", overflowY: "auto", overflowX: "hidden", paddingRight: 8 } }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            if (!editTarget?.id) return;
            const isAllowlist = values.modelAccessMode === "custom";
            const isBlocklist = values.modelAccessMode === "blacklist";
            const scopes: string[] = [];
            if (values.manageEnabled) scopes.push("manage");
            if (values.selfUsageEnabled !== false) scopes.push("read:usage");
            if (values.selfUsageEnabled && values.selfAccountQuotaEnabled)
              scopes.push("read:account_quota");

            const patch: Record<string, unknown> = {
              name: values.name.trim(),
              ipAllowlist: values.ipAccessMode === "restricted" ? parseCallerIpRules(values.ipAllowlist) : [],
              isActive: values.isActive,
              isBanned: values.isBanned,
              expiresAt: values.expiresAt ? values.expiresAt.toISOString() : null,
              scopes,
              noLog: Boolean(values.noLog),
              autoResolve: Boolean(values.autoResolve),
              allowUsageCommand: Boolean(values.allowUsageCommand),
              compressionEnabled: Boolean(values.compressionEnabled),
              chaosModeEnabled: Boolean(values.chaosModeEnabled),
              disableNonPublicModels: Boolean(values.disableNonPublicModels),
              // The API stores two modes only: restricted (allowlist) and all.
              // A blocklist is represented by all + blockedModels.
              modelAccessMode: isAllowlist ? "restricted" : "all",
              allowedModels: isAllowlist ? values.allowedModels ?? [] : [],
              blockedModels: isBlocklist ? values.blockedModels ?? [] : [],
              allowedCombos: comboAccessSaveValue(
                values.comboAccessMode === "restricted" ? "restricted" : "all",
                values.allowedCombos ?? []
              ),
              maxSessions: values.maxSessions ?? null,
              throttleDelayMs: values.throttleDelayMs ?? null,
              usageLimitEnabled: Boolean(values.usageLimitEnabled),
              dailyUsageLimitUsd: values.dailyUsageLimitUsd ?? null,
              weeklyUsageLimitUsd: values.weeklyUsageLimitUsd ?? null,
            };
            updateMutation.mutate({ id: editTarget.id, patch });
          }}
          style={{ marginTop: 12, maxWidth: "100%", overflowX: "hidden" }}
        >
          {/* Top Card: 基本标识与生命周期 (Full Width) */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
              marginBottom: 16,
            }}
          >
            <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
              <MaterialIcon name="badge" size={16} style={{ color: token.colorPrimary }} />
              <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                {tt("基本标识与生命周期", "Identity & Lifecycle")}
              </Text>
            </Flex>

            <Form.Item
              name="name"
              label={<Text style={{ fontSize: 12 }}>{tt("密钥名称 / 标识", "Key name / identifier")}</Text>}
              rules={[{ required: true, message: tt("请输入密钥名称", "Enter a key name") }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder={tt("例如: 生产网关客户端", "Example: production gateway client")} maxLength={200} />
            </Form.Item>

            <Row gutter={16} style={{ marginInline: 0 }}>
              <Col span={12}>
                <Form.Item
                  name="expiresAt"
                  label={<Text style={{ fontSize: 12 }}>{tt("有效期截止时间（留空为永久有效）", "Expiration time (leave blank to never expire)")}</Text>}
                  style={{ marginBottom: 8 }}
                >
                  <DatePicker showTime style={{ width: "100%" }} placeholder={tt("永久有效", "Never expires")} />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Flex align="center" justify="space-between" style={{ height: "100%", paddingTop: 8 }}>
                  <div>
                    <Text style={{ fontSize: 12, display: "block" }}>{tt("启用状态", "Enabled")}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{tt("正常提供推理服务", "Serving inference normally")}</Text>
                  </div>
                  <Form.Item name="isActive" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Col>
              <Col span={6}>
                <Flex align="center" justify="space-between" style={{ height: "100%", paddingTop: 8 }}>
                  <div>
                    <Text style={{ fontSize: 12, display: "block", color: "#EF4444" }}>{tt("紧急封禁", "Emergency ban")}</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>{tt("立即阻断调用", "Block requests immediately")}</Text>
                  </div>
                  <Form.Item name="isBanned" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Col>
            </Row>
          </div>

          <Row gutter={[16, 16]} style={{ marginInline: 0 }}>
            {/* Left Column: Model Access, Combo Access, Caller IP */}
            <Col xs={24} md={12}>
              {/* Card: 模型访问控制 */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  marginBottom: 16,
                }}
              >
                <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                  <MaterialIcon name="tune" size={16} style={{ color: "#3B82F6" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("模型访问控制", "Model Access Control")}
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 12 }}>
                  {tt("配置该 API 密钥允许调用的模型范围与黑白名单：", "Configure the models this API key can use, including allowlists and blocklists:")}
                </Text>

                <Form.Item name="modelAccessMode" style={{ marginBottom: 12 }}>
                  <Radio.Group style={{ width: "100%", display: "flex" }}>
                    <Radio.Button value="all" style={{ flex: 1, textAlign: "center" }}>
                      {tt("全部模型", "All")}
                    </Radio.Button>
                    <Radio.Button value="custom" style={{ flex: 1, textAlign: "center" }}>
                      {tt("白名单限定", "Allowlist")}
                    </Radio.Button>
                    <Radio.Button value="blacklist" style={{ flex: 1, textAlign: "center" }}>
                      {tt("黑名单排除", "Blocklist")}
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>

                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) => prev.modelAccessMode !== curr.modelAccessMode}
                >
                  {({ getFieldValue }) => {
                    const mode = getFieldValue("modelAccessMode");
                    if (mode === "custom") {
                      return (
                        <Form.Item
                          name="allowedModels"
                          label={<Text style={{ fontSize: 12 }}>{tt("允许调用的模型", "Allowed models")}</Text>}
                          style={{ marginBottom: 0 }}
                        >
                          <Select mode="multiple" showSearch optionFilterProp="label" options={modelOptions} loading={modelCatalogQuery.isLoading} placeholder={tt("选择可用模型", "Select models")} notFoundContent={modelCatalogQuery.isLoading ? tt("正在加载模型…", "Loading models…") : tt("暂无可用模型", "No models available")} />
                        </Form.Item>
                      );
                    }
                    if (mode === "blacklist") {
                      return (
                        <Form.Item
                          name="blockedModels"
                          label={<Text style={{ fontSize: 12 }}>{tt("禁止调用的模型", "Blocked models")}</Text>}
                          style={{ marginBottom: 0 }}
                        >
                          <Select mode="multiple" showSearch optionFilterProp="label" options={modelOptions} loading={modelCatalogQuery.isLoading} placeholder={tt("选择需排除的模型", "Select models to exclude")} notFoundContent={modelCatalogQuery.isLoading ? tt("正在加载模型…", "Loading models…") : tt("暂无可用模型", "No models available")} />
                        </Form.Item>
                      );
                    }
                    return null;
                  }}
                </Form.Item>
              </div>

              {/* Card: 组合访问控制 */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  marginBottom: 16,
                }}
              >
                <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                  <MaterialIcon name="route" size={16} style={{ color: "#8B5CF6" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("组合访问控制", "Combo Access Control")}
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 12 }}>
                  {tt("配置该密钥允许访问的模型组合套餐范围：", "Configure allowed model combos for this key:")}
                </Text>
                <Form.Item name="comboAccessMode" style={{ marginBottom: 12 }}>
                  <Radio.Group style={{ width: "100%", display: "flex" }}>
                    <Radio.Button value="all" style={{ flex: 1, textAlign: "center" }}>
                      {tt("允许全部组合", "Allow all combos")}
                    </Radio.Button>
                    <Radio.Button value="restricted" style={{ flex: 1, textAlign: "center" }}>
                      {tt("限定组合", "Restrict combos")}
                    </Radio.Button>
                  </Radio.Group>
                </Form.Item>
                <Form.Item
                  noStyle
                  shouldUpdate={(prev, curr) =>
                    prev.comboAccessMode !== curr.comboAccessMode ||
                    prev.allowedCombos !== curr.allowedCombos
                  }
                >
                  {({ getFieldValue, setFieldsValue }) => {
                    if (getFieldValue("comboAccessMode") !== "restricted") return null;
                    const selected = (getFieldValue("allowedCombos") ?? []) as string[];
                    const loaded = combosQuery.data?.combos ?? [];
                    const preserved = listUnrenderableComboAccessRules(selected, loaded);
                    const preservedSet = new Set(preserved);
                    const renderableSelected = selected.filter((name) => !preservedSet.has(name));
                    return (
                      <Flex vertical gap={8}>
                        <Select
                          mode="multiple"
                          showSearch
                          value={renderableSelected}
                          options={comboOptions}
                          loading={combosQuery.isLoading}
                          placeholder={tt("选择允许的组合", "Select allowed combos")}
                          onChange={(next) =>
                            setFieldsValue({ allowedCombos: [...next, ...preserved] })
                          }
                        />
                        {preserved.length > 0 && (
                          <Alert
                            type="info"
                            showIcon
                            message={tt(
                              `另有 ${preserved.length} 个已保存规则不在组合列表中，将原样保留`,
                              `${preserved.length} stored rules are not in the combo list and will be preserved`
                            )}
                            description={
                              <Space wrap size={[4, 4]}>
                                {preserved.map((rule) => (
                                  <Tag key={rule}>{rule}</Tag>
                                ))}
                              </Space>
                            }
                          />
                        )}
                      </Flex>
                    );
                  }}
                </Form.Item>
              </div>
            </Col>

            {/* Right Column: Caller Access & Quota / Traffic Limits */}
            <Col xs={24} md={12}>
              {/* Card: 调用方访问控制 */}
              <CallerAccessFields />

              {/* Card: 额度与流量治理 */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 8,
                  background: token.colorFillQuaternary,
                  border: `1px solid ${token.colorBorderSecondary}`,
                  marginBottom: 16,
                }}
              >
                <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                  <MaterialIcon name="speed" size={16} style={{ color: "#F59E0B" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    {tt("额度与流量治理", "Quota & Traffic Limits")}
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 12 }}>
                  {tt("设置该密钥的消费上限与并发速率，防止超额消耗与突发洪峰：", "Set spend limits and concurrency rates to prevent unexpected cost surges and traffic spikes:")}
                </Text>

                <Flex vertical gap={12}>
                  <div>
                    <Flex align="center" justify="space-between">
                      <div>
                        <Text style={{ fontSize: 12 }}>{tt("USD 消费额度硬限制", "USD Spend Hard Limit")}</Text>
                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                          {tt("达到消费上限后自动暂停该密钥的计费推理请求", "Pause billing inference requests once the spend threshold is reached.")}
                        </Text>
                      </div>
                      <Form.Item name="usageLimitEnabled" valuePropName="checked" noStyle>
                        <Switch />
                      </Form.Item>
                    </Flex>

                    <Form.Item
                      noStyle
                      shouldUpdate={(prev, curr) => prev.usageLimitEnabled !== curr.usageLimitEnabled}
                    >
                      {({ getFieldValue }) => {
                        const limitOn = getFieldValue("usageLimitEnabled");
                        if (!limitOn) return null;
                        return (
                          <Row gutter={16} style={{ marginTop: 8, marginInline: 0 }}>
                            <Col span={12}>
                              <Form.Item
                                name="dailyUsageLimitUsd"
                                label={<Text style={{ fontSize: 11 }}>{tt("每日用量上限 ($)", "Daily usage limit ($)")}</Text>}
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber min={0.01} precision={2} style={{ width: "100%" }} placeholder={tt("留空无限制", "Leave blank for no limit")} />
                              </Form.Item>
                            </Col>
                            <Col span={12}>
                              <Form.Item
                                name="weeklyUsageLimitUsd"
                                label={<Text style={{ fontSize: 11 }}>{tt("每周用量上限 ($)", "Weekly usage limit ($)")}</Text>}
                                style={{ marginBottom: 0 }}
                              >
                                <InputNumber min={0.01} precision={2} style={{ width: "100%" }} placeholder={tt("留空无限制", "Leave blank for no limit")} />
                              </Form.Item>
                            </Col>
                          </Row>
                        );
                      }}
                    </Form.Item>
                  </div>

                  <div style={{ borderTop: `1px dashed ${token.colorBorderSecondary}`, paddingTop: 10 }}>
                    <Row gutter={16} style={{ marginInline: 0 }}>
                      <Col span={12}>
                        <Form.Item
                          name="maxSessions"
                          label={<Text style={{ fontSize: 12 }}>{tt("最大并发会话数", "Maximum concurrent sessions")}</Text>}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={1} max={10000} style={{ width: "100%" }} placeholder={tt("无限制", "Unlimited")} />
                        </Form.Item>
                      </Col>
                      <Col span={12}>
                        <Form.Item
                          name="throttleDelayMs"
                          label={<Text style={{ fontSize: 12 }}>{tt("请求软延迟延时 (ms)", "Request soft delay (ms)")}</Text>}
                          style={{ marginBottom: 0 }}
                        >
                          <InputNumber min={0} max={300000} step={100} style={{ width: "100%" }} placeholder="0" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                </Flex>
              </div>
            </Col>
          </Row>

          {/* Bottom Collapsible: 权限范围与高级特性 */}
          <Collapse
            style={{ marginTop: 8, overflowX: "hidden" }}
            items={[{
              key: "advanced",
              label: (
                <Flex align="center" gap={6}>
                  <MaterialIcon name="tune" size={16} style={{ color: "#8B5CF6" }} />
                  <Text strong>{tt("权限范围与高级特性", "Permissions & Advanced Features")}</Text>
                </Flex>
              ),
              forceRender: true,
              children: (
                <Row gutter={[16, 16]} style={{ marginInline: 0 }}>
                  {/* Left Column in Collapse: 客户端权限与自助服务 */}
                  <Col xs={24} md={12}>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        background: token.colorFillQuaternary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        marginBottom: 8,
                      }}
                    >
                      <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                        <MaterialIcon name="admin_panel_settings" size={16} style={{ color: "#F43F5E" }} />
                        <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                          {tt("客户端权限与自助服务", "Permissions & Self-Service")}
                        </Text>
                      </Flex>

                      <Flex vertical gap={12}>
                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("管理访问权限", "Management Access")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("允许此密钥访问管理控制台与系统配置接口", "Allow this key to access the management console and system configuration APIs.")}
                            </Text>
                          </div>
                          <Form.Item name="manageEnabled" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>

                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("自身用量可见性", "Own Usage Visibility")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("允许持有者查询该密钥自身的用量统计和消耗明细", "Allow the holder to view this key's usage statistics and consumption details.")}
                            </Text>
                          </div>
                          <Form.Item name="selfUsageEnabled" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>

                        <Form.Item
                          noStyle
                          shouldUpdate={(prev, curr) => prev.selfUsageEnabled !== curr.selfUsageEnabled}
                        >
                          {({ getFieldValue }) => {
                            const selfUsage = getFieldValue("selfUsageEnabled");
                            return (
                              <Flex align="center" justify="space-between" style={{ opacity: selfUsage ? 1 : 0.5 }}>
                                <div style={{ paddingRight: 12 }}>
                                  <Text style={{ fontSize: 12 }}>{tt("共享账户额度可见性", "Shared Account Quota")}</Text>
                                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                                    {tt("允许此密钥查询账户剩余总额度（依赖自身用量可见性）", "Allow this key to view the account's remaining total quota. Requires own usage visibility.")}
                                  </Text>
                                </div>
                                <Form.Item name="selfAccountQuotaEnabled" valuePropName="checked" noStyle>
                                  <Switch disabled={!selfUsage} />
                                </Form.Item>
                              </Flex>
                            );
                          }}
                        </Form.Item>

                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("本地用量快捷指令", "Local Usage Command")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("允许在支持的客户端通过 /usage 指令直接返回当前配额", "Allow supported clients to return the current quota with the /usage command.")}
                            </Text>
                          </div>
                          <Form.Item name="allowUsageCommand" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>
                      </Flex>
                    </div>
                  </Col>

                  {/* Right Column in Collapse: 安全与协议特性 */}
                  <Col xs={24} md={12}>
                    <div
                      style={{
                        padding: 14,
                        borderRadius: 8,
                        background: token.colorFillQuaternary,
                        border: `1px solid ${token.colorBorderSecondary}`,
                        marginBottom: 8,
                      }}
                    >
                      <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                        <MaterialIcon name="security" size={16} style={{ color: "#8B5CF6" }} />
                        <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                          {tt("安全与协议特性", "Safety & Performance")}
                        </Text>
                      </Flex>

                      <Flex vertical gap={12}>
                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("免日志审计模式", "No-Log Mode")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("不记录请求 Payload 与 Prompt，适用于极端隐私场景", "Do not record request payloads or prompts; suitable for highly private workloads.")}
                            </Text>
                          </div>
                          <Form.Item name="noLog" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>

                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("压缩加速传输", "Compression")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("为该密钥开启请求与响应的 Gzip/Brotli 压缩传输", "Enable Gzip/Brotli compression for this key's requests and responses.")}
                            </Text>
                          </div>
                          <Form.Item name="compressionEnabled" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>

                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("模型别名自动消歧解析", "Auto-Resolve")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("自动将模糊模型名（如 claude-3-5-sonnet）解析映射至最优可用提供商", "Resolve ambiguous model names, such as claude-3-5-sonnet, to the best available provider.")}
                            </Text>
                          </div>
                          <Form.Item name="autoResolve" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>

                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("禁用非公开私有模型", "Disable Non-Public Models")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("禁止此密钥访问实验性或非公开的私有提供商模型", "Prevent this key from accessing experimental or non-public provider models.")}
                            </Text>
                          </div>
                          <Form.Item name="disableNonPublicModels" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>

                        <Flex align="center" justify="space-between">
                          <div style={{ paddingRight: 12 }}>
                            <Text style={{ fontSize: 12 }}>{tt("混沌工程测试模式", "Chaos Mode")}</Text>
                            <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                              {tt("随机注入故障与模拟网络延迟，用于容灾弹性验证", "Inject simulated failures and network latency for resilience testing.")}
                            </Text>
                          </div>
                          <Form.Item name="chaosModeEnabled" valuePropName="checked" noStyle>
                            <Switch />
                          </Form.Item>
                        </Flex>
                      </Flex>
                    </div>
                  </Col>
                </Row>
              ),
            }]}
          />
        </Form>
      </Modal>
    </Flex>
  );
}
