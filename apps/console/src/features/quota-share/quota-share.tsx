import { useState, useMemo } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  quotaApi,
  keysApi,
  providersApi,
  type QuotaPoolItem,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text, Paragraph } = Typography;

// ── Palette for Key Allocations ──────────────────────────────────────────────

const SLICE_PALETTE = [
  "#a78bfa",
  "#60a5fa",
  "#34d399",
  "#fbbf24",
  "#f87171",
  "#22d3ee",
  "#f472b6",
  "#94a3b8",
];

// ── Styles ───────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
  },
  statCard: {
    borderRadius: 10,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    padding: "12px 16px",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
      transform: "translateY(-1px)",
      boxShadow: token.boxShadowSecondary,
    },
  },
  groupBar: {
    borderRadius: 10,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    padding: "8px 16px",
  },
  conceptCard: {
    borderRadius: 12,
    border: `1px solid rgba(6, 182, 212, 0.25)`,
    background: `linear-gradient(135deg, rgba(6, 182, 212, 0.05) 0%, rgba(99, 102, 241, 0.04) 100%)`,
  },
  conceptItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    padding: "8px 12px",
    background: "rgba(255,255,255,0.04)",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  endpointsCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  poolCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
      boxShadow: token.boxShadowSecondary,
    },
  },
  dimensionBar: {
    display: "flex",
    flexDirection: "column",
    gap: 4,
    minWidth: 0,
  },
}));

// ── Components ───────────────────────────────────────────────────────────────

// 1. Concept Explainer Card
function QuotaConceptCard() {
  const { styles } = useStyles();
  const [expanded, setExpanded] = useState(false);

  return (
    <Card
      className={styles.conceptCard}
      styles={{ body: { padding: "14px 18px" } }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          cursor: "pointer",
          userSelect: "none",
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Flex align="center" gap={8}>
          <MaterialIcon name="info" size={20} style={{ color: "#06B6D4" }} />
          <Text strong style={{ fontSize: 14 }}>
            配额共享工作原理与借用机制 (Quota Sharing & Fair-Share Borrowing)
          </Text>
        </Flex>
        <MaterialIcon
          name={expanded ? "expand_less" : "expand_more"}
          size={20}
          style={{ color: "rgba(255,255,255,0.5)" }}
        />
      </div>

      {expanded && (
        <div style={{ marginTop: 14 }}>
          <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 12 }}>
            配额共享 (Quota Share) 允许将一个或多个上游账号的总配额容量聚合为一个虚拟配额池，并在多个下游 API Key 之间按权重进行弹性分配。当某些 Key 空闲时，高并发 Key 可动态借用多余额度，极大提升集群吞吐利用率。
          </Paragraph>

          <Row gutter={[12, 12]}>
            <Col xs={24} sm={12} md={8}>
              <div className={styles.conceptItem}>
                <MaterialIcon name="balance" size={16} style={{ color: "#06B6D4", marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: "block" }}>公平份额 (Fair Share)</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>按权重为各 Key 划分基准保证额度</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className={styles.conceptItem}>
                <MaterialIcon name="trending_up" size={16} style={{ color: "#22C55E", marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: "block" }}>动态借用 (Borrowing)</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>空闲配额自动出借给高并发 Key 削峰</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className={styles.conceptItem}>
                <MaterialIcon name="lock" size={16} style={{ color: "#F59E0B", marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: "block" }}>全局硬上限 (Global Cap)</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>总消耗永不超过上游实际总配额</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className={styles.conceptItem}>
                <MaterialIcon name="schedule" size={16} style={{ color: "#8B5CF6", marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: "block" }}>滑动周期窗口 (Windows)</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>RPM/TPM (分钟) 与 RPD/TPD (天级) 独立重置</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className={styles.conceptItem}>
                <MaterialIcon name="vpn_key" size={16} style={{ color: "#EC4899", marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: "block" }}>API Key 授权与透明路由</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>调用前缀映射，客户端无需感知多账号</Text>
                </div>
              </div>
            </Col>
            <Col xs={24} sm={12} md={8}>
              <div className={styles.conceptItem}>
                <MaterialIcon name="block" size={16} style={{ color: "#EF4444", marginTop: 2 }} />
                <div>
                  <Text strong style={{ fontSize: 12, display: "block" }}>独占配额池保护 (Exclusive)</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>可限制仅白名单 Key 能够访问专属配额池</Text>
                </div>
              </div>
            </Col>
          </Row>
        </div>
      )}
    </Card>
  );
}

