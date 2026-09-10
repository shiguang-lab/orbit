import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  freeProviderRankingsApi,
  type FreeProviderRankingItem,
  type ProviderAuthType,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  headerCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  podiumCard: {
    borderRadius: 8,
    position: "relative",
    overflow: "hidden",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: "16px 18px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  providerIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 12,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
}));

function scoreLabel(score: number, isZh: boolean): string {
  if (score >= 0.9) return isZh ? "顶尖 (Elite)" : "Elite";
  if (score >= 0.8) return isZh ? "极佳 (Excellent)" : "Excellent";
  if (score >= 0.7) return isZh ? "优秀 (Very Good)" : "Very Good";
  if (score >= 0.6) return isZh ? "良好 (Good)" : "Good";
  if (score >= 0.5) return isZh ? "一般 (Average)" : "Average";
  return isZh ? "中下 (Below Avg)" : "Below Average";
}

function scoreColor(score: number): string {
  if (score >= 0.85) return "#10b981";
  if (score >= 0.7) return "#06b6d4";
  if (score >= 0.55) return "#eab308";
  return "#f97316";
}

export function FreeProviderRankingsPage() {
  const { styles } = useStyles();
  const { isZh, tt } = useI18n();

  const [category, setCategory] = useState<string>("");
  const [configuredOnly, setConfiguredOnly] = useState(false);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [typeFilter, setTypeFilter] = useState<ProviderAuthType | "">("");
  const [groupByType, setGroupByType] = useState(false);
  const [sortBy, setSortBy] = useState<"elo" | "reliability">("elo");

  const rankingsQuery = useQuery({
    queryKey: ["free-provider-rankings", category, configuredOnly, availableOnly, sortBy],
    queryFn: () =>
      freeProviderRankingsApi.getRankings({
        category: category || undefined,
        configuredOnly,
        availableOnly,
        withUsage: true,
        usageRange: "24h",
        sortBy,
      }),
  });

  const rawRankings = rankingsQuery.data ?? [];

  // Filter & sort
  const displayedRankings = useMemo(() => {
    let list = rawRankings;
    if (typeFilter) {
      list = list.filter((p) => p.category === typeFilter);
    }
    if (groupByType) {
      const authOrder: Record<string, number> = { noauth: 0, oauth: 1, apikey: 2 };
      list = [...list].sort((a, b) => {
        const orderA = authOrder[a.category] ?? 99;
        const orderB = authOrder[b.category] ?? 99;
        if (orderA !== orderB) return orderA - orderB;
        return (b.topModel?.score ?? b.averageScore) - (a.topModel?.score ?? a.averageScore);
      });
    }
    return list;
  }, [rawRankings, typeFilter, groupByType]);

  if (rankingsQuery.isLoading && !rankingsQuery.data) {
    return <PageSkeleton />;
  }

  const top3 = displayedRankings.slice(0, 3);

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="leaderboard" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("免费提供商排行与质量天梯", "Free Provider Rankings & Quality Ladder")}
                </Title>
                <Tag color="purple">
                  {tt(`共 ${displayedRankings.length} 个免费提供商`, `${displayedRankings.length} Providers`)}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "基于各服务商所提供免费模型的 Arena ELO 智力评分与任务质量，结合 24h 真实调用可靠度进行综合天梯排位。",
                  "Rankings computed from ELO intelligence scores and real 24h traffic reliability across all free providers."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="default"
            icon={<MaterialIcon name="refresh" size={16} />}
            loading={rankingsQuery.isFetching}
            onClick={() => void rankingsQuery.refetch()}
          >
            {tt("刷新榜单", "Refresh")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Filter Bar */}
      <Card className={styles.sectionCard} styles={{ body: { padding: "10px 14px" } }}>
        <Flex vertical gap={10}>
          {/* Task Category Tabs */}
          <Flex align="center" gap={10} wrap>
            <Text type="secondary" style={{ fontSize: 12, minWidth: 70 }}>
              {tt("任务领域:", "Task Domain:")}
            </Text>
            <Segmented
              value={category}
              onChange={(val) => setCategory(val as string)}
              options={[
                { label: tt("全部任务", "All Categories"), value: "" },
                { label: tt("通用 / 默认", "General"), value: "default" },
                { label: tt("编程开发", "Coding"), value: "coding" },
                { label: tt("代码审查", "Review"), value: "review" },
                { label: tt("文档编写", "Documentation"), value: "documentation" },
                { label: tt("问题排查", "Debugging"), value: "debugging" },
              ]}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("排序:", "Sort:")}
            </Text>
            <Segmented
              value={sortBy}
              onChange={(value) => setSortBy(value as "elo" | "reliability")}
              options={[
                { label: tt("模型能力", "Model quality"), value: "elo" },
                { label: tt("实测可靠度", "Measured reliability"), value: "reliability" },
              ]}
            />
          </Flex>

          {/* Auth Type & Availability Filters */}
          <Flex justify="space-between" align="center" wrap gap={10}>
            <Flex align="center" gap={10} wrap>
              <Text type="secondary" style={{ fontSize: 12, minWidth: 70 }}>
                {tt("认证类型:", "Auth Type:")}
              </Text>
              <Segmented
                value={typeFilter}
                onChange={(val) => setTypeFilter(val as ProviderAuthType | "")}
                options={[
                  { label: tt("全部类型", "All Types"), value: "" },
                  { label: tt("免登录 (No-Auth)", "No-Auth"), value: "noauth" },
                  { label: tt("OAuth 免费", "OAuth Free"), value: "oauth" },
                  { label: tt("API Key 免费", "API Key Free"), value: "apikey" },
                ]}
              />
            </Flex>

            <Space wrap>
              <Button
                type={configuredOnly ? "primary" : "default"}
                onClick={() => setConfiguredOnly((v) => !v)}
              >
                {tt("仅显示已配置", "Configured Only")}
              </Button>
              <Button
                type={availableOnly ? "primary" : "default"}
                onClick={() => setAvailableOnly((v) => !v)}
              >
                {tt("仅显示可用 (非冷却)", "Available Only")}
              </Button>
              <Button
                type={groupByType ? "dashed" : "text"}
                icon={<MaterialIcon name="sort" size={14} />}
                onClick={() => setGroupByType((v) => !v)}
              >
                {tt("按认证类型优先排序", "Group by Type")}
              </Button>
            </Space>
          </Flex>
        </Flex>
      </Card>

      {/* 3. Top 3 Podium Cards */}
      {top3.length >= 3 && (
        <Row gutter={[12, 12]}>
          {top3.map((provider, idx) => {
            const isGold = idx === 0;
            const isSilver = idx === 1;
            const borderGrad = isGold
              ? "linear-gradient(90deg, #f59e0b, #d97706)"
              : isSilver
                ? "linear-gradient(90deg, #94a3b8, #64748b)"
                : "linear-gradient(90deg, #d97706, #b45309)";
            const medal = isGold ? "🥇" : isSilver ? "🥈" : "🥉";

            return (
              <Col xs={24} md={8} key={provider.id}>
                <div className={styles.podiumCard}>
                  <div
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: 3,
                      background: borderGrad,
                    }}
                  />
                  <Flex justify="space-between" align="flex-start">
                    <Flex align="center" gap={10} style={{ minWidth: 0 }}>
                      <span style={{ fontSize: 26 }}>{medal}</span>
                      <div
                        className={styles.providerIconBadge}
                        style={{ backgroundColor: provider.color || "#6366f1" }}
                      >
                        {provider.textIcon || provider.name.charAt(0)}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <Text strong style={{ fontSize: 14 }} ellipsis>
                          {provider.name}
                        </Text>
                        <Tag
                          style={{ fontSize: 10, lineHeight: "16px", padding: "0 4px", marginTop: 2 }}
                          color={
                            provider.category === "noauth"
                              ? "green"
                              : provider.category === "oauth"
                                ? "blue"
                                : "purple"
                          }
                        >
                          {provider.category.toUpperCase()}
                        </Tag>
                      </div>
                    </Flex>
                    <span style={{ fontSize: 24, fontWeight: 900, color: "var(--ant-color-text-quaternary)" }}>
                      #{idx + 1}
                    </span>
                  </Flex>

                  <div style={{ marginTop: 12, borderTop: "1px solid var(--ant-color-border-secondary)", paddingTop: 8 }}>
                    <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                      {tt("主力推荐模型:", "Top Model:")} {provider.topModel?.modelName || "—"}
                    </Text>
                    <div
                      style={{
                        fontSize: 16,
                        fontWeight: 700,
                        color: scoreColor(provider.topModel?.score ?? provider.averageScore),
                        marginTop: 2,
                      }}
                    >
                      {scoreLabel(provider.topModel?.score ?? provider.averageScore, isZh)}
                    </div>
                  </div>
                </div>
              </Col>
            );
          })}
        </Row>
      )}

      {/* 4. Full Table */}
      <Card title={tt("全部免费提供商天梯排位表", "Full Free Provider Rankings Table")} className={styles.sectionCard} size="small">
        <Table<FreeProviderRankingItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={displayedRankings}
          columns={[
            {
              title: tt("排名", "Rank"),
              key: "rank",
              width: 70,
              align: "center",
              render: (_, __, index) => (
                <Tag
                  color={
                    index === 0
                      ? "gold"
                      : index === 1
                        ? "default"
                        : index === 2
                          ? "orange"
                          : undefined
                  }
                  style={{ fontWeight: 700 }}
                >
                  #{index + 1}
                </Tag>
              ),
            },
            {
              title: tt("提供商", "Provider"),
              key: "name",
              render: (_, record) => (
                <Flex align="center" gap={8}>
                  <div
                    className={styles.providerIconBadge}
                    style={{ backgroundColor: record.color || "#6366f1" }}
                  >
                    {record.textIcon || record.name.charAt(0)}
                  </div>
                  <div>
                    <Text strong style={{ fontSize: 13 }}>{record.name}</Text>
                    <div style={{ fontSize: 10, color: "var(--ant-color-text-secondary)" }}>{record.id}</div>
                  </div>
                </Flex>
              ),
            },
            {
              title: tt("主力免费模型", "Top Model"),
              key: "topModel",
              render: (_, record) => (
                <Text style={{ fontSize: 12 }} ellipsis>
                  {record.topModel?.modelName || "—"}
                </Text>
              ),
            },
            {
              title: tt("最佳模型评级", "Top Model Rating"),
              key: "topScore",
              align: "right",
              render: (_, record) => {
                const s = record.topModel?.score;
                if (s === undefined) return <span style={{ color: "var(--ant-color-text-secondary)" }}>—</span>;
                return (
                  <Text strong style={{ color: scoreColor(s), fontFamily: "monospace" }}>
                    {scoreLabel(s, isZh)}
                  </Text>
                );
              },
            },
            {
              title: tt("综合均分", "Avg Score"),
              key: "avgScore",
              align: "right",
              render: (_, record) => (
                <span style={{ color: "var(--ant-color-text-secondary)", fontSize: 12, fontFamily: "monospace" }}>
                  {scoreLabel(record.averageScore, isZh)}
                </span>
              ),
            },
            {
              title: tt("24h 稳定性可靠度", "24h Reliability"),
              key: "reliability",
              align: "right",
              render: (_, record) => {
                const u = record.reliability?.usage;
                if (u && typeof u.rate === "number") {
                  const pct = Math.round(u.rate * 100);
                  const color = pct >= 95 ? "#10b981" : pct >= 80 ? "#eab308" : "#ef4444";
                  return (
                    <Text strong style={{ color, fontFamily: "monospace" }}>
                      {pct}%
                    </Text>
                  );
                }
                return <span style={{ color: "var(--ant-color-text-secondary)" }}>100%</span>;
              },
            },
            {
              title: tt("模型数量", "Models"),
              dataIndex: "modelCount",
              key: "modelCount",
              align: "right",
              render: (count) => <Tag color="blue">{count}</Tag>,
            },
            {
              title: tt("认证类别", "Auth Category"),
              dataIndex: "category",
              key: "category",
              align: "right",
              render: (cat: ProviderAuthType) => (
                <Tag
                  color={
                    cat === "noauth"
                      ? "green"
                      : cat === "oauth"
                        ? "blue"
                        : "purple"
                  }
                >
                  {cat.toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default FreeProviderRankingsPage;
