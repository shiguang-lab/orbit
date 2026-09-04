import { useMemo, useState } from "react";
import {
  Card,
  Col,
  Empty,
  Flex,
  Progress,
  Row,
  Segmented,
  Space,
  Tag,
  Typography,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { compressionApi, type CompressionAnalyticsSummary } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const { Title, Text, Paragraph } = Typography;

const PALETTE = [
  "#F97316",
  "#0EA5E9",
  "#10B981",
  "#8B5CF6",
  "#EC4899",
  "#F59E0B",
  "#06B6D4",
  "#6366F1",
];

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
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
    height: "100%",
  },
  statCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    height: "100%",
  },
  stretchCol: {
    display: "flex",
    flexDirection: "column" as const,
    "& > .ant-card": {
      flex: 1,
      height: "100%",
    },
  },
  barContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 6,
    marginBottom: 14,
  },
}));

function formatTokens(val: number): string {
  if (!Number.isFinite(val) || val === 0) return "0";
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(1)}K`;
  return `${val.toLocaleString()}`;
}

export function CompressionAnalyticsPage() {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const { tt } = useI18n();
  const [since, setSince] = useState<"24h" | "7d" | "30d" | "all">("24h");

  const analyticsQuery = useQuery({
    queryKey: ["compression-analytics-summary", since],
    queryFn: () => compressionApi.getAnalytics(since),
    staleTime: 15_000,
  });

  if (analyticsQuery.isLoading && !analyticsQuery.data) {
    return <PageSkeleton />;
  }

  const stats: CompressionAnalyticsSummary = analyticsQuery.data || {
    totalRequests: 0,
    totalTokensSaved: 0,
    avgSavingsPct: 0,
    avgDurationMs: 0,
    byMode: {},
    byEngine: {},
    byCompressionCombo: {},
    byProvider: {},
    last24h: [],
    totalSkipped: 0,
    bySkipReason: {},
    validationFallbacks: 0,
    realUsage: {
      requestsWithReceipts: 0,
      promptTokens: 0,
      completionTokens: 0,
      totalTokens: 0,
      cacheReadTokens: 0,
      cacheWriteTokens: 0,
      estimatedUsdSaved: 0,
      bySource: {},
    },
    mcpDescriptionCompression: {
      snapshots: 0,
      estimatedTokensSaved: 0,
    },
  };

  const modes: Array<[string, { count: number; tokensSaved: number; avgSavingsPct: number; skipped?: number }]> =
    Object.entries(stats.byMode || {}).sort(([, a], [, b]) => b.count - a.count);
  const providers: Array<[string, { count: number; tokensSaved: number }]> =
    Object.entries(stats.byProvider || {}).sort(([, a], [, b]) => b.count - a.count);
  const totalAttempts = stats.totalRequests + (stats.totalSkipped ?? 0);

  // Hourly Timeline Chart Data (Ensuring 24 slots are always rendered as skeleton/frame even if empty)
  const hourlyChartData = useMemo(() => {
    const rawList = stats.last24h || [];
    if (rawList.length > 0) {
      return rawList.map((entry) => {
        const hourStr = entry.hour.length >= 13 ? entry.hour.substring(11, 13) + ":00" : entry.hour;
        return {
          hour: hourStr,
          rawHour: entry.hour,
          requests: entry.count || 0,
          tokensSaved: entry.tokensSaved || 0,
        };
      });
    }

    // Default 24h Skeleton Frame
    const list = [];
    const now = new Date();
    for (let i = 23; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 3600 * 1000);
      const hourStr = String(d.getHours()).padStart(2, "0") + ":00";
      list.push({
        hour: hourStr,
        rawHour: d.toISOString(),
        requests: 0,
        tokensSaved: 0,
      });
    }
    return list;
  }, [stats.last24h]);

  const maxCountPerHour = Math.max(...hourlyChartData.map((h) => h.requests), 1);
  const maxTokensPerHour = Math.max(...hourlyChartData.map((h) => h.tokensSaved), 1);

  // Mode breakdown pie data
  const modePieData = useMemo(() => {
    return modes.map(([mode, item], i) => ({
      name: mode,
      value: item.tokensSaved || item.count,
      count: item.count,
      savings: item.tokensSaved,
      pct: item.avgSavingsPct,
      fill: PALETTE[i % PALETTE.length],
    }));
  }, [modes]);

  // Provider breakdown pie data
  const providerPieData = useMemo(() => {
    return providers.map(([prov, item], i) => ({
      name: prov,
      value: item.tokensSaved || item.count,
      count: item.count,
      savings: item.tokensSaved,
      fill: PALETTE[(i + 2) % PALETTE.length],
    }));
  }, [providers]);

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
      <Card className={styles.headerCard}>
        <Flex justify="space-between" align="center" wrap gap={14}>
          <Flex align="center" gap={14}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 10,
                background: "rgba(249, 115, 22, 0.12)",
                color: "#F97316",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="compress" size={28} />
            </div>
            <div>
              <Flex align="center" gap={8} wrap>
                <Title level={3} style={{ margin: 0, fontSize: 20 }}>
                  {tt("上下文压缩效能深度分析", "Context Compression Analytics")}
                </Title>
                <Tag color="orange">已节省 {formatTokens(stats.totalTokensSaved)} Tokens</Tag>
                {stats.realUsage?.estimatedUsdSaved > 0 && (
                  <Tag color="green">节约成本 ~${stats.realUsage.estimatedUsdSaved.toFixed(2)}</Tag>
                )}
              </Flex>
              <Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 12 }}>
                {tt(
                  "全景监控压缩算子（Session Dedup, RTK, Caveman, CCR）的处理量、压缩节省率、延迟开销与实际 Token 消耗。",
                  "Deep-dive telemetry into compression algorithms, token savings, latency impact, and cost reductions."
                )}
              </Paragraph>
            </div>
          </Flex>

          <Segmented
            value={since}
            onChange={(val) => setSince(val as any)}
            options={[
              { label: tt("最近 24 小时", "Last 24 Hours"), value: "24h" },
              { label: tt("最近 7 天", "Last 7 Days"), value: "7d" },
              { label: tt("最近 30 天", "Last 30 Days"), value: "30d" },
              { label: tt("全部历史", "All Time"), value: "all" },
            ]}
          />
        </Flex>

        {/* 6 Top KPI Metrics */}
        <Row gutter={[12, 12]} style={{ marginTop: 16, alignItems: "stretch" }}>
          <Col xs={12} sm={8} md={4} className={styles.stretchCol}>
            <Card className={styles.statCard}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="compress" size={16} style={{ color: "#F97316" }} />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  {tt("压缩请求总数", "Total Requests")}
                </Text>
              </Flex>
              <Title level={3} style={{ margin: "4px 0 0" }}>
                {totalAttempts.toLocaleString()}
              </Title>
              {stats.totalSkipped ? (
                <Text type="secondary" style={{ fontSize: 11 }}>跳过: {stats.totalSkipped.toLocaleString()}</Text>
              ) : (
                <Text type="secondary" style={{ fontSize: 11 }}>全部完成压缩评估</Text>
              )}
            </Card>
          </Col>

          <Col xs={12} sm={8} md={4} className={styles.stretchCol}>
            <Card className={styles.statCard}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="token" size={16} style={{ color: "#10B981" }} />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  {tt("节省 Tokens 总量", "Tokens Saved")}
                </Text>
              </Flex>
              <Title level={3} style={{ margin: "4px 0 0", color: "#10B981" }}>
                {formatTokens(stats.totalTokensSaved)}
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>{stats.totalTokensSaved.toLocaleString()} tokens</Text>
            </Card>
          </Col>

          <Col xs={12} sm={8} md={4} className={styles.stretchCol}>
            <Card className={styles.statCard}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="percent" size={16} style={{ color: "#0EA5E9" }} />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  {tt("平均节省比例", "Avg Savings")}
                </Text>
              </Flex>
              <Title level={3} style={{ margin: "4px 0 0", color: "#0EA5E9" }}>
                {stats.avgSavingsPct}%
              </Title>
              <Progress percent={stats.avgSavingsPct} showInfo={false} strokeColor="#0EA5E9" style={{ margin: "4px 0 0" }} />
            </Card>
          </Col>

          <Col xs={12} sm={8} md={4} className={styles.stretchCol}>
            <Card className={styles.statCard}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="timer" size={16} style={{ color: "#8B5CF6" }} />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  {tt("平均压缩耗时", "Avg Latency")}
                </Text>
              </Flex>
              <Title level={3} style={{ margin: "4px 0 0" }}>
                {stats.avgDurationMs} ms
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>计算损耗极低</Text>
            </Card>
          </Col>

          <Col xs={12} sm={8} md={4} className={styles.stretchCol}>
            <Card className={styles.statCard}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="receipt_long" size={16} style={{ color: "#EC4899" }} />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  {tt("真实上游回执", "Real Receipts")}
                </Text>
              </Flex>
              <Title level={3} style={{ margin: "4px 0 0" }}>
                {(stats.realUsage?.requestsWithReceipts || 0).toLocaleString()}
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>带真实计费回执</Text>
            </Card>
          </Col>

          <Col xs={12} sm={8} md={4} className={styles.stretchCol}>
            <Card className={styles.statCard}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="verified" size={16} style={{ color: stats.validationFallbacks > 0 ? "#EF4444" : "#10B981" }} />
                <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                  {tt("校验回退保护", "Validation Restores")}
                </Text>
              </Flex>
              <Title level={3} style={{ margin: "4px 0 0", color: stats.validationFallbacks > 0 ? "#EF4444" : "#10B981" }}>
                {stats.validationFallbacks.toLocaleString()}
              </Title>
              <Text type="secondary" style={{ fontSize: 11 }}>语法或语义安全兜底</Text>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 2. Interactive Hourly Activity Chart (Always Rendered Frame) */}
      <Card className={styles.sectionCard}>
        <Flex align="center" justify="space-between" style={{ marginBottom: 14 }}>
          <Flex align="center" gap={8}>
            <MaterialIcon name="show_chart" size={20} style={{ color: "#F97316" }} />
            <Text strong style={{ fontSize: 15 }}>
              {tt("24 小时压缩请求与节省趋势 (Hourly Activity Timeline)", "Hourly Activity Timeline")}
            </Text>
          </Flex>
          <Flex align="center" gap={12}>
            <Flex align="center" gap={6}>
              <span style={{ width: 10, height: 10, borderRadius: 2, background: "#F97316" }} />
              <Text type="secondary" style={{ fontSize: 11 }}>{tt("压缩请求数", "Requests")}</Text>
            </Flex>
            <Flex align="center" gap={6}>
              <span style={{ width: 10, height: 2, background: "#10B981" }} />
              <Text type="secondary" style={{ fontSize: 11 }}>{tt("节省 Tokens", "Tokens Saved")}</Text>
            </Flex>
          </Flex>
        </Flex>

        <div style={{ height: 220, width: "100%", position: "relative" }}>
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={hourlyChartData} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
              <XAxis
                dataKey="hour"
                tick={{ fontSize: 10, fill: "#94A3B8" }}
                axisLine={false}
                tickLine={false}
                interval={1}
              />
              <YAxis
                yAxisId="reqs"
                tick={{ fontSize: 10, fill: "#F97316" }}
                axisLine={false}
                tickLine={false}
                width={40}
              />
              <YAxis
                yAxisId="tokens"
                orientation="right"
                tick={{ fontSize: 10, fill: "#10B981" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => formatTokens(v)}
                width={50}
              />
              <ReTooltip
                formatter={(v, name) => {
                  if (name === "requests" || name === tt("压缩请求数", "Requests")) return [Number(v ?? 0).toLocaleString() + " 次", tt("压缩请求数", "Requests")];
                  if (name === "tokensSaved" || name === tt("节省 Tokens", "Tokens Saved")) return [Number(v ?? 0).toLocaleString() + " tokens", tt("节省 Tokens", "Tokens Saved")];
                  return [Number(v ?? 0).toLocaleString(), String(name)];
                }}
                contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
                labelStyle={{ color: "#94A3B8", fontSize: 11 }}
              />
              <Bar
                yAxisId="reqs"
                dataKey="requests"
                name={tt("压缩请求数", "Requests")}
                fill="#F97316"
                opacity={0.85}
                radius={[3, 3, 0, 0]}
              />
              <Line
                yAxisId="tokens"
                type="monotone"
                dataKey="tokensSaved"
                name={tt("节省 Tokens", "Tokens Saved")}
                stroke="#10B981"
                strokeWidth={2.5}
                dot={{ r: 2, fill: "#10B981" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <Flex justify="space-between" style={{ marginTop: 12, borderTop: `1px solid ${token.colorBorderSecondary}`, paddingTop: 8 }}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            单小时最高请求数: <Text strong style={{ color: "#F97316" }}>{maxCountPerHour.toLocaleString()}</Text> 次
          </Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            单小时最高节省: <Text strong style={{ color: "#10B981" }}>{formatTokens(maxTokensPerHour)}</Text> Tokens
          </Text>
        </Flex>
      </Card>

      {/* 3. Real Usage Tokens Breakdown */}
      {stats.realUsage && (
        <Card className={styles.sectionCard}>
          <Flex align="center" gap={8} style={{ marginBottom: 12 }}>
            <MaterialIcon name="receipt_long" size={20} style={{ color: "#0EA5E9" }} />
            <Text strong style={{ fontSize: 15 }}>
              {tt("真实上游回执 Tokens 消耗全景 (Real Upstream Receipts)", "Real Upstream Receipts")}
            </Text>
          </Flex>
          <Row gutter={[16, 12]}>
            <Col xs={12} sm={6} md={4}>
              <Text type="secondary" style={{ fontSize: 11 }}>输入 Prompt Tokens</Text>
              <Title level={4} style={{ margin: "4px 0 0", color: "#0EA5E9" }}>
                {formatTokens(stats.realUsage.promptTokens)}
              </Title>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Text type="secondary" style={{ fontSize: 11 }}>输出 Completion Tokens</Text>
              <Title level={4} style={{ margin: "4px 0 0", color: "#10B981" }}>
                {formatTokens(stats.realUsage.completionTokens)}
              </Title>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Text type="secondary" style={{ fontSize: 11 }}>总消耗 Tokens</Text>
              <Title level={4} style={{ margin: "4px 0 0", color: "#8B5CF6" }}>
                {formatTokens(stats.realUsage.totalTokens)}
              </Title>
            </Col>
            <Col xs={12} sm={6} md={4}>
              <Text type="secondary" style={{ fontSize: 11 }}>Cache 读/写 Tokens</Text>
              <Title level={4} style={{ margin: "4px 0 0", color: "#F59E0B" }}>
                {formatTokens((stats.realUsage.cacheReadTokens || 0) + (stats.realUsage.cacheWriteTokens || 0))}
              </Title>
            </Col>
            <Col xs={24} sm={24} md={8}>
              <Text type="secondary" style={{ fontSize: 11 }}>主要模型来源分布</Text>
              <Space wrap size={4} style={{ marginTop: 6, display: "block" }}>
                {Object.keys(stats.realUsage.bySource || {}).length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 11 }}>—</Text>
                ) : (
                  Object.entries(stats.realUsage.bySource || {}).map(([source, count]) => (
                    <Tag key={source} color="purple" style={{ margin: "2px 4px 2px 0" }}>
                      {source}: {String(count)} 次
                    </Tag>
                  ))
                )}
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* 4. Mode Breakdown & Provider Breakdown with Charts */}
      <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
        {/* Mode Breakdown */}
        <Col xs={24} lg={12} className={styles.stretchCol}>
          <Card className={styles.sectionCard}>
            <Flex align="center" justify="space-between" style={{ marginBottom: 14 }}>
              <Flex align="center" gap={8}>
                <MaterialIcon name="tune" size={18} style={{ color: "#F97316" }} />
                <Text strong style={{ fontSize: 14 }}>
                  {tt("按压缩模式/算子分布 (Modes)", "Mode Breakdown")}
                </Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 11 }}>
                共 {modes.length} 种算法模式
              </Text>
            </Flex>

            {modes.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无压缩模式数据" />
            ) : (
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={10}>
                  <div style={{ width: 140, height: 140, margin: "0 auto" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={modePieData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
                          {modePieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} stroke="none" />
                          ))}
                        </Pie>
                        <ReTooltip
                          formatter={(v) => [formatTokens(Number(v ?? 0)) + " Tokens", "节省"]}
                          contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col xs={24} sm={14}>
                  <Flex vertical gap={10}>
                    {modes.map(([mode, item], idx) => {
                      const pct = stats.totalRequests > 0 ? Math.round((item.count / stats.totalRequests) * 100) : 0;
                      return (
                        <div key={mode} className={styles.barContainer} style={{ marginBottom: 0 }}>
                          <Flex justify="space-between" align="center">
                            <Flex align="center" gap={6}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE[idx % PALETTE.length] }} />
                              <Text strong style={{ textTransform: "capitalize", fontSize: 12 }}>{mode}</Text>
                            </Flex>
                            <Space size={6}>
                              <Text type="secondary" style={{ fontSize: 11 }}>
                                {item.count.toLocaleString()} 请求 · 节省 {formatTokens(item.tokensSaved)}
                              </Text>
                              <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>{item.avgSavingsPct}% 节省</Tag>
                            </Space>
                          </Flex>
                          <Progress percent={pct} strokeColor={PALETTE[idx % PALETTE.length]} showInfo={false} style={{ margin: 0 }} />
                        </div>
                      );
                    })}
                  </Flex>
                </Col>
              </Row>
            )}
          </Card>
        </Col>

        {/* Provider Breakdown */}
        <Col xs={24} lg={12} className={styles.stretchCol}>
          <Card className={styles.sectionCard}>
            <Flex align="center" justify="space-between" style={{ marginBottom: 14 }}>
              <Flex align="center" gap={8}>
                <MaterialIcon name="hub" size={18} style={{ color: "#0EA5E9" }} />
                <Text strong style={{ fontSize: 14 }}>
                  {tt("按模型提供商分布 (Providers)", "Provider Breakdown")}
                </Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 11 }}>
                共 {providers.length} 家提供商
              </Text>
            </Flex>

            {providers.length === 0 ? (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无提供商压缩数据" />
            ) : (
              <Row gutter={[16, 16]} align="middle">
                <Col xs={24} sm={10}>
                  <div style={{ width: 140, height: 140, margin: "0 auto" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={providerPieData} dataKey="value" nameKey="name" innerRadius={35} outerRadius={60} paddingAngle={2}>
                          {providerPieData.map((entry) => (
                            <Cell key={entry.name} fill={entry.fill} stroke="none" />
                          ))}
                        </Pie>
                        <ReTooltip
                          formatter={(v) => [formatTokens(Number(v ?? 0)) + " Tokens", "节省"]}
                          contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </Col>
                <Col xs={24} sm={14}>
                  <Flex vertical gap={10}>
                    {providers.map(([provider, item], idx) => {
                      const pct = stats.totalRequests > 0 ? Math.round((item.count / stats.totalRequests) * 100) : 0;
                      return (
                        <div key={provider} className={styles.barContainer} style={{ marginBottom: 0 }}>
                          <Flex justify="space-between" align="center">
                            <Flex align="center" gap={6}>
                              <span style={{ width: 8, height: 8, borderRadius: "50%", background: PALETTE[(idx + 2) % PALETTE.length] }} />
                              <Text strong style={{ textTransform: "capitalize", fontSize: 12 }}>{provider}</Text>
                            </Flex>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {item.count.toLocaleString()} 请求 · 节省 {formatTokens(item.tokensSaved)}
                            </Text>
                          </Flex>
                          <Progress percent={pct} strokeColor={PALETTE[(idx + 2) % PALETTE.length]} showInfo={false} style={{ margin: 0 }} />
                        </div>
                      );
                    })}
                  </Flex>
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>

      {/* 5. MCP Description Compression & Diagnostics */}
      {stats.mcpDescriptionCompression && (
        <Card className={styles.sectionCard}>
          <Flex align="center" justify="space-between" wrap gap={12}>
            <div>
              <Flex align="center" gap={6}>
                <MaterialIcon name="account_tree" size={18} style={{ color: "#10B981" }} />
                <Text strong style={{ fontSize: 14 }}>
                  {tt("MCP 工具描述动态压缩 (MCP Tools Compression)", "MCP Tools Compression")}
                </Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                针对 Agent 场景超长 MCP 工具元数据进行实时剪枝与去重，大幅降低 Prompt 提示词冷启动损耗。
              </Text>
            </div>
            <Flex align="center" gap={16}>
              <Flex vertical align="flex-end">
                <Text type="secondary" style={{ fontSize: 11 }}>监控快照</Text>
                <Text strong style={{ fontSize: 15, fontFamily: "monospace" }}>
                  {stats.mcpDescriptionCompression.snapshots.toLocaleString()} 次
                </Text>
              </Flex>
              <Flex vertical align="flex-end">
                <Text type="secondary" style={{ fontSize: 11 }}>估算节省 Tokens</Text>
                <Text strong style={{ fontSize: 15, fontFamily: "monospace", color: "#10B981" }}>
                  {formatTokens(stats.mcpDescriptionCompression.estimatedTokensSaved)}
                </Text>
              </Flex>
            </Flex>
          </Flex>
        </Card>
      )}

      {/* 6. Skip Reasons & Info Note */}
      {stats.bySkipReason && Object.keys(stats.bySkipReason).length > 0 && (
        <Card className={styles.sectionCard}>
          <Flex align="center" justify="space-between" wrap gap={8}>
            <Flex align="center" gap={6}>
              <MaterialIcon name="info" size={16} style={{ color: "#3B82F6" }} />
              <Text strong style={{ fontSize: 13 }}>
                {tt("跳过原因分布 (Skip Reasons)", "Skip Reasons")}
              </Text>
            </Flex>
            <Space wrap size={6}>
              {Object.entries(stats.bySkipReason).map(([reason, count]) => (
                <Tag key={reason} color="default">
                  {reason}: {count.toLocaleString()} 次
                </Tag>
              ))}
            </Space>
          </Flex>
        </Card>
      )}
    </div>
  );
}

export default CompressionAnalyticsPage;
