import { useState, useMemo } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Pagination,
  Popconfirm,
  Progress,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { MaterialIcon } from "@/app/nav";
import {
  cacheAnalyticsApi,
  type FullCacheStatsResponse,
  type SemanticCacheItem,
  type ReasoningCacheEntry,
  type CacheHealthResponse,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text, Paragraph } = Typography;

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
  },
  sectionCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  subCard: {
    borderRadius: 10,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: 16,
  },
  heroStatCard: {
    padding: "16px 18px",
    borderRadius: 12,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  concentrationCard: {
    borderRadius: 12,
    background: `linear-gradient(135deg, ${token.colorBgElevated} 0%, ${token.colorFillAlter} 100%)`,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: 18,
  },
  percentileCard: {
    padding: "12px 14px",
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    textAlign: "center",
  },
  chartContainer: {
    width: "100%",
    height: 320,
    marginTop: 8,
  },
  infoRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    fontSize: 13,
    color: token.colorTextSecondary,
    lineHeight: "1.5",
  },
  reasoningBlock: {
    borderRadius: 8,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: 14,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: "1.6",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
    maxHeight: 280,
    overflowY: "auto",
  },
}));

type CacheViewType = "prompt" | "semantic" | "reasoning";
type TimeRangeType = "1h" | "24h" | "7d" | "30d";

const CHART_COLORS = {
  totalReq: "#64748b",
  cachedReq: "#10b981",
  cacheRate: "#f59e0b",
};

function formatNumber(num: number): string {
  return (num || 0).toLocaleString();
}

function formatTokens(tokens: number): string {
  if (tokens >= 1_000_000) return `${(tokens / 1_000_000).toFixed(2)}M`;
  if (tokens >= 1_000) return `${(tokens / 1_000).toFixed(1)}K`;
  return String(tokens || 0);
}

function formatChars(chars: number): string {
  if (chars >= 1_000_000) return `${(chars / 1_000_000).toFixed(1)}M`;
  if (chars >= 1_000) return `${(chars / 1_000).toFixed(1)}K`;
  return String(chars || 0);
}

function formatHour(timestamp: string): string {
  try {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return timestamp;
  }
}