// 2. Available Endpoints Card (matching Orbit's QuotaEndpointsCard)
function QuotaEndpointsCard({
  groups,
  pools,
  apiKeys,
}: {
  groups: Array<{ id: string; name: string }>;
  pools: QuotaPoolItem[];
  apiKeys: Array<{ id: string; name?: string }>;
}) {
  const { styles } = useStyles();
  const [selectedKeyId, setSelectedKeyId] = useState<string>("");
  const [previewModels, setPreviewModels] = useState<string[] | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  const handleKeyChange = async (keyId: string) => {
    setSelectedKeyId(keyId);
    if (!keyId) {
      setPreviewModels(null);
      return;
    }
    setLoadingPreview(true);
    try {
      const models = await quotaApi.getKeyModels(keyId);
      setPreviewModels(models);
    } catch {
      setPreviewModels([]);
    } finally {
      setLoadingPreview(false);
    }
  };

  // Without a selected key the server cannot know which virtual models are
  // visible. Show only persisted pool metadata here; the authoritative model
  // list is loaded above through /quota/keys/:id/models.
  const poolsByGroup = useMemo(() => {
    return groups.map((group) => ({
      group,
      pools: pools.filter((pool) => pool.groupId === group.id || pool.groupId === group.name),
    }));
  }, [groups, pools]);

  return (
    <Card className={styles.endpointsCard} styles={{ body: { padding: "14px 18px" } }}>
      {/* Header row */}
      <Flex justify="space-between" align="center" wrap gap={10}>
        <Flex align="center" gap={8}>
          <MaterialIcon name="api" size={20} style={{ color: "#10B981" }} />
          <div>
            <Flex align="center" gap={6}>
              <Text strong style={{ fontSize: 14 }}>
                可用端点 (Available Endpoints)
              </Text>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11 }}>
              配额模型遵循标准 OpenAI/Anthropic 接口规范，模型名格式为 qtSd/&lt;分组&gt;/&lt;提供商&gt;/&lt;模型&gt;
            </Text>
          </div>
        </Flex>

        <Flex align="center" gap={8}>
          {apiKeys.length > 0 && (
            <Select
              value={selectedKeyId}
              onChange={handleKeyChange}
              placeholder="按 API Key 预览可用模型"
              style={{ minWidth: 200 }}
              allowClear
              options={[
                { label: "全部模型 (公共预览)", value: "" },
                ...apiKeys.map((k) => ({
                  label: `Key: ${k.name || k.id.slice(0, 10)}`,
                  value: k.id,
                })),
              ]}
            />
          )}
          <Button
            type="text"
            size="small"
            icon={<MaterialIcon name={collapsed ? "expand_more" : "expand_less"} size={18} />}
            onClick={() => setCollapsed(!collapsed)}
          />
        </Flex>
      </Flex>

      {!collapsed && (
        <div style={{ marginTop: 12 }}>
          {/* Base URL Lines */}
          <div
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: 6,
              marginBottom: 12,
            }}
          >
            <Flex align="center" gap={8} wrap style={{ fontSize: 12 }}>
              <Tag color="cyan" style={{ fontSize: 10, margin: 0, fontWeight: 700 }}>
                BASE URL
              </Tag>
              <code style={{ color: "#10B981", fontFamily: "monospace" }}>
                POST /v1/chat/completions
              </code>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
              <code style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                model: &quot;qtSd/&lt;group&gt;/&lt;provider&gt;/&lt;model&gt;&quot;
              </code>
            </Flex>
            <Flex align="center" gap={8} wrap style={{ fontSize: 12 }}>
              <Tag color="purple" style={{ fontSize: 10, margin: 0, fontWeight: 700 }}>
                MESSAGES
              </Tag>
              <code style={{ color: "#8B5CF6", fontFamily: "monospace" }}>
                POST /v1/messages
              </code>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
              <code style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                model: &quot;qtSd/&lt;group&gt;/anthropic/&lt;model&gt;&quot;
              </code>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                (Anthropic 原生客户端)
              </span>
            </Flex>
            <Flex align="center" gap={8} wrap style={{ fontSize: 12 }}>
              <Tag color="blue" style={{ fontSize: 10, margin: 0, fontWeight: 700 }}>
                RESPONSES
              </Tag>
              <code style={{ color: "#3B82F6", fontFamily: "monospace" }}>
                POST /v1/responses
              </code>
              <span style={{ color: "rgba(255,255,255,0.4)" }}>·</span>
              <code style={{ color: "rgba(255,255,255,0.6)", fontFamily: "monospace" }}>
                WS /v1/responses
              </code>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.45)" }}>
                (Codex 与 WebSocket 流式支持)
              </span>
            </Flex>
          </div>

          {/* Model listing */}
          <div>
            {loadingPreview ? (
              <div style={{ padding: "12px 0", color: "rgba(255,255,255,0.45)", fontSize: 12 }}>
                正在加载授权模型列表...
              </div>
            ) : previewModels !== null ? (
              <div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 6 }}>
                  当前 API Key 授权可用的配额模型 ({previewModels.length} 个):
                </div>
                {previewModels.length === 0 ? (
                  <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", fontStyle: "italic" }}>
                    该 API Key 尚未分配任何配额池权限
                  </div>
                ) : (
                  <Flex wrap gap={6}>
                    {previewModels.map((m) => (
                      <code
                        key={m}
                        style={{
                          fontSize: 11,
                          fontFamily: "monospace",
                          padding: "2px 8px",
                          borderRadius: 4,
                          background: "rgba(255,255,255,0.06)",
                          border: "1px solid rgba(255,255,255,0.1)",
                          color: "#fff",
                        }}
                      >
                        {m}
                      </code>
                    ))}
                  </Flex>
                )}
              </div>
            ) : (
              /* Default view grouped by group */
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {poolsByGroup.map(({ group, pools: groupPools }) => (
                  <div key={group.id}>
                    <Flex align="center" gap={6} style={{ marginBottom: 6 }}>
                      <MaterialIcon name="folder" size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
                      <span
                        style={{
                          fontSize: 11,
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "rgba(255,255,255,0.6)",
                        }}
                      >
                        {group.name}
                      </span>
                    </Flex>
                    <div style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6 }}>
                      {groupPools.length === 0 ? (
                        <Text type="secondary" style={{ fontSize: 12 }}>该分组暂无已配置配额池</Text>
                      ) : groupPools.map((pool) => (
                        <Flex key={pool.id} align="center" gap={8} wrap>
                          <code style={{ fontSize: 11, fontFamily: "monospace" }}>{pool.name}</code>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {pool.allocations.length} 个 API Key · {pool.connectionIds.length} 个上游账号
                          </Text>
                        </Flex>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

// 3. Stacked Allocation Bar
function StackedAllocationBar({
  allocations,
  keyLabels,
}: {
  allocations: Array<{ apiKeyId: string; weight: number; borrowing?: boolean }>;
  keyLabels: Record<string, string>;
}) {
  if (!allocations || allocations.length === 0) return null;

  return (
    <div style={{ marginBottom: 12 }}>
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          color: "rgba(255,255,255,0.45)",
          marginBottom: 6,
        }}
      >
        配额分配占比 (Allocations Distribution)
      </div>

      {/* Bar */}
      <div
        style={{
          display: "flex",
          height: 10,
          borderRadius: 6,
          overflow: "hidden",
          width: "100%",
          marginBottom: 8,
        }}
      >
        {allocations.map((alloc, i) => {
          const color = SLICE_PALETTE[i % SLICE_PALETTE.length];
          const label = keyLabels[alloc.apiKeyId] || alloc.apiKeyId.slice(0, 8);
          return (
            <Tooltip key={alloc.apiKeyId} title={`${label}: ${alloc.weight}% (已保障份额)`}>
              <div style={{ width: `${alloc.weight}%`, backgroundColor: color }} />
            </Tooltip>
          );
        })}
      </div>

      {/* Tags legend */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "6px 12px" }}>
        {allocations.map((alloc, i) => {
          const color = SLICE_PALETTE[i % SLICE_PALETTE.length];
          const label = keyLabels[alloc.apiKeyId] || alloc.apiKeyId.slice(0, 8);
          return (
            <Flex key={alloc.apiKeyId} align="center" gap={4}>
              <span
                style={{
                  display: "inline-block",
                  width: 8,
                  height: 8,
                  borderRadius: 2,
                  backgroundColor: color,
                }}
              />
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.65)" }}>
                {label} ({alloc.weight}%)
              </span>
              {alloc.borrowing && (
                <Tag color="warning" style={{ fontSize: 9, margin: 0, padding: "0 3px" }}>
                  借用中
                </Tag>
              )}
            </Flex>
          );
        })}
      </div>
    </div>
  );
}

// 4. Allocation Table inside Card
function AllocationTable({
  allocations,
  keyLabels,
}: {
  allocations: Array<{ apiKeyId: string; weight: number; borrowing?: boolean; consumed?: number }>;
  keyLabels: Record<string, string>;
}) {
  const columns = [
    {
      title: "API 密钥",
      dataIndex: "apiKeyId",
      key: "apiKeyId",
      render: (id: string, record: any, idx: number) => {
        const color = SLICE_PALETTE[idx % SLICE_PALETTE.length];
        const label = keyLabels[id] || id.slice(0, 10);
        return (
          <Flex align="center" gap={6}>
            <span
              style={{
                display: "inline-block",
                width: 8,
                height: 8,
                borderRadius: 2,
                backgroundColor: color,
              }}
            />
            <span style={{ fontFamily: "monospace", fontSize: 12, fontWeight: 500 }}>
              {label}
            </span>
            {record.borrowing && (
              <Tag color="warning" style={{ fontSize: 9, padding: "0 3px", margin: 0 }}>
                借用中
              </Tag>
            )}
          </Flex>
        );
      },
    },
    {
      title: "保证份额",
      dataIndex: "weight",
      key: "weight",
      align: "right" as const,
      render: (w: number) => <span style={{ fontWeight: 700, fontFamily: "monospace" }}>{w}%</span>,
    },
    {
      title: "已消耗 (RPM)",
      dataIndex: "consumed",
      key: "consumed",
      align: "right" as const,
      render: (c: number) => (
        <span style={{ fontFamily: "monospace", color: "rgba(255,255,255,0.65)" }}>
          {c ? c.toLocaleString() : "0"}
        </span>
      ),
    },
    {
      title: "策略",
      key: "policy",
      align: "right" as const,
      render: () => <Tag color="blue" style={{ fontSize: 10, margin: 0 }}>允许动态借用</Tag>,
    },
  ];

  return (
    <Table
      dataSource={allocations.map((a, idx) => ({ ...a, key: a.apiKeyId || idx }))}
      columns={columns}
      pagination={false}
      size="small"
      style={{ marginTop: 8 }}
    />
  );
}

// ── Main QuotaSharePage Component ────────────────────────────────────────────

export function QuotaSharePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  // State
  const [selectedGroupId, setSelectedGroupId] = useState<string>("all");
  const [newGroupInput, setNewGroupInput] = useState("");
  const [showNewGroupInput, setShowNewGroupInput] = useState(false);

  // Pool Wizard Modal
  const [wizardVisible, setWizardVisible] = useState(false);
  const [editingPool, setEditingPool] = useState<QuotaPoolItem | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const [form] = Form.useForm();

  // 1. Fetch Pools
  const poolsQuery = useQuery({
    queryKey: ["quota-pools"],
    queryFn: async () => {
      const res = await quotaApi.listPools();
      return Array.isArray(res) ? res : [];
    },
    staleTime: 30_000,
  });
  const rawPools = poolsQuery.data ?? [];
  const pools = rawPools;

  // 2. Fetch Provider Connections
  const connectionsQuery = useQuery({
    queryKey: ["providers-connections"],
    queryFn: async () => {
      const res = await providersApi.list({ limit: 100 });
      return Array.isArray(res?.connections) ? res.connections : [];
    },
    staleTime: 30_000,
  });
  const connections = connectionsQuery.data ?? [];

  // 3. Fetch API Keys
  const keysQuery = useQuery({
    queryKey: ["api-keys-list"],
    queryFn: async () => {
      const res = await keysApi.list();
      return Array.isArray(res?.keys) ? res.keys : [];
    },
    staleTime: 30_000,
  });
  const apiKeys = keysQuery.data ?? [];
  const keyLabels = useMemo(() => {
    const map: Record<string, string> = {};
    for (const k of apiKeys) {
      if (k.id) map[k.id] = k.name || k.id.slice(0, 12) + "…";
    }
    return map;
  }, [apiKeys]);

  // Groups from server /api/quota/groups
  const groupsQuery = useQuery({
    queryKey: ["quota-groups"],
    queryFn: async () => {
      const list = await quotaApi.listGroups();
      return Array.isArray(list) ? list : [];
    },
    staleTime: 30_000,
  });
  const groups = groupsQuery.data ?? [];
  const allGroups = useMemo(() => {
    const set = new Set<string>();
    for (const g of groups) set.add(g.name || g.id);
    for (const p of pools) set.add(p.groupId || "ungrouped");
    return Array.from(set);
  }, [groups, pools]);

  // KPIs
  const stats = useMemo(() => {
    const activePools = pools.length;
    let totalKeysAllocated = 0;
    for (const p of pools) totalKeysAllocated += p.allocations.length;
    return {
      activePools,
      keysAllocated: totalKeysAllocated,
      avgUtilization: null,
      borrowingNow: null,
    };
  }, [pools]);

  // Filtered Pools
  const filteredPools = useMemo(() => {
    if (selectedGroupId === "all") return pools;
    return pools.filter((p) => (p.groupId || "ungrouped") === selectedGroupId);
  }, [pools, selectedGroupId]);

  // Groups to render in view
  const groupsToRender = useMemo(() => {
    if (selectedGroupId === "all") return allGroups;
    return [selectedGroupId];
  }, [allGroups, selectedGroupId]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (values: { name: string; groupId?: string; connectionIds: string[]; allowedApiKeys?: string[] }) => {
      const connectionIds = Array.isArray(values.connectionIds) ? values.connectionIds : [];
      const apiKeyIds = Array.isArray(values.allowedApiKeys) ? values.allowedApiKeys : [];
      const weight = apiKeyIds.length > 0 ? 100 / apiKeyIds.length : 0;
      const group = groups.find((candidate) => candidate.id === values.groupId || candidate.name === values.groupId);
      const payload = {
        name: values.name,
        groupId: group?.id,
        connectionIds,
        allocations: apiKeyIds.map((apiKeyId) => ({ apiKeyId, weight, policy: "hard" as const })),
      };
      return editingPool
        ? quotaApi.updatePool(editingPool.id, payload)
        : quotaApi.createPool({ connectionId: connectionIds[0] ?? "", ...payload });
    },
    onSuccess: () => {
      messageApi.success("配额池创建成功");
      queryClient.invalidateQueries({ queryKey: ["quota-pools"] });
      setWizardVisible(false);
    },
    onError: (err: any) => {
      messageApi.error(err?.message || "创建配额池失败");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => quotaApi.deletePool(id),
    onSuccess: () => {
      messageApi.success("配额池已删除");
      queryClient.invalidateQueries({ queryKey: ["quota-pools"] });
    },
    onError: (err: any) => {
      messageApi.error(err?.message || "删除配额池失败");
    },
  });

  const createGroupMutation = useMutation({
    mutationFn: (name: string) => quotaApi.createGroup(name),
    onSuccess: () => {
      messageApi.success("分组创建成功");
      queryClient.invalidateQueries({ queryKey: ["quota-groups"] });
    },
  });

  // Group Handlers
  const handleAddGroup = async () => {
    const name = newGroupInput.trim();
    if (!name) return;
    createGroupMutation.mutate(name);
    setSelectedGroupId(name);
    setNewGroupInput("");
    setShowNewGroupInput(false);
  };

  const handleOpenCreateWizard = () => {
    setEditingPool(null);
    setWizardStep(0);
    form.resetFields();
    form.setFieldsValue({
      name: "",
      groupId: selectedGroupId !== "all" ? selectedGroupId : undefined,
      connectionIds: [],
      allowedApiKeys: [],
    });
    setWizardVisible(true);
  };

  const handleOpenEditWizard = (pool: QuotaPoolItem) => {
    setEditingPool(pool);
    setWizardStep(0);
    form.resetFields();
    form.setFieldsValue({
      name: pool.name,
      description: pool.description,
      groupId: pool.groupId,
      connectionIds: pool.connectionIds,
      allowedApiKeys: pool.allocations.map((allocation) => allocation.apiKeyId),
    });
    setWizardVisible(true);
  };

  if (poolsQuery.isLoading && pools.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Header */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10B981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="pie_chart" size={22} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                配额共享 (Quota Share)
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                跨多个 API 密钥公平分配与聚合上游账号配额，支持动态额度借用与并发削峰
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={16} />}
            onClick={handleOpenCreateWizard}
          >
            新建配额池
          </Button>
        </Flex>
      </Card>

      {/* Group Filter Bar */}
      <div className={styles.groupBar}>
        <Flex align="center" justify="space-between" wrap gap={10}>
          <Flex align="center" gap={10}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "rgba(255,255,255,0.45)" }}>
              分组 (GROUP):
            </span>
            <Select
              value={selectedGroupId}
              onChange={setSelectedGroupId}
              style={{ minWidth: 160 }}
              options={[
                { label: "全部分组 (All)", value: "all" },
                ...allGroups.map((g) => ({ label: g, value: g })),
              ]}
            />

            {showNewGroupInput ? (
              <Space size={4}>
                <Input
                  size="small"
                  placeholder="输入分组名称"
                  value={newGroupInput}
                  onChange={(e) => setNewGroupInput(e.target.value)}
                  onPressEnter={handleAddGroup}
                  style={{ minWidth: 150 }}
                  autoFocus
                />
                <Button size="small" type="primary" onClick={handleAddGroup}>
                  确认
                </Button>
                <Button size="small" onClick={() => setShowNewGroupInput(false)}>
                  取消
                </Button>
              </Space>
            ) : (
              <Button
                size="small"
                type="dashed"
                icon={<MaterialIcon name="add" size={13} />}
                onClick={() => setShowNewGroupInput(true)}
              >
                新建分组
              </Button>
            )}
          </Flex>
        </Flex>
      </div>

      {/* Concept Card */}
      <QuotaConceptCard />

      {/* Endpoints Integration Card (Available Endpoints) */}
      <QuotaEndpointsCard groups={groups} pools={pools} apiKeys={apiKeys} />

      {/* KPI Stats Row (4 Stat Cards) */}
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              活跃配额池
            </Text>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
              {stats.activePools}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              已授权密钥数
            </Text>
            <div style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
              {stats.keysAllocated}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              平均使用率
            </Text>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "monospace",
                marginTop: 2,
                color: stats.avgUtilization == null ? "rgba(255,255,255,0.55)" : stats.avgUtilization > 80 ? "#EF4444" : stats.avgUtilization > 50 ? "#F59E0B" : "#10B981",
              }}
            >
              {stats.avgUtilization == null ? "—" : `${stats.avgUtilization}%`}
            </div>
          </div>
        </Col>
        <Col xs={12} sm={6}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5 }}>
              正在借用配额
            </Text>
            <Flex align="center" gap={6} style={{ marginTop: 2 }}>
              <span style={{ fontSize: 24, fontWeight: 700, fontFamily: "monospace", color: "rgba(255,255,255,0.55)" }}>
                {stats.borrowingNow == null ? "—" : stats.borrowingNow}
              </span>
            </Flex>
          </div>
        </Col>
      </Row>

      {/* Pool Lists Grouped Sections */}
      {filteredPools.length === 0 ? (
        <Card className={styles.poolCard} styles={{ body: { padding: 48, textAlign: "center" } }}>
          <Empty description="当前分组暂无配额池，点击右上角「新建配额池」开始创建" />
        </Card>
      ) : (
        groupsToRender.map((groupName) => {
          const groupPools = filteredPools.filter((p) => (p.groupId || "ungrouped") === groupName);
          if (groupPools.length === 0) return null;

          return (
            <div key={groupName} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {/* Group Section Header */}
              <Flex align="center" gap={6}>
                <MaterialIcon name="folder" size={18} style={{ color: "rgba(255,255,255,0.45)" }} />
                <Text strong style={{ fontSize: 14 }}>
                  {groupName}
                </Text>
                <Tag style={{ fontSize: 11, margin: 0 }}>{groupPools.length} 个配额池</Tag>
              </Flex>

              {/* Pool Cards Grid */}
              <Row gutter={[16, 16]}>
                {groupPools.map((pool) => {
                  const allocations = pool.allocations.map((allocation) => ({
                    apiKeyId: allocation.apiKeyId,
                    weight: allocation.weight,
                    borrowing: false,
                  }));

                  return (
                    <Col xs={24} lg={12} key={pool.id}>
                      <Card className={styles.poolCard} styles={{ body: { padding: "16px 20px" } }}>
                        {/* Pool Header */}
                        <Flex justify="space-between" align="flex-start" style={{ marginBottom: 12 }}>
                          <Flex align="center" gap={10}>
                            <div
                              style={{
                                width: 34,
                                height: 34,
                                borderRadius: 8,
                                background: "rgba(168, 85, 247, 0.12)",
                                color: "#A855F7",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontWeight: 700,
                              }}
                            >
                              <MaterialIcon name="account_balance_wallet" size={18} />
                            </div>
                            <div>
                              <Flex align="center" gap={8}>
                                <Text strong style={{ fontSize: 15 }}>
                                  {pool.name}
                                </Text>
                                <Tag color="success" style={{ margin: 0, fontSize: 10 }}>
                                  已配置
                                </Tag>
                              </Flex>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {pool.description || "无描述"}
                              </Text>
                            </div>
                          </Flex>

                          <Space size={4}>
                            <Button
                              type="text"
                              size="small"
                              icon={<MaterialIcon name="edit" size={16} />}
                              onClick={() => handleOpenEditWizard(pool)}
                            />
                            <Popconfirm
                              title="确定删除此配额池？"
                              description="删除后绑定的虚拟模型映射将失效。"
                              onConfirm={() => deleteMutation.mutate(pool.id)}
                            >
                              <Button
                                type="text"
                                danger
                                size="small"
                                icon={<MaterialIcon name="delete" size={16} />}
                              />
                            </Popconfirm>
                          </Space>
                        </Flex>

                        <Text type="secondary" style={{ display: "block", marginBottom: 12, fontSize: 11 }}>
                          {pool.connectionIds.length} 个上游账号 · {pool.allocations.length} 个 API Key · 用量请通过配额详情接口查看
                        </Text>

                        {/* Stacked Allocation Bar */}
                        <StackedAllocationBar allocations={allocations} keyLabels={keyLabels} />

                        {/* Allocation Details Table */}
                        <AllocationTable allocations={allocations} keyLabels={keyLabels} />
                      </Card>
                    </Col>
                  );
                })}
              </Row>
            </div>
          );
        })
      )}

      {/* 3-Step Create / Edit Pool Wizard Modal */}
      <Modal
        open={wizardVisible}
        onCancel={() => setWizardVisible(false)}
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="pie_chart" size={20} style={{ color: "#10B981" }} />
            <span>{editingPool ? "编辑配额共享池" : "新建配额共享池 (Pool Wizard)"}</span>
          </Flex>
        }
        width={640}
        footer={[
          wizardStep > 0 && (
            <Button key="prev" onClick={() => setWizardStep(wizardStep - 1)}>
              上一步
            </Button>
          ),
          wizardStep < 2 ? (
            <Button key="next" type="primary" onClick={() => setWizardStep(wizardStep + 1)}>
              下一步
            </Button>
          ) : (
            <Button
              key="submit"
              type="primary"
              loading={createMutation.isPending}
              onClick={() => {
                form.validateFields().then((vals) => {
                  createMutation.mutate(vals);
                });
              }}
            >
              保存配额池
            </Button>
          ),
        ]}
      >
        <Form form={form} layout="vertical" style={{ marginTop: 16 }}>
          {wizardStep === 0 && (
            <div>
              <Form.Item
                name="name"
                label="配额池名称"
                rules={[{ required: true, message: "请输入配额池名称" }]}
              >
                <Input placeholder="例如：生产后端聚合配额池" />
              </Form.Item>

              <Row gutter={16}>
                <Col span={12}>
                  <Form.Item name="groupId" label="所属分组">
                    <Select
                      options={allGroups.map((g) => ({ label: g, value: g }))}
                      placeholder="选择分组"
                    />
                  </Form.Item>
                </Col>
                <Col span={12}>
                  <Form.Item name="strategy" label="路由与负载均衡策略">
                    <Select
                      options={[
                        { label: "加权轮询 (Weighted)", value: "weighted" },
                        { label: "主备优先级 (Priority)", value: "priority" },
                        { label: "最低延迟 (Lowest Latency)", value: "lowest-latency" },
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item name="description" label="描述说明">
                <Input.TextArea rows={2} placeholder="简述该配额池的用途与服务对象" />
              </Form.Item>

              <Form.Item name="connectionIds" label="绑定上游账号 (多账号容量自动汇聚)" rules={[{ required: true, type: "array", min: 1, message: "至少选择一个上游账号" }]}>
                <Select
                  mode="multiple"
                  placeholder="选择要聚合的上游账号"
                  options={connections.map((c) => ({
                    label: `${c.name || c.provider} (${c.id.slice(0, 8)})`,
                    value: c.id,
                  }))}
                />
              </Form.Item>
            </div>
          )}

          {wizardStep === 1 && (
            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                下游 API 密钥配额占比与借用授权
              </Text>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 16 }}>
                为各 API 密钥设定保证配额权重。各 Key 保证额度按权重比例计算，总和建议为 100%。
              </Paragraph>

              <Form.Item name="allowedApiKeys" label="授权访问该配额池的 API Key">
                <Select
                  mode="multiple"
                  placeholder="选择允许调用的 API Key"
                  options={apiKeys.map((k) => ({
                    label: `${k.name || k.id.slice(0, 10)}`,
                    value: k.id,
                  }))}
                />
              </Form.Item>

              <Alert
                type="info"
                showIcon
                message="权重分配"
                description="当前向导会将选中的 API Key 按等权重写入服务端配额池；保存后可通过服务端配额 API 调整每个 Key 的权重和策略。"
              />
            </div>
          )}

          {wizardStep === 2 && (
            <div>
              <Alert
                message="虚拟模型调用映射生成确认"
                description="保存后，客户端可使用生成的虚拟模型名称向该配额池发送请求，系统将自动执行额度统计与借用削峰。"
                type="info"
                showIcon
                style={{ marginBottom: 16 }}
              />

              <div style={{ padding: "12px 16px", background: "#09090b", borderRadius: 8, border: "1px solid rgba(255,255,255,0.1)" }}>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                  生成的虚拟模型名称:
                </div>
                <div style={{ fontSize: 14, fontFamily: "monospace", color: "#10B981", fontWeight: 700 }}>
                  qtSd/{form.getFieldValue("groupId") || "group"}/&lt;provider&gt;/&lt;model&gt;
                </div>
              </div>
            </div>
          )}
        </Form>
      </Modal>
    </div>
  );
}

export default QuotaSharePage;
