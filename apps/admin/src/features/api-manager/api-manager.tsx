import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
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
import { keysApi, type ApiKeyView, type ApiKeyCreateInput } from "@/entities/api";
import { MaterialIcon } from "@/app/nav";
import dayjs from "dayjs";

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
        if (!matchesName && !matchesKey && !matchesMachine) return false;
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

  const copyToClipboard = (text: string, tip = "已复制到剪贴板") => {
    navigator.clipboard.writeText(text);
    message.success(tip);
  };

  const openEditModal = (k: ApiKeyView) => {
    setEditTarget(k);
    const scopes = k.scopes ?? [];
    editForm.setFieldsValue({
      name: k.name,
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
      modelAccessMode: k.modelAccessMode || "all",
      allowedModels: (k.allowedModels ?? []).join(", "),
      blockedModels: (k.blockedModels ?? []).join(", "),
      maxSessions: k.maxSessions ?? null,
      throttleDelayMs: k.throttleDelayMs ?? null,
      usageLimitEnabled: Boolean(k.usageLimitEnabled),
      dailyUsageLimitUsd: k.dailyUsageLimitUsd ?? null,
      weeklyUsageLimitUsd: k.weeklyUsageLimitUsd ?? null,
    });
  };

  const columns = [
    {
      title: "密钥名称与归属",
      key: "name",
      width: 200,
      render: (_: unknown, k: ApiKeyView) => (
        <Flex vertical gap={2}>
          <Space size={6}>
            <MaterialIcon
              name="vpn_key"
              size={16}
              style={{ color: isKeyActive(k) ? token.colorPrimary : token.colorTextQuaternary }}
            />
            <Text strong style={{ fontSize: 13 }}>
              {k.name}
            </Text>
          </Space>
          {k.machineId && (
            <Text type="secondary" style={{ fontSize: 11, marginLeft: 22 }}>
              设备: {k.machineId.slice(0, 10)}
            </Text>
          )}
          {k.createdAt && (
            <Text type="secondary" style={{ fontSize: 10, marginLeft: 22 }}>
              创建于 {dayjs(k.createdAt).format("YYYY-MM-DD HH:mm")}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: "密钥令牌",
      key: "key",
      width: 240,
      render: (_: unknown, k: ApiKeyView) => {
        const isShown = visibleKeys.has(k.id) && revealed[k.id];
        const displayValue = isShown ? revealed[k.id] : k.key;
        return (
          <Space size={6} align="center">
            <span className={styles.keyText}>
              {isShown ? displayValue : maskKeyClient(displayValue)}
            </span>
            {allowReveal && (
              <Tooltip title={isShown ? "隐藏明文" : "显示完整明文"}>
                <Button
                  type="text"
                  size="small"
                  icon={<MaterialIcon name={isShown ? "visibility_off" : "visibility"} size={14} />}
                  onClick={() => void revealKey(k)}
                />
              </Tooltip>
            )}
            <Tooltip title="复制密钥">
              <Button
                type="text"
                size="small"
                icon={<MaterialIcon name="content_copy" size={14} />}
                onClick={() => copyToClipboard(revealed[k.id] ?? (k.key ?? ""))}
              />
            </Tooltip>
          </Space>
        );
      },
    },
    {
      title: "权限与安全特性",
      key: "permissions",
      render: (_: unknown, k: ApiKeyView) => {
        const scopes = k.scopes ?? [];
        return (
          <Space wrap size={[4, 4]}>
            {scopes.includes("manage") && <Tag color="magenta">管理访问</Tag>}
            {k.noLog && <Tag color="purple">免日志审计</Tag>}
            {k.autoResolve && <Tag color="blue">自动解析</Tag>}
            {k.compressionEnabled && <Tag color="cyan">压缩加速</Tag>}
            {k.chaosModeEnabled && <Tag color="volcano">混沌测试</Tag>}
            {k.usageLimitEnabled && <Tag color="green">额度限制</Tag>}
            {!scopes.includes("manage") && !k.noLog && !k.autoResolve && !k.compressionEnabled && (
              <Tag color="default">标准推理</Tag>
            )}
          </Space>
        );
      },
    },
    {
      title: "用量与消耗",
      key: "usage",
      width: 140,
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
                次请求
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
              {lastUsed ? `最后活跃: ${dayjs(lastUsed).format("MM-DD HH:mm")}` : "从未调用"}
            </Text>
            {k.usageLimitEnabled && (k.dailyUsageLimitUsd || k.weeklyUsageLimitUsd) && (
              <Tag color="cyan" style={{ fontSize: 10, margin: "2px 0 0", width: "fit-content" }}>
                限额: ${k.dailyUsageLimitUsd || k.weeklyUsageLimitUsd}/日
              </Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: "模型范围",
      key: "models",
      width: 140,
      render: (_: unknown, k: ApiKeyView) => {
        if (k.modelAccessMode === "custom" && k.allowedModels?.length) {
          return (
            <Tooltip title={k.allowedModels.join(", ")}>
              <Tag color="geekblue" style={{ cursor: "pointer" }}>
                限定 {k.allowedModels.length} 个模型
              </Tag>
            </Tooltip>
          );
        }
        if (k.modelAccessMode === "blacklist" && k.blockedModels?.length) {
          return (
            <Tooltip title={k.blockedModels.join(", ")}>
              <Tag color="orange" style={{ cursor: "pointer" }}>
                排除 {k.blockedModels.length} 个模型
              </Tag>
            </Tooltip>
          );
        }
        return <Tag color="default">全部模型 (All)</Tag>;
      },
    },
    {
      title: "有效期与状态",
      key: "status",
      width: 160,
      render: (_: unknown, k: ApiKeyView) => {
        const isExpired = k.expiresAt && new Date(k.expiresAt).getTime() < Date.now();
        const active = isKeyActive(k);

        return (
          <Flex vertical gap={4}>
            <Space size={6}>
              <Switch
                size="small"
                checked={k.isActive !== false && !k.isBanned}
                disabled={k.isBanned === true}
                onChange={(checked) => {
                  updateMutation.mutate({ id: k.id, patch: { isActive: checked } });
                }}
              />
              <Tag color={k.isBanned ? "error" : isExpired ? "warning" : active ? "success" : "default"}>
                {k.isBanned ? "已封禁" : isExpired ? "已过期" : active ? "正常" : "已停用"}
              </Tag>
            </Space>
            <Text type="secondary" style={{ fontSize: 10 }}>
              {k.expiresAt ? `到期: ${dayjs(k.expiresAt).format("YYYY-MM-DD")}` : "永久有效"}
            </Text>
          </Flex>
        );
      },
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
      render: (_: unknown, k: ApiKeyView) => (
        <Space size={2}>
          <Tooltip title={`查看 ${k.name} 的用量分析 (Analytics)`}>
            <Button
              type="text"
              size="small"
              icon={<MaterialIcon name="payments" size={15} style={{ color: "#10B981" }} />}
              onClick={() =>
                navigate(`/dashboard/analytics?range=all&apiKeyIds=${encodeURIComponent(k.id)}&groupBy=model`)
              }
            />
          </Tooltip>
          <Tooltip title="编辑权限与属性">
            <Button
              type="text"
              size="small"
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
                size="small"
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
                size="small"
                danger
                icon={<MaterialIcon name="delete" size={15} />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      {/* Header */}
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <Title level={2} style={{ margin: 0, fontSize: 20 }}>
            API 密钥管理
          </Title>
          <Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
            创建与分发大模型客户端访问令牌，配置细粒度模型白名单、并发限流、免日志审计与额度消耗控制
          </Paragraph>
        </div>

        <Space wrap>
          <Button icon={<MaterialIcon name="refresh" size={14} />} onClick={invalidate}>
            刷新
          </Button>
          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={14} />}
            onClick={() => setAddModalOpen(true)}
            style={{ background: "#8B5CF6", borderColor: "#8B5CF6" }}
          >
            新建 API 密钥
          </Button>
        </Space>
      </Flex>

      {/* KPI Top 4 Blocks */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              密钥总量
            </Text>
            <Title level={3} style={{ margin: "4px 0 0" }}>
              {metrics.total}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              系统已发放访问凭据
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              活跃中密钥
            </Text>
            <Title level={3} style={{ margin: "4px 0 0", color: "#10B981" }}>
              {metrics.active}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              占总量 {metrics.total > 0 ? Math.round((metrics.active / metrics.total) * 100) : 100}%
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              免日志模式
            </Text>
            <Title level={3} style={{ margin: "4px 0 0", color: "#8B5CF6" }}>
              {metrics.noLog}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              高隐私脱敏密钥数
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
              已过期 / 封禁
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
              封禁 {metrics.banned} · 过期 {metrics.expired}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Filter Bar */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <Space size={8} wrap>
            <Input
              placeholder="搜索密钥名称、前缀或设备..."
              prefix={<MaterialIcon name="search" size={16} />}
              allowClear
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            <Select
              value={featureFilter}
              onChange={setFeatureFilter}
              style={{ width: 140 }}
              options={[
                { label: "全部特性", value: "all" },
                { label: "管理访问", value: "manage" },
                { label: "免日志审计", value: "noLog" },
                { label: "额度限制", value: "quota" },
                { label: "混沌测试", value: "chaos" },
              ]}
            />
          </Space>

          <Segmented
            value={statusFilter}
            onChange={(val) => setStatusFilter(val as never)}
            options={[
              { label: "全部", value: "all" },
              { label: "活跃", value: "active" },
              { label: "已停用", value: "disabled" },
              { label: "已过期", value: "expired" },
              { label: "已封禁", value: "banned" },
            ]}
          />
        </Flex>
      </Card>

      {/* Table */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Table
          dataSource={filteredKeys}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 15, showTotal: (t) => `共 ${t} 个密钥` }}
          loading={keysQuery.isLoading}
          size="middle"
          locale={{ emptyText: "暂无匹配的 API 密钥" }}
        />
      </Card>

      {/* Create Modal */}
      <Modal
        open={addModalOpen}
        onCancel={() => setAddModalOpen(false)}
        title="新建 API 密钥"
        width={580}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        okText="确认创建"
        cancelText="取消"
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
              scopes,
              noLog: Boolean(values.noLog),
              allowUsageCommand: Boolean(values.allowUsageCommand),
              compressionEnabled: Boolean(values.compressionEnabled),
            };
            createMutation.mutate(payload);
          }}
          style={{ marginTop: 16 }}
        >
          {/* Key Name */}
          <Form.Item
            name="name"
            label={<Text strong>密钥名称 / 标识</Text>}
            rules={[{ required: true, message: "请输入密钥名称" }]}
            extra="用于识别该密钥用途的唯一标识名称（例如：我的应用、开发测试、Cursor 专用等）"
          >
            <Input placeholder="例如: 生产网关客户端 / Cursor 专用" maxLength={200} autoFocus />
          </Form.Item>

          {/* Management Access */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
              marginBottom: 16,
            }}
          >
            <Flex align="center" justify="space-between">
              <div>
                <Flex align="center" gap={6}>
                  <MaterialIcon name="admin_panel_settings" size={16} style={{ color: "#F43F5E" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    管理访问权限 (Management Access)
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                  允许此密钥访问管理控制台与系统配置接口（建议仅限管理员使用）
                </Text>
              </div>
              <Form.Item name="manageEnabled" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Flex>
          </div>

          {/* Self-Service & Usage Visibility */}
          <div
            style={{
              padding: 12,
              borderRadius: 8,
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
              marginBottom: 16,
            }}
          >
            <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
              <MaterialIcon name="query_stats" size={16} style={{ color: "#10B981" }} />
              <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                自助服务与用量可见性 (Self-Service Visibility)
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 12 }}>
              控制客户端使用此 Key 时能够直接查询的用量与配额范围：
            </Text>

            <Flex vertical gap={12}>
              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>自身用量可见性 (Own Usage Visibility)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    允许持有者查询该密钥自身的用量统计和消耗明细
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
                        <Text style={{ fontSize: 12 }}>共享账户额度可见性 (Shared Account Quota)</Text>
                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                          允许此密钥查询账户剩余总额度（依赖自身用量可见性）
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
                  <Text style={{ fontSize: 12 }}>本地用量快捷指令 (Local Usage Command)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    允许在支持的客户端通过 /usage 指令直接返回当前配额
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
              padding: 12,
              borderRadius: 8,
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
              <MaterialIcon name="security" size={16} style={{ color: "#8B5CF6" }} />
              <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                安全与性能特性 (Safety & Performance)
              </Text>
            </Flex>

            <Flex vertical gap={12}>
              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>免日志审计模式 (No-Log Mode)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    不记录请求 Payload 与 Prompt，适用于极端隐私场景
                  </Text>
                </div>
                <Form.Item name="noLog" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>

              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>压缩加速传输 (Compression)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    为该密钥开启请求与响应的 Gzip/Brotli 压缩传输
                  </Text>
                </div>
                <Form.Item name="compressionEnabled" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>
            </Flex>
          </div>
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
                  size="small"
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
{`curl http://localhost:20128/v1/chat/completions \\
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
        title={`编辑密钥权限与配置 · ${editTarget?.name || ""}`}
        width={680}
        onOk={() => editForm.submit()}
        confirmLoading={updateMutation.isPending}
        okText="保存更改"
        cancelText="取消"
        styles={{ body: { maxHeight: "calc(82vh - 120px)", overflowY: "auto", paddingRight: 6 } }}
      >
        <Form
          form={editForm}
          layout="vertical"
          onFinish={(values) => {
            if (!editTarget?.id) return;
            const scopes: string[] = [];
            if (values.manageEnabled) scopes.push("manage");
            if (values.selfUsageEnabled !== false) scopes.push("read:usage");
            if (values.selfUsageEnabled && values.selfAccountQuotaEnabled)
              scopes.push("read:account_quota");

            const patch: Record<string, unknown> = {
              name: values.name.trim(),
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
              modelAccessMode: values.modelAccessMode,
              allowedModels: values.allowedModels
                ? values.allowedModels.split(",").map((s: string) => s.trim()).filter(Boolean)
                : [],
              blockedModels: values.blockedModels
                ? values.blockedModels.split(",").map((s: string) => s.trim()).filter(Boolean)
                : [],
              maxSessions: values.maxSessions ?? null,
              throttleDelayMs: values.throttleDelayMs ?? null,
              usageLimitEnabled: Boolean(values.usageLimitEnabled),
              dailyUsageLimitUsd: values.dailyUsageLimitUsd ?? null,
              weeklyUsageLimitUsd: values.weeklyUsageLimitUsd ?? null,
            };
            updateMutation.mutate({ id: editTarget.id, patch });
          }}
          style={{ marginTop: 12 }}
        >
          {/* Card 1: 密钥基本信息与生命周期 */}
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
                基本标识与生命周期 (Identity & Lifecycle)
              </Text>
            </Flex>

            <Form.Item
              name="name"
              label={<Text style={{ fontSize: 12 }}>密钥名称 / 标识</Text>}
              rules={[{ required: true, message: "请输入密钥名称" }]}
              style={{ marginBottom: 12 }}
            >
              <Input placeholder="例如: 生产网关客户端" maxLength={200} />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="expiresAt"
                  label={<Text style={{ fontSize: 12 }}>有效期截止时间 (留空为永久有效)</Text>}
                  style={{ marginBottom: 8 }}
                >
                  <DatePicker showTime style={{ width: "100%" }} placeholder="永久有效" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Flex align="center" justify="space-between" style={{ height: "100%", paddingTop: 8 }}>
                  <div>
                    <Text style={{ fontSize: 12, display: "block" }}>启用状态</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>正常提供推理服务</Text>
                  </div>
                  <Form.Item name="isActive" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Col>
              <Col span={6}>
                <Flex align="center" justify="space-between" style={{ height: "100%", paddingTop: 8 }}>
                  <div>
                    <Text style={{ fontSize: 12, display: "block", color: "#EF4444" }}>紧急封禁</Text>
                    <Text type="secondary" style={{ fontSize: 10 }}>立即阻断调用</Text>
                  </div>
                  <Form.Item name="isBanned" valuePropName="checked" noStyle>
                    <Switch />
                  </Form.Item>
                </Flex>
              </Col>
            </Row>
          </div>

          {/* Card 2: 管理访问权限 */}
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
              <div>
                <Flex align="center" gap={6}>
                  <MaterialIcon name="admin_panel_settings" size={16} style={{ color: "#F43F5E" }} />
                  <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                    管理访问权限 (Management Access)
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 4 }}>
                  允许此密钥访问管理控制台与系统配置接口（建议仅限管理员使用）
                </Text>
              </div>
              <Form.Item name="manageEnabled" valuePropName="checked" noStyle>
                <Switch />
              </Form.Item>
            </Flex>
          </div>

          {/* Card 3: 自助服务与用量可见性 */}
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
                自助服务与用量可见性 (Self-Service Visibility)
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 12 }}>
              控制客户端使用此 Key 时能够直接查询的用量统计与消费上限：
            </Text>

            <Flex vertical gap={12}>
              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>自身用量可见性 (Own Usage Visibility)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    允许持有者查询该密钥自身的用量统计和消耗明细
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
                        <Text style={{ fontSize: 12 }}>共享账户额度可见性 (Shared Account Quota)</Text>
                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                          允许此密钥查询账户剩余总额度（依赖自身用量可见性）
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
                  <Text style={{ fontSize: 12 }}>本地用量快捷指令 (Local Usage Command)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    允许在支持的客户端通过 /usage 指令直接返回当前配额
                  </Text>
                </div>
                <Form.Item name="allowUsageCommand" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>

              <div style={{ borderTop: `1px dashed ${token.colorBorderSecondary}`, paddingTop: 10 }}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                  <div>
                    <Text style={{ fontSize: 12 }}>USD 消费额度硬限制 (Usage Limits)</Text>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                      达到消费上限后自动暂停该密钥的计费推理请求
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
                      <Row gutter={16} style={{ marginTop: 8 }}>
                        <Col span={12}>
                          <Form.Item
                            name="dailyUsageLimitUsd"
                            label={<Text style={{ fontSize: 11 }}>每日用量上限 ($)</Text>}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber min={0.01} precision={2} style={{ width: "100%" }} placeholder="留空无限制" />
                          </Form.Item>
                        </Col>
                        <Col span={12}>
                          <Form.Item
                            name="weeklyUsageLimitUsd"
                            label={<Text style={{ fontSize: 11 }}>每周用量上限 ($)</Text>}
                            style={{ marginBottom: 0 }}
                          >
                            <InputNumber min={0.01} precision={2} style={{ width: "100%" }} placeholder="留空无限制" />
                          </Form.Item>
                        </Col>
                      </Row>
                    );
                  }}
                </Form.Item>
              </div>
            </Flex>
          </div>

          {/* Card 4: 模型访问控制 */}
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
                模型访问控制 (Model Access Control)
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 12 }}>
              配置该 API 密钥允许调用的模型范围与黑白名单：
            </Text>

            <Form.Item name="modelAccessMode" style={{ marginBottom: 12 }}>
              <Radio.Group style={{ width: "100%" }}>
                <Radio.Button value="all" style={{ width: "33.3%", textAlign: "center" }}>
                  允许全部模型
                </Radio.Button>
                <Radio.Button value="custom" style={{ width: "33.3%", textAlign: "center" }}>
                  白名单限定
                </Radio.Button>
                <Radio.Button value="blacklist" style={{ width: "33.4%", textAlign: "center" }}>
                  黑名单排除
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
                      label={<Text style={{ fontSize: 12 }}>白名单模型 (逗号分隔，支持通配符如 claude-*, gpt-4o*)</Text>}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="例如: gpt-4o, claude-3-7-sonnet, deepseek/*" />
                    </Form.Item>
                  );
                }
                if (mode === "blacklist") {
                  return (
                    <Form.Item
                      name="blockedModels"
                      label={<Text style={{ fontSize: 12 }}>黑名单排除模型 (逗号分隔)</Text>}
                      style={{ marginBottom: 0 }}
                    >
                      <Input placeholder="例如: o1-pro, gemini-ultra" />
                    </Form.Item>
                  );
                }
                return null;
              }}
            </Form.Item>
          </div>

          {/* Card 5: 安全与性能特性 */}
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
                安全与协议特性 (Safety & Performance)
              </Text>
            </Flex>

            <Flex vertical gap={12}>
              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>免日志审计模式 (No-Log Mode)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    不记录请求 Payload 与 Prompt，适用于极端隐私场景
                  </Text>
                </div>
                <Form.Item name="noLog" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>

              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>压缩加速传输 (Compression)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    为该密钥开启请求与响应的 Gzip/Brotli 压缩传输
                  </Text>
                </div>
                <Form.Item name="compressionEnabled" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>

              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>模型别名自动消歧解析 (Auto-Resolve)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    自动将模糊模型名（如 claude-3-5-sonnet）解析映射至最优可用提供商
                  </Text>
                </div>
                <Form.Item name="autoResolve" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>

              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>禁用非公开私有模型 (Disable Non-Public Models)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    禁止此密钥访问实验性或非公开的私有提供商模型
                  </Text>
                </div>
                <Form.Item name="disableNonPublicModels" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>

              <Flex align="center" justify="space-between">
                <div>
                  <Text style={{ fontSize: 12 }}>混沌工程测试模式 (Chaos Mode)</Text>
                  <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                    随机注入故障与模拟网络延迟，用于容灾弹性验证
                  </Text>
                </div>
                <Form.Item name="chaosModeEnabled" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>
            </Flex>
          </div>

          {/* Card 6: 流量并发与节流 */}
          <div
            style={{
              padding: 14,
              borderRadius: 8,
              background: token.colorFillQuaternary,
              border: `1px solid ${token.colorBorderSecondary}`,
            }}
          >
            <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
              <MaterialIcon name="speed" size={16} style={{ color: "#F59E0B" }} />
              <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                流量并发与节流限制 (Traffic & Concurrency)
              </Text>
            </Flex>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="maxSessions"
                  label={<Text style={{ fontSize: 12 }}>最大并发会话数</Text>}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber min={1} max={10000} style={{ width: "100%" }} placeholder="无限制" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="throttleDelayMs"
                  label={<Text style={{ fontSize: 12 }}>请求软延迟延时 (ms)</Text>}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber min={0} max={300000} step={100} style={{ width: "100%" }} placeholder="0" />
                </Form.Item>
              </Col>
            </Row>
          </div>
        </Form>
      </Modal>
    </Flex>
  );
}
