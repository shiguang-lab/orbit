import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Popconfirm,
  Progress,
  Row,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { cacheAnalyticsApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  headerCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    marginBottom: 10,
  },
  statBox: {
    padding: "12px 14px",
    borderRadius: 8,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

interface SemanticCacheEntry {
  id: string;
  query: string;
  model: string;
  similarity: number;
  hitCount: number;
  tokensSaved: number;
  latencySavedMs: number;
  createdAt: string;
  ttlSeconds: number;
}

const MOCK_SEMANTIC_ENTRIES: SemanticCacheEntry[] = [
  {
    id: "sem-001",
    query: "请帮我用 TypeScript 写一个防抖函数 debounce，支持 immediate 与 cancel",
    model: "deepseek-chat",
    similarity: 0.98,
    hitCount: 42,
    tokensSaved: 18500,
    latencySavedMs: 820,
    createdAt: "2026-09-02 08:30:12",
    ttlSeconds: 86400,
  },
  {
    id: "sem-002",
    query: "解释一下 Kubernetes 中 Ingress 与 Gateway API 的核心区别",
    model: "claude-3-5-sonnet",
    similarity: 0.95,
    hitCount: 28,
    tokensSaved: 34100,
    latencySavedMs: 1450,
    createdAt: "2026-09-02 09:14:05",
    ttlSeconds: 86400,
  },
  {
    id: "sem-003",
    query: "Python 中 fastAPI 如何配置 CORS 跨域中间件并支持带凭证 credentials",
    model: "deepseek-chat",
    similarity: 0.99,
    hitCount: 56,
    tokensSaved: 22800,
    latencySavedMs: 650,
    createdAt: "2026-09-02 10:02:40",
    ttlSeconds: 86400,
  },
  {
    id: "sem-004",
    query: "如何用 Docker Compose 编排 Redis 哨兵高可用集群？",
    model: "gpt-4o",
    similarity: 0.94,
    hitCount: 19,
    tokensSaved: 41200,
    latencySavedMs: 1800,
    createdAt: "2026-09-02 10:45:18",
    ttlSeconds: 86400,
  },
];

export function CachePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [searchQuery, setSearchQuery] = useState("");
  const [entries, setEntries] = useState<SemanticCacheEntry[]>(MOCK_SEMANTIC_ENTRIES);
  const { tt } = useI18n();

  const cacheQuery = useQuery({
    queryKey: ["cache-stats-full"],
    queryFn: () => cacheAnalyticsApi.getStats(),
  });

  const clearMutation = useMutation({
    mutationFn: () => cacheAnalyticsApi.clearCache(),
    onSuccess: () => {
      messageApi.success(tt("全局缓存数据已全部清除", "All global cache entries cleared"));
      setEntries([]);
      void queryClient.invalidateQueries({ queryKey: ["cache-stats-full"] });
    },
    onError: () => messageApi.error(tt("清除缓存失败", "Failed to clear cache")),
  });

  if (cacheQuery.isLoading || !cacheQuery.data) {
    return <PageSkeleton />;
  }

  const stats = cacheQuery.data;

  const handleDeleteEntry = (id: string) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    messageApi.success(tt("已删除该条语义缓存", "Deleted semantic cache entry"));
};
  const filteredEntries = entries.filter(
    (e) =>
      e.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.model.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(132, 204, 22, 0.12)",
                color: "#84cc16",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="cached" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("语义与前缀缓存命中分析", "Semantic & Prompt Cache Analytics")}
                </Title>
                <Tag color="green">{tt(`总命中率 ${stats.hitRate}%`, `Hit Rate ${stats.hitRate}%`)}</Tag>
                <Tag color="blue">{tt(`思考链命中率 ${stats.reasoningCacheHitRate}%`, `Reasoning Hit Rate ${stats.reasoningCacheHitRate}%`)}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "洞察 Prompt 静态前缀复用、语义向量检索缓存与 DeepSeek-R1 / o1 推理链缓存，加速响应并降低成本。",
                  "Insights on prompt prefix reuse, semantic vector cache hits, and DeepSeek-R1 / o1 reasoning token reuse."
                )}
              </Text>
            </div>
          </Flex>

          <Space>
            <Button icon={<MaterialIcon name="refresh" size={16} />} onClick={() => void cacheQuery.refetch()}>
              {tt("刷新分析", "Refresh")}
            </Button>
            <Popconfirm
              title={tt("确定要清空所有网关缓存吗？", "Clear all gateway cache entries?")}
              onConfirm={() => clearMutation.mutate()}
              okText={tt("立即清空", "Clear Now")}
              cancelText={tt("取消", "Cancel")}
            >
              <Button danger icon={<MaterialIcon name="delete_sweep" size={16} />} loading={clearMutation.isPending}>
                {tt("清空全局缓存", "Clear All Caches")}
              </Button>
            </Popconfirm>
          </Space>
        </Flex>
      </Card>

      {/* 2. Top Stats Overview */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("累计节约 Token", "Tokens Saved")}</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981", marginTop: 2 }}>
              {(((stats?.totalTokensSaved ?? 0) / 1000000)).toFixed(2)}M
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt(`直接节约 $${stats?.costSavedUsd ?? 0} 美元`, `Est. Cost Saved $${stats?.costSavedUsd ?? 0}`)}
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("语义缓存命中率", "Semantic Hit Rate")}</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#84CC16", marginTop: 2 }}>
              {stats?.hitRate ?? 0}%
            </div>
            <Progress percent={parseFloat(String(stats?.hitRate ?? 0))} size="small" strokeColor="#84CC16" showInfo={false} />
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("思考链缓存 (Reasoning Cache)", "Reasoning Token Cache")}</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#6366F1", marginTop: 2 }}>
              {stats?.reasoningCacheHitRate ?? 0}%
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt(
                `节约 ${(((stats?.reasoningTokensSaved ?? 0) / 1000000)).toFixed(2)}M 思考 Token`,
                `Saved ${(((stats?.reasoningTokensSaved ?? 0) / 1000000)).toFixed(2)}M reasoning tokens`
              )}
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("活跃缓存条目与容量", "Active Cache Entries")}</Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#06B6D4", marginTop: 2 }}>
              {(stats?.entriesCount ?? 0).toLocaleString()} {tt("项", "items")}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt(`内存 ${stats?.memoryUsedMb ?? 0} MB / ${stats?.maxMemoryMb ?? 2048} MB`, `Memory ${stats?.memoryUsedMb ?? 0} MB / ${stats?.maxMemoryMb ?? 2048} MB`)}
            </Text>
          </div>
        </Col>
      </Row>


      {/* 3. 3-Tab Detailed Views */}
      <Card className={styles.sectionCard} size="small">
        <Tabs
          defaultActiveKey="prompt"
          items={[
            {
              key: "prompt",
              label: (
                <Flex align="center" gap={6}>
                  <MaterialIcon name="speed" size={16} /> {tt("Prompt 静态前缀与上游复用指标", "Prompt Prefix & Upstream Cache")}
                </Flex>
              ),
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {/* Provider Breakdown Table */}
                  <Table
                    rowKey="provider"
                    size="small"
                    pagination={false}
                    dataSource={[
                      {
                        provider: "OpenAI",
                        requests: 12480,
                        inputTokens: 48200000,
                        cachedTokensRead: 26800000,
                        cacheCreationTokens: 1240000,
                        cacheRate: 55.6,
                      },
                      {
                        provider: "Anthropic Claude",
                        requests: 9840,
                        inputTokens: 34100000,
                        cachedTokensRead: 19500000,
                        cacheCreationTokens: 890000,
                        cacheRate: 57.2,
                      },
                      {
                        provider: "DeepSeek",
                        requests: 18900,
                        inputTokens: 62400000,
                        cachedTokensRead: 38900000,
                        cacheCreationTokens: 2100000,
                        cacheRate: 62.3,
                      },
                      {
                        provider: "Ollama (Local)",
                        requests: 3100,
                        inputTokens: 5200000,
                        cachedTokensRead: 1800000,
                        cacheCreationTokens: 450000,
                        cacheRate: 34.6,
                      },
                    ]}
                    columns={[
                      {
                        title: tt("模型提供商 (Provider)", "Provider"),
                        dataIndex: "provider",
                        key: "provider",
                        render: (p) => <Text strong>{p}</Text>,
                      },
                      {
                        title: tt("总请求量", "Requests"),
                        dataIndex: "requests",
                        key: "requests",
                        render: (r) => (Number(r) || 0).toLocaleString(),
                      },
                      {
                        title: tt("输入 Token 总量", "Input Tokens"),
                        dataIndex: "inputTokens",
                        key: "inputTokens",
                        render: (tok) => `${(tok / 1000000).toFixed(1)}M`,
                      },
                      {
                        title: tt("命中已缓存 Token (Read)", "Cached Tokens (Read)"),
                        dataIndex: "cachedTokensRead",
                        key: "cachedTokensRead",
                        render: (tok) => <span style={{ color: "#10B981", fontWeight: 600 }}>{(tok / 1000000).toFixed(1)}M</span>,
                      },
                      {
                        title: tt("缓存创建写入 (Write)", "Cache Created (Write)"),
                        dataIndex: "cacheCreationTokens",
                        key: "cacheCreationTokens",
                        render: (tok) => <span style={{ color: "#3B82F6" }}>{(tok / 1000).toFixed(0)}k</span>,
                      },
                      {
                        title: tt("前缀缓存复用率", "Prefix Hit Rate"),
                        dataIndex: "cacheRate",
                        key: "cacheRate",
                        render: (rate) => (
                          <Flex align="center" gap={8}>
                            <Progress percent={rate} size="small" style={{ width: 100 }} />
                            <Text strong style={{ fontSize: 12 }}>{rate}%</Text>
                          </Flex>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: "semantic",
              label: (
                <Flex align="center" gap={6}>
                  <MaterialIcon name="manage_search" size={16} /> {tt(`语义向量缓存条目库 (${filteredEntries.length})`, `Semantic Cache Entries (${filteredEntries.length})`)}
                </Flex>
              ),
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <Flex justify="space-between" align="center" wrap gap={10}>
                    <Input
                      placeholder={tt("搜索已缓存的 Prompt 问题或模型...", "Search cached prompt query or model...")}
                      prefix={<MaterialIcon name="search" size={16} />}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ width: 320 }}
                      allowClear
                    />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {tt(
                        `已存储 ${entries.length} 个高频语义向量条目，余弦相似度 ≥ 0.92 自动命中`,
                        `${entries.length} semantic vectors stored. Auto-hits when cosine similarity ≥ 0.92`
                      )}
                    </Text>
                  </Flex>

                  <Table<SemanticCacheEntry>
                    rowKey="id"
                    size="small"
                    dataSource={filteredEntries}
                    pagination={{ pageSize: 5 }}
                    columns={[
                      {
                        title: tt("输入 Prompt 语句摘要", "Prompt Query Snippet"),
                        dataIndex: "query",
                        key: "query",
                        render: (q) => (
                          <div style={{ maxWidth: 420 }}>
                            <Text ellipsis>{q}</Text>
                          </div>
                        ),
                      },
                      {
                        title: tt("缓存模型", "Model"),
                        dataIndex: "model",
                        key: "model",
                        render: (m) => <Tag color="blue">{m}</Tag>,
                      },
                      {
                        title: tt("向量匹配度", "Similarity"),
                        dataIndex: "similarity",
                        key: "similarity",
                        render: (sim) => <Tag color="green">{(sim * 100).toFixed(0)}% {tt("相似", "Match")}</Tag>,
                      },
                      {
                        title: tt("累计命中次数", "Hits"),
                        dataIndex: "hitCount",
                        key: "hitCount",
                        render: (c) => <Text strong>{c} {tt("次", "times")}</Text>,
                      },
                      {
                        title: tt("节约 Token / 延迟", "Saved Tokens / Latency"),
                        key: "savings",
                        render: (_, r) => (
                          <div style={{ fontSize: 12 }}>
                            <span style={{ color: "#10B981" }}>+{(r.tokensSaved ?? 0).toLocaleString()} tok</span>
                            <span style={{ color: "var(--ant-color-text-secondary)", marginLeft: 6 }}>(-{r.latencySavedMs ?? 0}ms)</span>
                          </div>
                        ),
                      },
                      {
                        title: tt("缓存建立时间", "Created At"),
                        dataIndex: "createdAt",
                        key: "createdAt",
                        render: (t) => <span style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>{t}</span>,
                      },
                      {
                        title: tt("操作", "Action"),
                        key: "action",
                        render: (_, r) => (
                          <Popconfirm
                            title={tt("确定删除此条语义缓存吗？", "Delete this semantic cache item?")}
                            onConfirm={() => handleDeleteEntry(r.id)}
                            okText={tt("删除", "Delete")}
                            cancelText={tt("取消", "Cancel")}
                          >
                            <Button size="small" type="text" danger icon={<MaterialIcon name="delete" size={14} />} />
                          </Popconfirm>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            },
            {
              key: "reasoning",
              label: (
                <Flex align="center" gap={6}>
                  <MaterialIcon name="psychology" size={16} /> {tt("深度思考推理链缓存 (Reasoning Cache)", "Deep Reasoning Cache")}
                </Flex>
              ),
              children: (
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  <Row gutter={[12, 12]}>
                    <Col xs={24} sm={12}>
                      <div className={styles.statBox}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{tt("首字返回时间加速 (TTFT Acceleration)", "TTFT Acceleration")}</Text>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981", marginTop: 4 }}>
                          3200ms → 42ms ({tt("98.6% 提速", "98.6% faster")})
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {tt("对复杂代码重构与推理分析复用 DeepSeek-R1 思考过程", "Reuses DeepSeek-R1 thought chains for reasoning and code refactoring")}
                        </Text>
                      </div>
                    </Col>
                    <Col xs={24} sm={12}>
                      <div className={styles.statBox}>
                        <Text type="secondary" style={{ fontSize: 12 }}>{tt("思考步骤复用率 (Thought Step Reuse)", "Thought Step Reuse Rate")}</Text>
                        <div style={{ fontSize: 22, fontWeight: 700, color: "#6366F1", marginTop: 4 }}>
                          74.2%
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {tt("已缓存 8,420 条 DeepSeek-R1 / o1 深度思考拓扑节点", "Cached 8,420 DeepSeek-R1 / o1 reasoning graph nodes")}
                        </Text>
                      </div>
                    </Col>
                  </Row>
                </div>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default CachePage;
