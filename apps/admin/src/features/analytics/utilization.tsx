import { useMemo, useState } from "react";
import {
  Alert,
  Button,
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
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  Legend,
} from "recharts";
import { MaterialIcon } from "@/app/nav";
import {
  utilizationApi,
  type ProviderUtilizationPoint,
  type UtilizationTimeRange,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const PROVIDER_COLORS = [
  "#10b981",
  "#3b82f6",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#06b6d4",
  "#ec4899",
  "#84cc16",
];

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
  snapshotCard: {
    borderRadius: 10,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: "16px 18px",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 12,
  },
  chartWrapper: {
    height: 320,
    width: "100%",
    borderRadius: 10,
    background: token.colorFillQuaternary,
    padding: 16,
  },
}));

function formatTimestamp(value: string, range: UtilizationTimeRange): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (range === "1h" || range === "24h") {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function formatTooltipTimestamp(value: string, range: UtilizationTimeRange): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  if (range === "1h" || range === "24h") {
    return date.toLocaleString([], { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getLatestPoints(points: ProviderUtilizationPoint[]): ProviderUtilizationPoint[] {
  const latestByProvider = new Map<string, ProviderUtilizationPoint>();
  for (const point of points) {
    const current = latestByProvider.get(point.provider);
    if (!current || new Date(point.timestamp).getTime() > new Date(current.timestamp).getTime()) {
      latestByProvider.set(point.provider, point);
    }
  }
  return Array.from(latestByProvider.values()).sort((a, b) => b.remainingPct - a.remainingPct);
}

export function UtilizationPage() {
  const { styles } = useStyles();
  const { t, tt } = useI18n();

  const [range, setRange] = useState<UtilizationTimeRange>("24h");
  const [aggregateBy, setAggregateBy] = useState<"provider" | "connection">("provider");

  const utilQuery = useQuery({
    queryKey: ["provider-utilization", range, aggregateBy],
    queryFn: () => utilizationApi.getUtilization({ range, aggregateBy }),
    refetchInterval: 15000,
  });

  const data = utilQuery.data;
  const rawPoints = data?.data ?? [];
  const providers = data?.providers ?? [];
  const hasData = rawPoints.length > 0;

  const providerColors = useMemo(() => {
    const colors = new Map<string, string>();
    for (const [index, provider] of providers.entries()) {
      colors.set(provider, PROVIDER_COLORS[index % PROVIDER_COLORS.length]);
    }
    return colors;
  }, [providers]);

  const chartData = useMemo(() => {
    if (!rawPoints.length) return [];
    const byTimestamp = new Map<string, Record<string, number | string>>();

    for (const point of rawPoints) {
      const entry = byTimestamp.get(point.timestamp) ?? {
        timestamp: point.timestamp,
        label: formatTimestamp(point.timestamp, data?.timeRange || range),
      };
      entry[point.provider] = Number(point.remainingPct.toFixed(2));
      byTimestamp.set(point.timestamp, entry);
    }

    return Array.from(byTimestamp.entries())
      .sort(([left], [right]) => new Date(left).getTime() - new Date(right).getTime())
      .map(([, value]) => value);
  }, [rawPoints, data?.timeRange, range]);

  const latestPoints = useMemo(() => getLatestPoints(rawPoints), [rawPoints]);

  if (utilQuery.isLoading && !utilQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={14}>
          <Flex align="center" gap={14}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="monitoring" size={26} />
            </div>
            <div>
              <Flex align="center" gap={8} wrap>
                <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                  {t("analytics.providerUtilizationTitle", undefined, "提供商容量利用率监控")}
                </Title>
                <Tag color="gold">
                  {range === "1h" ? "1 小时" : range === "24h" ? "24 小时" : range === "7d" ? "7 天" : "30 天"}
                </Tag>
                <Tag color="blue">
                  {aggregateBy === "provider" ? tt("提供商全局视图", "Global View") : tt("分账户拆分视图", "Account Split")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t(
                  "analytics.providerUtilizationDescription",
                  undefined,
                  "根据滑动时间窗口实时追踪各提供商及账户连接的剩余配额水位、TPM/RPM 负荷与健康预警。"
                )}
              </Text>
            </div>
          </Flex>

          <Space size="middle" wrap>
            {/* View Aggregation Segmented */}
            <Segmented<"provider" | "connection">
              value={aggregateBy}
              onChange={(val) => setAggregateBy(val)}
              options={[
                {
                  label: (
                    <Flex align="center" gap={6} style={{ padding: "2px 6px" }}>
                      <MaterialIcon name="dns" size={16} />
                      <span>{t("analytics.providerUtilizationGlobalView", undefined, "全局视图")}</span>
                    </Flex>
                  ),
                  value: "provider",
                },
                {
                  label: (
                    <Flex align="center" gap={6} style={{ padding: "2px 6px" }}>
                      <MaterialIcon name="account_tree" size={16} />
                      <span>{t("analytics.providerUtilizationAccountSplit", undefined, "分账户拆分")}</span>
                    </Flex>
                  ),
                  value: "connection",
                },
              ]}
            />

            {/* Time Range Selector */}
            <Segmented<UtilizationTimeRange>
              value={range}
              onChange={(val) => setRange(val)}
              options={[
                { label: "1h", value: "1h" },
                { label: "24h", value: "24h" },
                { label: "7d", value: "7d" },
                { label: "30d", value: "30d" },
              ]}
            />

            <Button
              icon={<MaterialIcon name="refresh" size={16} />}
              onClick={() => void utilQuery.refetch()}
              loading={utilQuery.isFetching}
            >
              {t("common.refresh", undefined, "刷新")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 2. Main Body Content */}
      <Card className={styles.sectionCard} styles={{ body: { padding: 20 } }}>
        {utilQuery.isError ? (
          <Alert
            type="error"
            showIcon
            message={t("analytics.providerUtilizationFailedToLoad", undefined, "加载利用率数据失败")}
            description={utilQuery.error instanceof Error ? utilQuery.error.message : "无法从网关获取提供商利用率快照。"}
            action={
              <Button onClick={() => void utilQuery.refetch()}>
                {t("common.retry", undefined, "重试")}
              </Button>
            }
          />
        ) : !hasData ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <Flex vertical align="center" gap={4}>
                <Text strong>{t("analytics.providerUtilizationNoData", undefined, "暂无利用率数据")}</Text>
                <Text type="secondary" style={{ fontSize: 13, maxWidth: 460 }}>
                  {t(
                    "analytics.providerUtilizationNoDataDescription",
                    undefined,
                    "当网关发起请求或配置配额监控后，各提供商的滑动窗口剩余容量趋势将在此展示。"
                  )}
                </Text>
              </Flex>
            }
            style={{ margin: "40px 0" }}
          />
        ) : (
          <Flex vertical gap={24}>
            {/* 2.1 Recharts Line Chart */}
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" vertical={false} />
                  <XAxis
                    dataKey="timestamp"
                    tickFormatter={(value) => formatTimestamp(String(value), range)}
                    tick={{ fontSize: 11, fill: "var(--ant-color-text-secondary)" }}
                    axisLine={false}
                    tickLine={false}
                    minTickGap={28}
                  />
                  <YAxis
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11, fill: "var(--ant-color-text-secondary)" }}
                    axisLine={false}
                    tickLine={false}
                    width={42}
                  />
                  <ReTooltip
                    labelFormatter={(value) => formatTooltipTimestamp(String(value), range)}
                    formatter={(value: any, name: any) => [`${Math.round(Number(value))}%`, name]}
                    contentStyle={{
                      background: "var(--ant-color-bg-elevated)",
                      borderColor: "var(--ant-color-border)",
                      borderRadius: 10,
                      color: "var(--ant-color-text)",
                    }}
                  />
                  <Legend />
                  {providers.map((provider) => (
                    <Line
                      key={provider}
                      type="monotone"
                      dataKey={provider}
                      name={provider}
                      stroke={providerColors.get(provider) ?? "#10b981"}
                      strokeWidth={2.5}
                      dot={false}
                      activeDot={{ r: 4 }}
                      connectNulls
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* 2.2 Snapshot Cards Grid */}
            <Row gutter={[16, 16]}>
              {latestPoints.map((point) => {
                const isLow = point.remainingPct <= 20;
                const isExhausted = point.isExhausted || point.remainingPct <= 0;

                const colonIdx = point.provider.indexOf(":");
                const isConnectionKey = aggregateBy === "connection" && colonIdx !== -1;
                const providerPart = isConnectionKey ? point.provider.slice(0, colonIdx) : point.provider;
                const connectionId = isConnectionKey ? point.provider.slice(colonIdx + 1) : null;
                const connMeta = connectionId ? data?.connectionMeta?.[connectionId] : null;

                const cardTitle = isConnectionKey
                  ? connMeta?.displayName || connMeta?.name || connectionId
                  : point.provider;
                const cardSubtitle = isConnectionKey
                  ? `${providerPart} · 账户 ${(connectionId ?? "").slice(0, 10)}…`
                  : t("analytics.providerUtilizationLatestSnapshot", undefined, "最新水位快照");

                return (
                  <Col xs={24} sm={12} lg={8} key={point.provider}>
                    <div className={styles.snapshotCard}>
                      <Flex justify="space-between" align="flex-start" gap={8}>
                        <Flex align="center" gap={10}>
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 10,
                              background: "rgba(255,255,255,0.04)",
                              border: "1px solid var(--ant-color-border-secondary)",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              color: providerColors.get(point.provider) ?? "#10b981",
                            }}
                          >
                            <MaterialIcon name="dns" size={20} />
                          </div>
                          <div>
                            <Text strong style={{ fontSize: 14, textTransform: "capitalize" }}>
                              {cardTitle}
                            </Text>
                            <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                              {cardSubtitle}
                            </div>
                          </div>
                        </Flex>

                        <Tag color={isExhausted ? "error" : isLow ? "warning" : "success"}>
                          {isExhausted
                            ? t("analytics.statusExhausted", undefined, "已耗尽")
                            : isLow
                              ? t("analytics.statusLow", undefined, "容量紧张")
                              : t("analytics.statusHealthy", undefined, "健康充裕")}
                        </Tag>
                      </Flex>

                      <Flex justify="space-between" align="flex-end" gap={8}>
                        <div>
                          <div
                            style={{
                              fontSize: 28,
                              fontWeight: 700,
                              color: isExhausted ? "#ef4444" : isLow ? "#f59e0b" : "#10b981",
                              lineHeight: 1.1,
                            }}
                          >
                            {point.remainingPct.toFixed(point.remainingPct < 10 ? 1 : 0)}%
                          </div>
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            {t("analytics.providerUtilizationRemainingCapacity", undefined, "剩余可用容量")}
                          </Text>
                        </div>
                        <div style={{ textAlign: "right", fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                          <div>{formatTooltipTimestamp(point.timestamp, range)}</div>
                          <div style={{ marginTop: 2, textTransform: "uppercase" }}>{point.windowKey}</div>
                        </div>
                      </Flex>

                      <div>
                        <Progress
                          percent={Math.max(point.remainingPct, 0)}
                          strokeColor={isExhausted ? "#ef4444" : isLow ? "#f59e0b" : "#10b981"}
                          showInfo={false}
                          style={{ margin: "4px 0" }}
                        />
                        <Flex justify="space-between" style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                          <span>0%</span>
                          <span>{t("analytics.remainingQuota", undefined, "剩余可用额度")}</span>
                          <span>100%</span>
                        </Flex>
                      </div>
                    </div>
                  </Col>
                );
              })}
            </Row>
          </Flex>
        )}
      </Card>
    </div>
  );
}

export default UtilizationPage;