export function CachePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { t, tt } = useI18n();

  const [activeView, setActiveView] = useState<CacheViewType>("prompt");
  const [timeRange, setTimeRange] = useState<TimeRangeType>("24h");
  const [entriesSearch, setEntriesSearch] = useState("");
  const [entriesPage, setEntriesPage] = useState(1);
  const [expandedReasoningId, setExpandedReasoningId] = useState<string | null>(null);

  // 1. Full Cache Stats Query
  const cacheQuery = useQuery({
    queryKey: ["cache-full-stats", timeRange],
    queryFn: () =>
      cacheAnalyticsApi.getFullStats({
        trendHours: timeRange === "1h" ? 1 : timeRange === "24h" ? 24 : timeRange === "7d" ? 168 : 720,
      }),
    refetchInterval: 10000,
  });

  // 1.2 Cache Health Query (Shiguang Gateway parity)
  const healthQuery = useQuery({
    queryKey: ["cache-health-summary", timeRange],
    queryFn: () => cacheAnalyticsApi.getCacheHealth({ range: timeRange }),
    refetchInterval: 10000,
  });

  // 2. Semantic Entries Query
  const entriesQuery = useQuery({
    queryKey: ["cache-semantic-entries", entriesPage, entriesSearch],
    queryFn: () =>
      cacheAnalyticsApi.getEntries({
        page: entriesPage,
        limit: 10,
        search: entriesSearch,
      }),
    enabled: activeView === "semantic",
  });

  // 3. Reasoning Cache Query
  const reasoningQuery = useQuery({
    queryKey: ["cache-reasoning-stats"],
    queryFn: () => cacheAnalyticsApi.getReasoning({ limit: 50 }),
    enabled: activeView === "reasoning",
    refetchInterval: 10000,
  });

  // Clear Global / Semantic Cache Mutation
  const clearCacheMutation = useMutation({
    mutationFn: () => cacheAnalyticsApi.clearCache(),
    onSuccess: (data) => {
      messageApi.success(
        t("cache.clearSuccess", { count: data.cleared ?? 0 }, `语义缓存已清空，已删除 ${data.cleared ?? 0} 条记录。`)
      );
      void queryClient.invalidateQueries({ queryKey: ["cache-full-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["cache-semantic-entries"] });
    },
    onError: () => {
      messageApi.error(t("cache.clearError", undefined, "清除缓存失败。"));
    },
  });

  // Delete Single Semantic Entry Mutation
  const deleteEntryMutation = useMutation({
    mutationFn: (signature: string) => cacheAnalyticsApi.deleteEntry(signature),
    onSuccess: () => {
      messageApi.success(tt("已删除该条语义缓存", "Deleted semantic cache entry"));
      void queryClient.invalidateQueries({ queryKey: ["cache-semantic-entries"] });
      void queryClient.invalidateQueries({ queryKey: ["cache-full-stats"] });
    },
    onError: () => {
      messageApi.error(tt("删除失败", "Failed to delete entry"));
    },
  });

  // Clear Reasoning Cache Mutation
  const clearReasoningMutation = useMutation({
    mutationFn: () => cacheAnalyticsApi.clearReasoning(),
    onSuccess: (data) => {
      messageApi.success(
        t("cache.reasoningClearSuccess", { count: data.cleared ?? 0 }, `已清除 ${data.cleared ?? 0} 个推理缓存条目`)
      );
      void queryClient.invalidateQueries({ queryKey: ["cache-reasoning-stats"] });
      void queryClient.invalidateQueries({ queryKey: ["cache-full-stats"] });
    },
    onError: () => {
      messageApi.error(t("cache.reasoningClearError", undefined, "清除推理缓存失败"));
    },
  });

  const stats: FullCacheStatsResponse | undefined = cacheQuery.data;
  const healthData: CacheHealthResponse | undefined = healthQuery.data ?? stats?.promptCache?.health;
  const sc = stats?.semanticCache;
  const pc = stats?.promptCache;
  const trend = stats?.trend ?? [];
  const idp = stats?.idempotency;
  const semanticCacheEnabled = stats?.config?.semanticCacheEnabled !== false;

  // Prompt metrics
  const promptCacheRate =
    pc && pc.totalRequests > 0 ? (pc.requestsWithCacheControl / pc.totalRequests) * 100 : 0;
  const promptReuseRatio =
    pc && pc.totalInputTokens > 0 ? (pc.totalCachedTokens / pc.totalInputTokens) * 100 : 0;
  const writeReadRatio = healthData
    ? healthData.writeReadRatio
    : pc && pc.totalCachedTokens > 0
      ? pc.totalCacheCreationTokens / Math.max(pc.totalCachedTokens, 1)
      : 0;

  // Semantic metrics
  const semanticHitRate = sc ? parseFloat(sc.hitRate) || 0 : 0;
  const semanticTotalRequests = sc ? sc.hits + sc.misses : 0;

  // Providers list
  const providerEntries = pc
    ? Object.entries(pc.byProvider).sort(([, a], [, b]) => {
        const aReq = a.cachedRequests ?? a.requests;
        const bReq = b.cachedRequests ?? b.requests;
        return bReq - aReq;
      })
    : [];

  // 24h Trend Chart Data with 24-hour persistent timeline skeleton protection
  const trendChartData = useMemo(() => {
    if (!trend || trend.length === 0) {
      const now = Date.now();
      return Array.from({ length: 24 }).map((_, i) => {
        const ts = new Date(now - (23 - i) * 3600 * 1000).toISOString();
        return {
          timestamp: ts,
          hour: formatHour(ts),
          requests: 0,
          cachedRequests: 0,
          cachedTokens: 0,
          cacheRate: 0,
          inputTokens: 0,
          cacheCreationTokens: 0,
        };
      });
    }

    return trend.map((p) => {
      const rate = p.requests > 0 ? (p.cachedRequests / p.requests) * 100 : 0;
      return {
        ...p,
        hour: formatHour(p.timestamp),
        cacheRate: parseFloat(rate.toFixed(1)),
      };
    });
  }, [trend]);

  // Trend summary KPIs
  const totalCachedRequests24h = trend.reduce((sum, p) => sum + p.cachedRequests, 0);
  const busiestHour =
    trend.length > 0
      ? trend.reduce((best, p) => (p.requests > best.requests ? p : best))
      : null;
  const peakCacheRatePoint =
    trend.length > 0
      ? trend.reduce((best, p) => {
          const bestRate = best.requests > 0 ? best.cachedRequests / best.requests : 0;
          const curRate = p.requests > 0 ? p.cachedRequests / p.requests : 0;
          return curRate > bestRate ? p : best;
        })
      : null;
  const peakCacheRate =
    peakCacheRatePoint && peakCacheRatePoint.requests > 0
      ? (peakCacheRatePoint.cachedRequests / peakCacheRatePoint.requests) * 100
      : 0;

  // Time ago helper for reasoning entries
  const getTimeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return t("cache.justNow", undefined, "刚刚");
    if (minutes < 60) return t("cache.minutesAgo", { minutes }, `${minutes} 分钟前`);
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return t("cache.hoursAgo", { hours }, `${hours} 小时前`);
    const days = Math.floor(hours / 24);
    return t("cache.daysAgo", { days }, `${days} 天前`);
  };

  const verdict = healthData?.verdict ?? "healthy";
  const verdictColor =
    verdict === "healthy" ? "green" : verdict === "degraded" ? "warning" : verdict === "thrash" ? "error" : "default";

  if (cacheQuery.isLoading && !cacheQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "18px 22px" } }}>
        <Flex justify="space-between" align="center" wrap gap={14}>
          <Flex align="center" gap={14}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 12,
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="cached" size={28} />
            </div>
            <div>
              <Flex align="center" gap={8} wrap>
                <Title level={4} style={{ margin: 0, fontSize: 19 }}>
                  {t("cache.title", undefined, "缓存管理与分析")}
                </Title>
                <Tag color="emerald" style={{ fontWeight: 600 }}>
                  {t("cache.cacheRate", undefined, "Prompt 缓存率")} {promptCacheRate.toFixed(1)}%
                </Tag>
                <Tag color="blue" style={{ fontWeight: 600 }}>
                  {t("cache.hitRate", undefined, "语义命中率")} {semanticHitRate.toFixed(1)}%
                </Tag>
                <Tag color={verdictColor} style={{ textTransform: "uppercase", fontWeight: 700 }}>
                  {verdict === "healthy" ? "健康 (Healthy)" : verdict === "degraded" ? "亚健康 (Degraded)" : verdict === "thrash" ? "前缀抖动 (Thrash)" : "无数据"}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t(
                  "cache.description",
                  undefined,
                  "深度监控提供者侧 Prompt Cache 读写效率与前缀集中度，以及本地 Semantic Cache 与深度思考链 (Reasoning) 的响应复用指标。"
                )}
              </Text>
            </div>
          </Flex>

          <Space size="middle" wrap>
            <Segmented<TimeRangeType>
              value={timeRange}
              onChange={(val) => setTimeRange(val)}
              options={[
                { label: "1 小时", value: "1h" },
                { label: "24 小时", value: "24h" },
                { label: "7 天", value: "7d" },
                { label: "30 天", value: "30d" },
              ]}
            />

            <Button
              icon={<MaterialIcon name="refresh" size={16} />}
              onClick={() => {
                void cacheQuery.refetch();
                void healthQuery.refetch();
                if (activeView === "semantic") void entriesQuery.refetch();
                if (activeView === "reasoning") void reasoningQuery.refetch();
              }}
              loading={cacheQuery.isFetching}
            >
              {t("cache.refresh", undefined, "刷新")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 2. Top View Switcher (Segmented) */}
      <Flex justify="flex-start">
        <Segmented<CacheViewType>
          value={activeView}
          onChange={(val) => setActiveView(val)}
          options={[
            {
              label: (
                <Flex align="center" gap={8} style={{ padding: "6px 12px" }}>
                  <MaterialIcon name="bolt" size={18} />
                  <span style={{ fontWeight: 600 }}>{t("cache.promptCache", undefined, "Prompt 缓存与健康度")}</span>
                </Flex>
              ),
              value: "prompt",
            },
            {
              label: (
                <Flex align="center" gap={8} style={{ padding: "6px 12px" }}>
                  <MaterialIcon name="database" size={18} />
                  <span style={{ fontWeight: 600 }}>{t("cache.semanticCache", undefined, "语义缓存 (Semantic)")}</span>
                </Flex>
              ),
              value: "semantic",
            },
            {
              label: (
                <Flex align="center" gap={8} style={{ padding: "6px 12px" }}>
                  <MaterialIcon name="psychology" size={18} />
                  <span style={{ fontWeight: 600 }}>{t("cache.reasoningCache", undefined, "推理思考链回放 (Reasoning)")}</span>
                </Flex>
              ),
              value: "reasoning",
            },
          ]}
        />
      </Flex>

      {/* 3. VIEW 1: Prompt Cache & Health */}
      {activeView === "prompt" && (
        <Card className={styles.sectionCard} styles={{ body: { padding: 22 } }}>
          <Flex vertical gap={22}>
            {/* Header info & health summary note */}
            <Flex justify="space-between" align="flex-start" wrap gap={12}>
              <div>
                <Flex align="center" gap={8}>
                  <Tag color="green" style={{ textTransform: "uppercase", fontWeight: 600 }}>
                    <MaterialIcon name="bolt" size={14} /> {t("cache.promptCache", undefined, "Prompt 缓存指标")}
                  </Tag>
                  <Tag color={verdictColor} style={{ fontWeight: 600 }}>
                    {verdict === "healthy" ? "前缀热循环正常" : verdict === "degraded" ? "部分前缀重构频繁" : "前缀抖动严重"}
                  </Tag>
                </Flex>
                <Title level={4} style={{ margin: "6px 0 2px 0", fontSize: 17 }}>
                  {t("cache.promptCache", undefined, "Prompt 缓存健康度与前缀重用")}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {t(
                    "cache.promptCacheSectionDesc",
                    undefined,
                    "健康的热循环只在首轮写入一次前缀，后续仅支付增量。当极少数调用承载了绝大部分写入时，表明前缀被频繁重构（客户端历史被重写或轮换了请求上下文）。"
                  )}
                </Text>
              </div>
              {pc && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {t("cache.lastUpdated", undefined, "上次更新")}: {new Date(pc.lastUpdated).toLocaleString()}
                </Text>
              )}
            </Flex>

            {/* 6 Primary Hero KPI Stat Cards */}
            {pc ? (
              <>
                <Row gutter={[14, 14]}>
                  <Col xs={24} sm={12} lg={4}>
                    <div className={styles.heroStatCard}>
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="speed" size={18} style={{ color: "#10b981" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("cache.cacheRate", undefined, "缓存覆盖率")}
                        </Text>
                      </Flex>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981", margin: "10px 0 4px" }}>
                        {promptCacheRate.toFixed(1)}%
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {formatNumber(pc.requestsWithCacheControl)} / {formatNumber(pc.totalRequests)}{" "}
                        {t("cache.requestsShort", undefined, "请求携带标记")}
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={4}>
                    <div className={styles.heroStatCard}>
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="savings" size={18} style={{ color: "#3b82f6" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("cache.cacheReuseRatio", undefined, "缓存复用率")}
                        </Text>
                      </Flex>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6", margin: "10px 0 4px" }}>
                        {promptReuseRatio.toFixed(1)}%
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {t("cache.cacheReuseRatioDesc", undefined, "缓存读取 / 输入 Tokens 总量")}
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={4}>
                    <div className={styles.heroStatCard}>
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="compare_arrows" size={18} style={{ color: writeReadRatio > 0.2 ? "#f59e0b" : "#10b981" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          写/读比率 (W/R)
                        </Text>
                      </Flex>
                      <div style={{ fontSize: 24, fontWeight: 700, color: writeReadRatio > 0.2 ? "#f59e0b" : "#10b981", margin: "10px 0 4px" }}>
                        {writeReadRatio.toFixed(3)}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        低于 0.20 代表极佳热循环
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={4}>
                    <div className={styles.heroStatCard}>
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="token" size={18} style={{ color: "#06b6d4" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("cache.cachedTokens", undefined, "缓存读取 Tokens")}
                        </Text>
                      </Flex>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#06b6d4", margin: "10px 0 4px" }}>
                        {formatTokens(pc.totalCachedTokens)}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {t("cache.cachedTokensRead", undefined, "从上游提供商缓存读取")}
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={4}>
                    <div className={styles.heroStatCard}>
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="upload" size={18} style={{ color: "#a855f7" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("cache.cacheCreationTokens", undefined, "缓存写入 Tokens")}
                        </Text>
                      </Flex>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#a855f7", margin: "10px 0 4px" }}>
                        {formatTokens(pc.totalCacheCreationTokens)}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {t("cache.cacheCreationWrite", undefined, "前缀创建与更新写入")}
                      </Text>
                    </div>
                  </Col>

                  <Col xs={24} sm={12} lg={4}>
                    <div className={styles.heroStatCard}>
                      <Flex align="center" gap={6}>
                        <MaterialIcon name="attach_money" size={18} style={{ color: "#10b981" }} />
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("cache.estCostSaved", undefined, "预估节省费用")}
                        </Text>
                      </Flex>
                      <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981", margin: "10px 0 4px" }}>
                        ${pc.estimatedCostSaved.toFixed(4)}
                      </div>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {healthData ? `${formatNumber(healthData.warmCalls)} 热调用 · ${formatNumber(healthData.coldCalls)} 冷启动` : "基于缓存折扣计费"}
                      </Text>
                    </div>
                  </Col>
                </Row>

                {/* Shiguang Gateway Parity: Where the writes are concentrated (Outlier Analysis) */}
                {healthData && (
                  <div className={styles.concentrationCard}>
                    <Flex vertical gap={12}>
                      <Flex justify="space-between" align="baseline" wrap gap={8}>
                        <Flex align="center" gap={6}>
                          <MaterialIcon name="grain" size={18} style={{ color: "#f59e0b" }} />
                          <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                            写入集中度与前缀重建分析 (Write Concentration & Outliers)
                          </Title>
                        </Flex>
                        <Tag color="default">
                          离群阈值 &gt; {formatNumber(healthData.heavyWriteThreshold)} tokens
                        </Tag>
                      </Flex>

                      <div style={{ fontSize: 14 }}>
                        <strong style={{ color: "#10b981" }}>{(healthData.heavyWriteCallShare * 100).toFixed(1)}%</strong>{" "}
                        的请求调用承载了{" "}
                        <strong style={{ color: healthData.heavyWriteTokenShare > 0.75 ? "#ef4444" : "#f59e0b" }}>
                          {(healthData.heavyWriteTokenShare * 100).toFixed(1)}%
                        </strong>{" "}
                        的全部写入 Token（共 {formatNumber(healthData.heavyWriteCalls)} 次调用触发深度重建）。
                      </div>

                      <Progress
                        percent={Math.min(100, parseFloat((healthData.heavyWriteTokenShare * 100).toFixed(1)))}
                        strokeColor={healthData.heavyWriteTokenShare > 0.75 ? "#ef4444" : "#f59e0b"}
                        showInfo={false}
                        style={{ margin: "2px 0 6px 0" }}
                      />

                      <Row gutter={[10, 10]}>
                        <Col xs={12} sm={6}>
                          <div className={styles.percentileCard}>
                            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>p50 (中位数)</Text>
                            <div style={{ fontSize: 17, fontWeight: 700, marginTop: 2 }}>
                              {formatNumber(healthData.writeP50)} tok
                            </div>
                          </div>
                        </Col>
                        <Col xs={12} sm={6}>
                          <div className={styles.percentileCard}>
                            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>p90 分位数</Text>
                            <div style={{ fontSize: 17, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
                              {formatNumber(healthData.writeP90)} tok
                            </div>
                          </div>
                        </Col>
                        <Col xs={12} sm={6}>
                          <div className={styles.percentileCard}>
                            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>p99 分位数</Text>
                            <div style={{ fontSize: 17, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>
                              {formatNumber(healthData.writeP99)} tok
                            </div>
                          </div>
                        </Col>
                        <Col xs={12} sm={6}>
                          <div className={styles.percentileCard}>
                            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>MAX 最大峰值</Text>
                            <div style={{ fontSize: 17, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>
                              {formatNumber(healthData.writeMax)} tok
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Flex>
                  </div>
                )}

                {/* 24-Hour Dual-Axis Trend Panel with Recharts */}
                <div className={styles.subCard}>
                  <Flex vertical gap={14}>
                    <Flex justify="space-between" align="flex-start" wrap gap={10}>
                      <div>
                        <Flex align="center" gap={6}>
                          <MaterialIcon name="timeline" size={18} style={{ color: "#10b981" }} />
                          <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                            {t("cache.trend24h", undefined, "24 小时缓存活动时间线 (Activity Timeline)")}
                          </Title>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t(
                            "cache.promptTrendDesc",
                            undefined,
                            "按小时展示请求总量、缓存请求量、缓存读取 Tokens 及缓存命中率的变化曲线。"
                          )}
                        </Text>
                      </div>

                      <Space size="middle">
                        <Tag color="emerald">
                          24h 缓存请求: {formatNumber(totalCachedRequests24h)}
                        </Tag>
                        <Tag color="blue">
                          最繁忙时段: {busiestHour ? formatHour(busiestHour.timestamp) : "--"}
                        </Tag>
                        <Tag color="orange">
                          最高缓存率: {peakCacheRate.toFixed(1)}%
                        </Tag>
                      </Space>
                    </Flex>

                    {/* Visual Recharts Composed Chart */}
                    <div className={styles.chartContainer}>
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={trendChartData} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.15)" />
                          <XAxis dataKey="hour" stroke="#888" fontSize={11} tickLine={false} />
                          <YAxis yAxisId="left" stroke="#888" fontSize={11} tickLine={false} />
                          <YAxis yAxisId="right" orientation="right" stroke="#888" fontSize={11} tickLine={false} tickFormatter={(v) => `${v}%`} />
                          <RechartsTooltip
                            contentStyle={{
                              background: "rgba(20, 20, 25, 0.95)",
                              border: "1px solid rgba(255,255,255,0.15)",
                              borderRadius: 8,
                              fontSize: 12,
                            }}
                          />
                          <Bar yAxisId="left" dataKey="requests" name="总请求数" fill={CHART_COLORS.totalReq} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Bar yAxisId="left" dataKey="cachedRequests" name="缓存命中请求" fill={CHART_COLORS.cachedReq} radius={[4, 4, 0, 0]} maxBarSize={28} />
                          <Line yAxisId="right" type="monotone" dataKey="cacheRate" name="缓存率 %" stroke={CHART_COLORS.cacheRate} strokeWidth={2.5} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </Flex>
                </div>

                {/* By Model Table (Worst Ratio First - Shiguang Gateway Feature) */}
                {healthData && healthData.byModel.length > 0 && (
                  <div className={styles.subCard}>
                    <Flex vertical gap={12}>
                      <Flex justify="space-between" align="center" wrap gap={8}>
                        <div>
                          <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                            按模型细分（写读比率由差到好排序）
                          </Title>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            高写读比的模型代表前缀频繁丢失或频繁重构，需要重点优化上下文固定策略。
                          </Text>
                        </div>
                        <Tag color="default">共 {healthData.byModel.length} 个活跃模型</Tag>
                      </Flex>

                      <Table
                        rowKey="model"
                        pagination={false}
                        dataSource={healthData.byModel}
                        columns={[
                          {
                            title: tt("模型", "Model"),
                            dataIndex: "model",
                            key: "model",
                            render: (m: string) => <Text code strong>{m}</Text>,
                          },
                          {
                            title: tt("调用数", "Calls"),
                            dataIndex: "calls",
                            key: "calls",
                            align: "right",
                            render: (c: number) => <Text>{formatNumber(c)}</Text>,
                          },
                          {
                            title: tt("缓存读取", "Tokens Read"),
                            dataIndex: "cacheReadTotal",
                            key: "read",
                            align: "right",
                            render: (r: number) => (
                              <Text strong style={{ color: "#06b6d4" }}>
                                {formatTokens(r)}
                              </Text>
                            ),
                          },
                          {
                            title: tt("缓存写入", "Tokens Written"),
                            dataIndex: "cacheWriteTotal",
                            key: "write",
                            align: "right",
                            render: (w: number) => (
                              <Text style={{ color: "#a855f7" }}>
                                {formatTokens(w)}
                              </Text>
                            ),
                          },
                          {
                            title: tt("写读比率", "Write/Read Ratio"),
                            dataIndex: "writeReadRatio",
                            key: "ratio",
                            align: "right",
                            render: (ratio: number) => {
                              const color = ratio > 1 ? "error" : ratio > 0.2 ? "warning" : "success";
                              return (
                                <Tag color={color} style={{ fontWeight: 600 }}>
                                  {ratio.toFixed(3)}
                                </Tag>
                              );
                            },
                          },
                          {
                            title: tt("重写离群调用", "Heavy Write Calls"),
                            dataIndex: "heavyWriteCalls",
                            key: "heavy",
                            align: "right",
                            render: (h: number) => (
                              <Text type={h > 0 ? "danger" : "secondary"}>{formatNumber(h)}</Text>
                            ),
                          },
                        ]}
                      />
                    </Flex>
                  </div>
                )}

                {/* By Provider Table */}
                <div className={styles.subCard}>
                  <Flex vertical gap={12}>
                    <div>
                      <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                        {t("cache.byProvider", undefined, "按提供者分类统计 (By Provider)")}
                      </Title>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t(
                          "cache.providerCacheRateDesc",
                          undefined,
                          "每个提供者都会直接展示总输入 token、cache read token 和 cache write token，方便对照原始数据判断比率是否可靠。"
                        )}
                      </Text>
                    </div>

                    <Table
                      rowKey={(r) => r[0]}
                      pagination={false}
                      dataSource={providerEntries}
                      columns={[
                        {
                          title: t("cache.provider", undefined, "提供者"),
                          key: "provider",
                          render: (_, [prov, data]) => {
                            const totalReq = data.totalRequests ?? (data.cachedRequests ?? data.requests);
                            return (
                              <div>
                                <Text strong style={{ textTransform: "capitalize" }}>
                                  {prov}
                                </Text>
                                <div style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                                  {formatNumber(totalReq)} {t("cache.requests", undefined, "请求数")}
                                </div>
                              </div>
                            );
                          },
                        },
                        {
                          title: t("cache.inputTokens", undefined, "输入 Tokens 总计"),
                          key: "inputTokens",
                          render: (_, [, data]) => <Text>{formatTokens(data.inputTokens)}</Text>,
                        },
                        {
                          title: t("cache.cachedTokensCol", undefined, "缓存读取"),
                          key: "cachedTokens",
                          render: (_, [, data]) => (
                            <Text strong style={{ color: "#06b6d4" }}>
                              {formatTokens(data.cachedTokens)}
                            </Text>
                          ),
                        },
                        {
                          title: t("cache.cacheCreation", undefined, "缓存写入"),
                          key: "cacheCreation",
                          render: (_, [, data]) => (
                            <Text style={{ color: "#a855f7" }}>{formatTokens(data.cacheCreationTokens)}</Text>
                          ),
                        },
                        {
                          title: t("cache.cacheReuseRatio", undefined, "缓存复用率"),
                          key: "reuseRatio",
                          render: (_, [, data]) => {
                            const ratio =
                              data.inputTokens > 0 ? (data.cachedTokens / data.inputTokens) * 100 : 0;
                            return (
                              <Flex align="center" gap={8}>
                                <Progress percent={parseFloat(ratio.toFixed(1))} style={{ width: 90 }} showInfo={false} strokeColor="#3b82f6" />
                                <Text strong style={{ color: "#3b82f6" }}>
                                  {ratio.toFixed(1)}%
                                </Text>
                              </Flex>
                            );
                          },
                        },
                        {
                          title: t("cache.cacheRate", undefined, "缓存率"),
                          key: "cacheRate",
                          render: (_, [, data]) => {
                            const cached = data.cachedRequests ?? data.requests;
                            const total = data.totalRequests ?? cached;
                            const rate = total > 0 ? (cached / total) * 100 : 0;
                            return (
                              <Flex align="center" gap={8}>
                                <Progress percent={parseFloat(rate.toFixed(1))} style={{ width: 90 }} showInfo={false} strokeColor="#10b981" />
                                <Text strong style={{ color: "#10b981" }}>
                                  {rate.toFixed(1)}%
                                </Text>
                              </Flex>
                            );
                          },
                        },
                        {
                          title: t("cache.cachedRequests", undefined, "缓存请求数"),
                          key: "cachedRequests",
                          render: (_, [, data]) => {
                            const cached = data.cachedRequests ?? data.requests;
                            const total = data.totalRequests ?? cached;
                            return (
                              <Text>
                                {formatNumber(cached)} / {formatNumber(total)}
                              </Text>
                            );
                          },
                        },
                      ]}
                    />
                  </Flex>
                </div>
              </>
            ) : (
              <div style={{ textAlign: "center", padding: 32, color: "var(--ant-color-text-secondary)" }}>
                {t("cache.noPromptCacheData", undefined, "暂时还没有记录到提供者侧 prompt cache 活动。")}
              </div>
            )}
          </Flex>
        </Card>
      )}

      {/* 4. VIEW 2: Semantic Cache */}
      {activeView === "semantic" && (
        <Card className={styles.sectionCard} styles={{ body: { padding: 22 } }}>
          <Flex vertical gap={22}>
            {/* Header with status badge & Clear All Button */}
            <Flex justify="space-between" align="flex-start" wrap gap={12}>
              <div>
                <Flex align="center" gap={8}>
                  <Tag color={semanticCacheEnabled ? "green" : "warning"} style={{ fontWeight: 600 }}>
                    <MaterialIcon name={semanticCacheEnabled ? "database" : "block"} size={14} />{" "}
                    {t("cache.semanticCache", undefined, "语义响应缓存")}
                  </Tag>
                  <Tag color={semanticCacheEnabled ? "green" : "default"}>
                    {semanticCacheEnabled ? tt("已启用", "Enabled") : tt("已禁用", "Disabled")}
                  </Tag>
                </Flex>
                <Title level={4} style={{ margin: "6px 0 2px 0", fontSize: 17 }}>
                  {t("cache.semanticCache", undefined, "确定性语义响应缓存 (Semantic Cache)")}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {t(
                    "cache.semanticCacheSectionDesc",
                    undefined,
                    "ShiguangGateway 本地维护的确定性响应缓存。开启后，重复的非流式、temperature=0 请求可以直接在本地极速命中，不再访问上游 provider，节省 100% 费用与延迟。"
                  )}
                </Text>
              </div>

              <Popconfirm
                title={tt("确定要清空所有语义缓存吗？", "Clear all semantic cache entries?")}
                onConfirm={() => clearCacheMutation.mutate()}
                okText={tt("立即清空", "Clear Now")}
                cancelText={tt("取消", "Cancel")}
              >
                <Button
                  danger
                  icon={<MaterialIcon name="delete_sweep" size={16} />}
                  loading={clearCacheMutation.isPending}
                >
                  {t("cache.clearAll", undefined, "清空语义缓存")}
                </Button>
              </Popconfirm>
            </Flex>

            {!semanticCacheEnabled && (
              <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(245, 158, 11, 0.1)", border: "1px solid rgba(245, 158, 11, 0.3)", color: "#d97706", fontSize: 13 }}>
                {t(
                  "cache.semanticCacheDisabledDesc",
                  undefined,
                  "Semantic Cache 当前已禁用。重新在设置中开启之前，ShiguangGateway 不会再做本地响应复用。"
                )}
              </div>
            )}

            {/* 4 Hero Stat Cards */}
            <Row gutter={[14, 14]}>
              <Col xs={24} sm={12} lg={6}>
                <div className={styles.heroStatCard}>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="memory" size={18} style={{ color: "#3b82f6" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("cache.memoryEntries", undefined, "内存缓存条目")}
                    </Text>
                  </Flex>
                  <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0 4px" }}>
                    {formatNumber(sc?.memoryEntries ?? 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t("cache.memoryEntriesSub", undefined, "内存 LRU 极速缓存")}
                  </Text>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className={styles.heroStatCard}>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="storage" size={18} style={{ color: "#a855f7" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("cache.dbEntries", undefined, "持久化数据库条目")}
                    </Text>
                  </Flex>
                  <div style={{ fontSize: 24, fontWeight: 700, margin: "10px 0 4px" }}>
                    {formatNumber(sc?.dbEntries ?? 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t("cache.dbEntriesSub", undefined, "已持久化至本地 SQLite")}
                  </Text>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className={styles.heroStatCard}>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="trending_up" size={18} style={{ color: "#10b981" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("cache.cacheHits", undefined, "缓存命中总数")}
                    </Text>
                  </Flex>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981", margin: "10px 0 4px" }}>
                    {formatNumber(sc?.hits ?? 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t("cache.cacheHitsSub", { total: semanticTotalRequests }, `共 ${semanticTotalRequests} 次总查询`)}
                  </Text>
                </div>
              </Col>

              <Col xs={24} sm={12} lg={6}>
                <div className={styles.heroStatCard}>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="token" size={18} style={{ color: "#06b6d4" }} />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {t("cache.tokensSaved", undefined, "节省的 Tokens")}
                    </Text>
                  </Flex>
                  <div style={{ fontSize: 24, fontWeight: 700, color: "#06b6d4", margin: "10px 0 4px" }}>
                    {formatTokens(sc?.tokensSaved ?? 0)}
                  </div>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {t("cache.tokensSavedSub", undefined, "根据命中次数与完整响应估算")}
                  </Text>
                </div>
              </Col>
            </Row>

            {/* Performance & Behavior Two-Column Section */}
            <Row gutter={[14, 14]}>
              {/* Left Column: Performance */}
              <Col xs={24} lg={12}>
                <div className={styles.subCard} style={{ height: "100%" }}>
                  <Flex vertical gap={14}>
                    <Flex justify="space-between" align="center">
                      <div>
                        <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                          {t("cache.performance", undefined, "缓存性能指标")}
                        </Title>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {t("cache.autoRefresh", { seconds: 10 }, "每 10 秒自动刷新")}
                        </Text>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 26, fontWeight: 700, color: "#10b981" }}>
                          {semanticHitRate.toFixed(1)}%
                        </div>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {t("cache.hitRate", undefined, "命中率")}
                        </Text>
                      </div>
                    </Flex>

                    <div>
                      <Progress
                        percent={parseFloat(semanticHitRate.toFixed(1))}
                        strokeColor="#10b981"
                        style={{ margin: "8px 0 4px 0" }}
                      />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {formatNumber(sc?.hits ?? 0)} {t("cache.hits", undefined, "命中次数")} /{" "}
                        {formatNumber(semanticTotalRequests)} {t("cache.total", undefined, "总计")}
                      </Text>
                    </div>

                    <Row gutter={[10, 10]} style={{ marginTop: 4 }}>
                      <Col span={8}>
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ant-color-bg-container)", border: "1px solid var(--ant-color-border-secondary)", textAlign: "center" }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{t("cache.hits", undefined, "命中次数")}</Text>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
                            {formatNumber(sc?.hits ?? 0)}
                          </div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ant-color-bg-container)", border: "1px solid var(--ant-color-border-secondary)", textAlign: "center" }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{t("cache.misses", undefined, "未命中次数")}</Text>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>
                            {formatNumber(sc?.misses ?? 0)}
                          </div>
                        </div>
                      </Col>
                      <Col span={8}>
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ant-color-bg-container)", border: "1px solid var(--ant-color-border-secondary)", textAlign: "center" }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{t("cache.total", undefined, "总计")}</Text>
                          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                            {formatNumber(semanticTotalRequests)}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </Flex>
                </div>
              </Col>

              {/* Right Column: Behavior & Idempotency */}
              <Col xs={24} lg={12}>
                <Flex vertical gap={14}>
                  <div className={styles.subCard}>
                    <Title level={5} style={{ margin: "0 0 10px 0", fontSize: 15 }}>
                      {t("cache.behavior", undefined, "缓存机制与规则")}
                    </Title>
                    <Flex vertical gap={8}>
                      <div className={styles.infoRow}>
                        <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                        <span>{t("cache.behaviorDeterministic", undefined, "仅缓存 temperature=0 的确定性非流式请求。")}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                        <span>
                          {t(
                            "cache.behaviorBypass",
                            { header: "X-ShiguangGateway-No-Cache: true" },
                            "通过请求头 X-ShiguangGateway-No-Cache: true 可强制绕过缓存直达上游。"
                          )}
                        </span>
                      </div>
                      <div className={styles.infoRow}>
                        <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                        <span>{t("cache.behaviorTwoTier", undefined, "双层存储：内存 LRU（毫秒级）+ SQLite（重启后持久化）。")}</span>
                      </div>
                      <div className={styles.infoRow}>
                        <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                        <span>
                          {t(
                            "cache.behaviorTtl",
                            { envVar: "SEMANTIC_CACHE_TTL_MS" },
                            "默认 TTL：30 分钟。可通过 SEMANTIC_CACHE_TTL_MS 环境变量配置。"
                          )}
                        </span>
                      </div>
                    </Flex>
                  </div>

                  <div className={styles.subCard}>
                    <Flex align="center" gap={6} style={{ marginBottom: 10 }}>
                      <MaterialIcon name="fingerprint" size={18} style={{ color: "#f59e0b" }} />
                      <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                        {t("cache.idempotency", undefined, "幂等防重放层 (Idempotency Layer)")}
                      </Title>
                    </Flex>
                    <Row gutter={[12, 12]}>
                      <Col span={12}>
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ant-color-bg-container)", border: "1px solid var(--ant-color-border-secondary)" }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{t("cache.activeDedupKeys", undefined, "当前活跃去重键")}</Text>
                          <div style={{ fontSize: 16, fontWeight: 700, marginTop: 2 }}>
                            {formatNumber(idp?.activeKeys ?? 0)}
                          </div>
                        </div>
                      </Col>
                      <Col span={12}>
                        <div style={{ padding: "10px 12px", borderRadius: 8, background: "var(--ant-color-bg-container)", border: "1px solid var(--ant-color-border-secondary)" }}>
                          <Text type="secondary" style={{ fontSize: 11 }}>{t("cache.dedupWindow", undefined, "防重放滑动窗口")}</Text>
                          <div style={{ fontSize: 16, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
                            {idp ? `${(idp.windowMs / 1000).toFixed(0)}s` : "0s"}
                          </div>
                        </div>
                      </Col>
                    </Row>
                  </div>
                </Flex>
              </Col>
            </Row>

            {/* Semantic Cache Entries Explorer Table */}
            <div className={styles.subCard}>
              <Flex vertical gap={14}>
                <div>
                  <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                    {tt("语义缓存条目库 (Semantic Cache Entries)", "Semantic Cache Entries")}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t(
                      "cache.semanticEntriesDesc",
                      undefined,
                      "展示持久化保存在 SQLite 里的 semantic cache 记录，不包含上游 provider-side prompt cache 的活动。"
                    )}
                  </Text>
                </div>

                <Flex gap={10} wrap>
                  <Input
                    placeholder={t("cache.searchEntries", undefined, "搜索缓存签名或模型...")}
                    prefix={<MaterialIcon name="search" size={16} />}
                    value={entriesSearch}
                    onChange={(e) => setEntriesSearch(e.target.value)}
                    onPressEnter={() => {
                      setEntriesPage(1);
                      void entriesQuery.refetch();
                    }}
                    style={{ maxWidth: 360 }}
                    allowClear
                  />
                  <Button
                    icon={<MaterialIcon name="search" size={16} />}
                    onClick={() => {
                      setEntriesPage(1);
                      void entriesQuery.refetch();
                    }}
                  >
                    {t("cache.search", undefined, "搜索")}
                  </Button>
                </Flex>

                <Table<SemanticCacheItem>
                  rowKey="id"
                  loading={entriesQuery.isLoading}
                  pagination={false}
                  dataSource={entriesQuery.data?.entries ?? []}
                  columns={[
                    {
                      title: t("cache.signature", undefined, "签名哈希 (Signature)"),
                      dataIndex: "signature",
                      key: "signature",
                      render: (sig: string) => (
                        <Tooltip title={sig}>
                          <Text code style={{ fontSize: 12 }}>
                            {sig.slice(0, 20)}...
                          </Text>
                        </Tooltip>
                      ),
                    },
                    {
                      title: t("cache.model", undefined, "模型"),
                      dataIndex: "model",
                      key: "model",
                      render: (m: string) => <Tag color="blue">{m}</Tag>,
                    },
                    {
                      title: t("cache.hits", undefined, "命中次数"),
                      dataIndex: "hit_count",
                      key: "hit_count",
                      render: (hits: number) => <Text strong>{hits}</Text>,
                    },
                    {
                      title: t("cache.tokensSaved", undefined, "节省 Tokens"),
                      dataIndex: "tokens_saved",
                      key: "tokens_saved",
                      render: (tok: number) => (
                        <Text strong style={{ color: "#10b981" }}>
                          +{formatNumber(tok ?? 0)}
                        </Text>
                      ),
                    },
                    {
                      title: t("cache.created", undefined, "创建时间"),
                      dataIndex: "created_at",
                      key: "created_at",
                      render: (d: string) => (
                        <span style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                          {new Date(d).toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      title: t("cache.expires", undefined, "到期时间"),
                      dataIndex: "expires_at",
                      key: "expires_at",
                      render: (d: string) => (
                        <span style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                          {new Date(d).toLocaleString()}
                        </span>
                      ),
                    },
                    {
                      title: t("cache.actions", undefined, "操作"),
                      key: "action",
                      render: (_, item) => (
                        <Popconfirm
                          title={tt("确定删除该条缓存吗？", "Delete this cache entry?")}
                          onConfirm={() => deleteEntryMutation.mutate(item.signature)}
                          okText={tt("删除", "Delete")}
                          cancelText={tt("取消", "Cancel")}
                        >
                          <Button
                            danger
                            type="text"
                            icon={<MaterialIcon name="delete" size={16} />}
                            loading={deleteEntryMutation.isPending}
                          />
                        </Popconfirm>
                      ),
                    },
                  ]}
                />

                {/* Pagination */}
                {(entriesQuery.data?.pagination?.totalPages ?? 0) > 1 && (
                  <Flex justify="center" style={{ marginTop: 10 }}>
                    <Pagination
                      current={entriesPage}
                      total={entriesQuery.data?.pagination?.total ?? 0}
                      pageSize={entriesQuery.data?.pagination?.limit ?? 10}
                      onChange={(page) => setEntriesPage(page)}
                      showSizeChanger={false}
                    />
                  </Flex>
                )}
              </Flex>
            </div>
          </Flex>
        </Card>
      )}

      {/* 5. VIEW 3: Reasoning Cache */}
      {activeView === "reasoning" && (
        <Card className={styles.sectionCard} styles={{ body: { padding: 22 } }}>
          <Flex vertical gap={22}>
            {/* Header banner & clear reasoning button */}
            <Flex justify="space-between" align="flex-start" wrap gap={12}>
              <div>
                <Flex align="center" gap={8}>
                  <Tag color="blue" style={{ fontWeight: 600 }}>
                    <MaterialIcon name="psychology" size={14} /> {t("cache.reasoningCache", undefined, "推理回放")}
                  </Tag>
                </Flex>
                <Title level={4} style={{ margin: "6px 0 2px 0", fontSize: 17 }}>
                  {t("cache.reasoningCache", undefined, "推理思考链回放缓存 (Reasoning Cache)")}
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>
                  {t(
                    "cache.reasoningCacheDesc",
                    undefined,
                    "为多轮智能体与工具调用流程保留模型思考内容（针对 DeepSeek-R1、Kimi、Qwen-Thinking、GLM 等模型深度思考步骤进行捕获与重放，显著降低 TTFT 并节省算力）。"
                  )}
                </Text>
              </div>

              <Popconfirm
                title={tt("确定要清空所有推理缓存吗？", "Clear all reasoning cache entries?")}
                onConfirm={() => clearReasoningMutation.mutate()}
                okText={tt("立即清空", "Clear Now")}
                cancelText={tt("取消", "Cancel")}
              >
                <Button
                  danger
                  icon={<MaterialIcon name="delete_sweep" size={16} />}
                  loading={clearReasoningMutation.isPending}
                  disabled={(reasoningQuery.data?.stats?.totalEntries ?? 0) === 0}
                >
                  {t("cache.reasoningClearAll", undefined, "清空推理缓存")}
                </Button>
              </Popconfirm>
            </Flex>

            {/* 5 Hero KPI Stat Cards */}
            {reasoningQuery.data?.stats && (
              <Row gutter={[14, 14]}>
                <Col xs={24} sm={12} lg={5}>
                  <div className={styles.heroStatCard}>
                    <Flex align="center" gap={6}>
                      <MaterialIcon name="psychology" size={18} style={{ color: "#3b82f6" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t("cache.reasoningEntries", undefined, "活动条目总数")}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#3b82f6", margin: "10px 0 4px" }}>
                      {formatNumber(reasoningQuery.data.stats.totalEntries)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {reasoningQuery.data.stats.memoryEntries} memory / {reasoningQuery.data.stats.dbEntries} DB
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12} lg={5}>
                  <div className={styles.heroStatCard}>
                    <Flex align="center" gap={6}>
                      <MaterialIcon name="speed" size={18} style={{ color: "#10b981" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t("cache.reasoningReplayRate", undefined, "思考链回放率")}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981", margin: "10px 0 4px" }}>
                      {reasoningQuery.data.stats.replayRate}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      共 {formatNumber(reasoningQuery.data.stats.hits + reasoningQuery.data.stats.misses)} 次查询查找
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12} lg={4}>
                  <div className={styles.heroStatCard}>
                    <Flex align="center" gap={6}>
                      <MaterialIcon name="replay" size={18} style={{ color: "#06b6d4" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t("cache.reasoningReplays", undefined, "总回放次数")}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#06b6d4", margin: "10px 0 4px" }}>
                      {formatNumber(reasoningQuery.data.stats.replays)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {t("cache.reasoningBehaviorReplay", undefined, "零延迟重新注入思考上下文")}
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12} lg={5}>
                  <div className={styles.heroStatCard}>
                    <Flex align="center" gap={6}>
                      <MaterialIcon name="text_fields" size={18} style={{ color: "#a855f7" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t("cache.reasoningCharsCached", undefined, "已缓存字符数")}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#a855f7", margin: "10px 0 4px" }}>
                      {formatChars(reasoningQuery.data.stats.totalChars)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatNumber(reasoningQuery.data.stats.totalChars)} chars
                    </Text>
                  </div>
                </Col>

                <Col xs={24} sm={12} lg={5}>
                  <div className={styles.heroStatCard}>
                    <Flex align="center" gap={6}>
                      <MaterialIcon name="error_outline" size={18} style={{ color: "#ef4444" }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {t("cache.reasoningMisses", undefined, "缓存未命中")}
                      </Text>
                    </Flex>
                    <div style={{ fontSize: 24, fontWeight: 700, color: "#ef4444", margin: "10px 0 4px" }}>
                      {formatNumber(reasoningQuery.data.stats.misses)}
                    </div>
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {formatNumber(reasoningQuery.data.stats.hits)} 次成功命中
                    </Text>
                  </div>
                </Col>
              </Row>
            )}

            {/* By Provider & By Model Two-Column Section */}
            {reasoningQuery.data?.stats && (
              <Row gutter={[14, 14]}>
                {/* By Provider */}
                <Col xs={24} lg={12}>
                  <div className={styles.subCard}>
                    <Title level={5} style={{ margin: "0 0 12px 0", fontSize: 15 }}>
                      {t("cache.reasoningByProvider", undefined, "按提供者统计 (By Provider)")}
                    </Title>
                    <Table
                      rowKey={(r) => r[0]}
                      pagination={false}
                      dataSource={Object.entries(reasoningQuery.data.stats.byProvider)}
                      columns={[
                        {
                          title: t("cache.tableProvider", undefined, "提供者"),
                          key: "provider",
                          render: (_, [prov]) => <Text strong style={{ textTransform: "capitalize" }}>{prov}</Text>,
                        },
                        {
                          title: t("cache.reasoningEntries", undefined, "条目数"),
                          key: "entries",
                          render: (_, [, d]) => <Text>{formatNumber(d.entries)}</Text>,
                        },
                        {
                          title: t("cache.reasoningChars", undefined, "字符数"),
                          key: "chars",
                          render: (_, [, d]) => <Text style={{ color: "#a855f7" }}>{formatChars(d.chars)}</Text>,
                        },
                        {
                          title: t("cache.tableShare", undefined, "占比"),
                          key: "share",
                          render: (_, [, d]) => {
                            const total = reasoningQuery.data?.stats?.totalEntries || 1;
                            const share = ((d.entries / total) * 100).toFixed(1);
                            return (
                              <Flex align="center" gap={8}>
                                <Progress percent={parseFloat(share)} showInfo={false} strokeColor="#3b82f6" style={{ width: 70 }} />
                                <Text style={{ fontSize: 12 }}>{share}%</Text>
                              </Flex>
                            );
                          },
                        },
                      ]}
                    />
                  </div>
                </Col>

                {/* By Model */}
                <Col xs={24} lg={12}>
                  <div className={styles.subCard}>
                    <Title level={5} style={{ margin: "0 0 12px 0", fontSize: 15 }}>
                      {t("cache.reasoningByModel", undefined, "按模型统计 (By Model)")}
                    </Title>
                    <Table
                      rowKey={(r) => r[0]}
                      pagination={false}
                      dataSource={Object.entries(reasoningQuery.data.stats.byModel)}
                      columns={[
                        {
                          title: t("cache.tableModel", undefined, "模型"),
                          key: "model",
                          render: (_, [mdl]) => <Tag color="blue">{mdl}</Tag>,
                        },
                        {
                          title: t("cache.reasoningEntries", undefined, "条目数"),
                          key: "entries",
                          render: (_, [, d]) => <Text>{formatNumber(d.entries)}</Text>,
                        },
                        {
                          title: t("cache.reasoningAvgChars", undefined, "平均字符数"),
                          key: "avgChars",
                          render: (_, [, d]) => {
                            const avg = d.entries > 0 ? Math.round(d.chars / d.entries) : 0;
                            return <Text style={{ color: "#06b6d4" }}>{formatNumber(avg)}</Text>;
                          },
                        },
                        {
                          title: t("cache.reasoningChars", undefined, "总字符"),
                          key: "chars",
                          render: (_, [, d]) => <Text style={{ color: "#a855f7" }}>{formatChars(d.chars)}</Text>,
                        },
                      ]}
                    />
                  </div>
                </Col>
              </Row>
            )}

            {/* Recent Reasoning Entries Explorer Table */}
            <div className={styles.subCard}>
              <Flex vertical gap={14}>
                <div>
                  <Title level={5} style={{ margin: 0, fontSize: 15 }}>
                    {t("cache.reasoningRecentEntries", undefined, "最近思考链条目 (Recent Reasoning Entries)")}
                  </Title>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {t("cache.reasoningCacheDesc", undefined, "为多轮工具调用流程保留模型思考内容")}
                  </Text>
                </div>

                <Table<ReasoningCacheEntry>
                  rowKey="toolCallId"
                  loading={reasoningQuery.isLoading}
                  pagination={{ pageSize: 8 }}
                  dataSource={reasoningQuery.data?.entries ?? []}
                  columns={[
                    {
                      title: t("cache.reasoningToolCallId", undefined, "工具调用 ID"),
                      dataIndex: "toolCallId",
                      key: "toolCallId",
                      render: (id: string) => (
                        <Tooltip title={id}>
                          <Text code style={{ fontSize: 12 }}>
                            {id}
                          </Text>
                        </Tooltip>
                      ),
                    },
                    {
                      title: t("cache.tableProvider", undefined, "提供者"),
                      dataIndex: "provider",
                      key: "provider",
                      render: (p: string) => <Text style={{ textTransform: "capitalize" }}>{p}</Text>,
                    },
                    {
                      title: t("cache.tableModel", undefined, "模型"),
                      dataIndex: "model",
                      key: "model",
                      render: (m: string) => <Tag color="blue">{m}</Tag>,
                    },
                    {
                      title: t("cache.reasoningChars", undefined, "字符数"),
                      dataIndex: "charCount",
                      key: "charCount",
                      render: (c: number) => (
                        <Text strong style={{ color: "#a855f7" }}>
                          {formatNumber(c)}
                        </Text>
                      ),
                    },
                    {
                      title: t("cache.reasoningAge", undefined, "生成时间"),
                      dataIndex: "createdAt",
                      key: "createdAt",
                      render: (d: string) => (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {getTimeAgo(d)}
                        </Text>
                      ),
                    },
                    {
                      title: t("cache.reasoningView", undefined, "操作"),
                      key: "view",
                      render: (_, item) => (
                        <Button
                          icon={
                            <MaterialIcon
                              name={expandedReasoningId === item.toolCallId ? "expand_less" : "visibility"}
                              size={16}
                            />
                          }
                          onClick={() =>
                            setExpandedReasoningId(
                              expandedReasoningId === item.toolCallId ? null : item.toolCallId
                            )
                          }
                        >
                          {expandedReasoningId === item.toolCallId ? "折叠" : "查看思考链"}
                        </Button>
                      ),
                    },
                  ]}
                  expandable={{
                    expandedRowKeys: expandedReasoningId ? [expandedReasoningId] : [],
                    onExpand: (expanded, record) => {
                      setExpandedReasoningId(expanded ? record.toolCallId : null);
                    },
                    rowExpandable: () => true,
                    expandedRowRender: (entry) => (
                      <div style={{ padding: 14, background: "var(--ant-color-bg-container)", borderRadius: 8 }}>
                        <Flex align="center" gap={8} style={{ marginBottom: 10 }}>
                          <MaterialIcon name="psychology" size={18} style={{ color: "#3b82f6" }} />
                          <Text strong style={{ fontSize: 14 }}>
                            {t("cache.reasoningDetail", undefined, "思考过程内容 (Reasoning Thoughts)")} ({entry.toolCallId})
                          </Text>
                        </Flex>
                        <Paragraph
                          copyable
                          className={styles.reasoningBlock}
                        >
                          {entry.reasoning}
                        </Paragraph>
                        <Flex gap={16} wrap style={{ marginTop: 10, fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                          <span>
                            {t("cache.tableProvider", undefined, "提供者")}: <Text strong>{entry.provider}</Text>
                          </span>
                          <span>
                            {t("cache.tableModel", undefined, "模型")}: <Text strong>{entry.model}</Text>
                          </span>
                          <span>
                            {t("cache.created", undefined, "创建时间")}:{" "}
                            {new Date(entry.createdAt).toLocaleString()}
                          </span>
                          <span>
                            {t("cache.expires", undefined, "到期时间")}:{" "}
                            {new Date(entry.expiresAt).toLocaleString()}
                          </span>
                          <span>
                            字符数: <Text strong style={{ color: "#a855f7" }}>{formatNumber(entry.charCount)}</Text>
                          </span>
                        </Flex>
                      </div>
                    ),
                  }}
                />
              </Flex>
            </div>

            {/* Reasoning Behavior Info Section */}
            <div className={styles.subCard}>
              <Title level={5} style={{ margin: "0 0 12px 0", fontSize: 15 }}>
                {t("cache.reasoningBehavior", undefined, "推理缓存工作机制与说明")}
              </Title>
              <Flex vertical gap={8}>
                <div className={styles.infoRow}>
                  <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                  <span>{t("cache.reasoningBehaviorCapture", undefined, "从流式响应中自动捕获 reasoning_content 与 thinking 字段。")}</span>
                </div>
                <div className={styles.infoRow}>
                  <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                  <span>{t("cache.reasoningBehaviorReplay", undefined, "当客户端在多轮工具调用中省略思考上下文时，自动透明重新注入。")}</span>
                </div>
                <div className={styles.infoRow}>
                  <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                  <span>{t("cache.reasoningBehaviorFallback", undefined, "内存优先快速检索，并使用 SQLite 作为崩溃恢复后备持久化。")}</span>
                </div>
                <div className={styles.infoRow}>
                  <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                  <span>{t("cache.reasoningBehaviorTtl", undefined, "TTL：2 小时 | 最大条目：2,000 条（内存 LRU 自动驱逐淘汰）。")}</span>
                </div>
                <div className={styles.infoRow}>
                  <MaterialIcon name="info" size={16} style={{ color: "#3b82f6", flexShrink: 0, marginTop: 2 }} />
                  <span>{t("cache.reasoningBehaviorModels", undefined, "支持模型：DeepSeek-R1、Kimi-k1.5、Qwen-Thinking、GLM-4-Thinking 等。")}</span>
                </div>
              </Flex>
            </div>
          </Flex>
        </Card>
      )}
    </div>
  );
}

export default CachePage;
