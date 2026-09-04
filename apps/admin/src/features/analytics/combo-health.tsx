import { useState } from "react";
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
import { MaterialIcon } from "@/app/nav";
import {
  comboHealthApi,
  type ComboForecastHorizon,
  type ComboHealthDashboardResponse,
  type ComboHealthMetrics,
  type UtilizationTimeRange,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

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
  metricBox: {
    padding: "12px 14px",
    borderRadius: 8,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },
  distributionBox: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: "10px 12px",
    display: "flex",
    flexDirection: "column",
    gap: 6,
  },
}));

function formatPercent(value: number, digits = 0): string {
  return `${(value || 0).toFixed(digits)}%`;
}

function formatShare(value: number): string {
  return formatPercent((value || 0) * 100, 1);
}

function formatLatency(value: number): string {
  return `${Math.round(value || 0).toLocaleString()}ms`;
}

function formatUsd(value: number, digits = 2): string {
  return `$${(value || 0).toLocaleString(undefined, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  })}`;
}

export function ComboHealthPage() {
  const { styles } = useStyles();
  const { t, tt } = useI18n();

  const [range, setRange] = useState<UtilizationTimeRange>("24h");
  const [horizon, setHorizon] = useState<ComboForecastHorizon>("30d");

  const dashboardQuery = useQuery({
    queryKey: ["combo-health-dashboard", range, horizon],
    queryFn: () => comboHealthApi.getDashboard({ range, horizon }),
    refetchInterval: 12000,
  });

  if (dashboardQuery.isLoading && !dashboardQuery.data) {
    return <PageSkeleton />;
  }

  const dashboard: ComboHealthDashboardResponse | undefined = dashboardQuery.data;
  const health = dashboard?.health;
  const combos: ComboHealthMetrics[] = health?.combos ?? [];
  const autopilot = dashboard?.autopilot;
  const forecast = dashboard?.forecast;

  const topIssues = autopilot?.combos?.flatMap((c) => c.issues.map((iss) => ({ combo: c, issue: iss }))) ?? [];

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
                background: "rgba(52, 211, 153, 0.12)",
                color: "#34d399",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="health_and_safety" size={26} />
            </div>
            <div>
              <Flex align="center" gap={8} wrap>
                <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                  {t("analytics.comboHealthTitle", undefined, "模型组合健康度与链路监控")}
                </Title>
                <Tag color={autopilot?.status === "critical" ? "error" : autopilot?.status === "warning" ? "warning" : "success"}>
                  {autopilot?.status === "critical" ? tt("极高风险", "Critical") : autopilot?.status === "warning" ? tt("存在警告", "Warning") : tt("链路健康", "Healthy")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {t(
                  "analytics.comboHealthDescription",
                  undefined,
                  "实时评估多路由模型组合的可用性评分、故障转移风险、使用偏斜度（基尼系数）与 Autopilot 自愈决策。"
                )}
              </Text>
            </div>
          </Flex>

          <Space size="middle" wrap>
            {/* Range Selector */}
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

            {/* Horizon Selector */}
            <Segmented<ComboForecastHorizon>
              value={horizon}
              onChange={(val) => setHorizon(val)}
              options={[
                { label: "预测 24h", value: "24h" },
                { label: "预测 7d", value: "7d" },
                { label: "预测 30d", value: "30d" },
              ]}
            />

            <Button
              icon={<MaterialIcon name="refresh" size={16} />}
              onClick={() => void dashboardQuery.refetch()}
              loading={dashboardQuery.isFetching}
            >
              {t("common.refresh", undefined, "刷新")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {dashboardQuery.isError ? (
        <Alert
          type="error"
          showIcon
          message={tt("加载组合健康监控失败", "Failed to load combo health dashboard")}
          description={dashboardQuery.error instanceof Error ? dashboardQuery.error.message : "无法获取链路自愈与健康指标。"}
          action={
            <Button onClick={() => void dashboardQuery.refetch()}>
              {t("common.retry", undefined, "重试")}
            </Button>
          }
        />
      ) : (
        <>
          {/* 2. Autopilot Issues & Health Summary Panel */}
          {autopilot && (
            <Card className={styles.sectionCard} styles={{ body: { padding: 20 } }}>
              <Flex vertical gap={16}>
                <Flex justify="space-between" align="flex-start" wrap gap={12}>
                  <div>
                    <Flex align="center" gap={8}>
                      <Title level={5} style={{ margin: 0, fontSize: 16 }}>
                        {t("analytics.comboHealthAutopilotTitle", undefined, "Autopilot 智能诊断与自愈报告")}
                      </Title>
                      <Tag color={autopilot.status === "critical" ? "error" : autopilot.status === "warning" ? "warning" : "success"}>
                        {autopilot.status.toUpperCase()}
                      </Tag>
                    </Flex>
                    <Text type="secondary" style={{ fontSize: 13 }}>
                      {t(
                        "analytics.comboHealthAutopilotDescription",
                        undefined,
                        "自主分析各模型链路的熔断、配额耗尽与延迟偏斜风险，提供即时修复建议。"
                      )}
                    </Text>
                  </div>

                  <Row gutter={[10, 10]} style={{ minWidth: 340 }}>
                    <Col span={6}>
                      <div className={styles.metricBox} style={{ textAlign: "center" }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthIssues", undefined, "告警项")}</Text>
                        <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>{autopilot.summary.issueCount}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className={styles.metricBox} style={{ textAlign: "center" }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthDown", undefined, "故障")}</Text>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#ef4444", marginTop: 2 }}>{autopilot.summary.downCount}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className={styles.metricBox} style={{ textAlign: "center" }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthDegraded", undefined, "降级")}</Text>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>{autopilot.summary.degradedCount}</div>
                      </div>
                    </Col>
                    <Col span={6}>
                      <div className={styles.metricBox} style={{ textAlign: "center" }}>
                        <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthHealthy", undefined, "健康")}</Text>
                        <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", marginTop: 2 }}>{autopilot.summary.healthyCount}</div>
                      </div>
                    </Col>
                  </Row>
                </Flex>

                {topIssues.length > 0 ? (
                  <Row gutter={[12, 12]}>
                    {topIssues.map(({ combo, issue }) => (
                      <Col xs={24} lg={12} key={issue.id}>
                        <div className={styles.subCard}>
                          <Flex justify="space-between" align="flex-start" gap={8}>
                            <div>
                              <Text strong style={{ fontSize: 14 }}>{issue.title}</Text>
                              <div style={{ fontSize: 12, color: "var(--ant-color-text-secondary)", marginTop: 2 }}>
                                {combo.comboName} · 得分 {combo.score}
                              </div>
                            </div>
                            <Tag color={issue.severity === "critical" ? "error" : issue.severity === "warning" ? "warning" : "default"}>
                              {issue.severity}
                            </Tag>
                          </Flex>
                          <Text style={{ fontSize: 13, marginTop: 8, display: "block" }}>{issue.recommendation}</Text>
                        </div>
                      </Col>
                    ))}
                  </Row>
                ) : (
                  <div style={{ padding: "12px 16px", borderRadius: 8, background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)", color: "#10b981", fontSize: 13 }}>
                    <Flex align="center" gap={8}>
                      <MaterialIcon name="task_alt" size={18} />
                      <span>{t("analytics.comboHealthNoActiveIssues", undefined, "所有模型组合运行平稳，未发现阻塞性故障或链路降级。")}</span>
                    </Flex>
                  </div>
                )}
              </Flex>
            </Card>
          )}

          {/* 3. Detailed Combo Cards List */}
          {combos.length === 0 ? (
            <Card className={styles.sectionCard} styles={{ body: { padding: 32 } }}>
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={tt("暂无模型组合健康数据。配置并调用组合后将在此展示自愈监控。", "No combo health metrics available.")}
              />
            </Card>
          ) : (
            combos.map((combo) => {
              const comboForecast = forecast?.combos?.find((f) => f.comboId === combo.comboId);
              const comboAutopilot = autopilot?.combos?.find((a) => a.comboId === combo.comboId);
              const targets = combo.targetHealth ?? [];

              return (
                <Card key={combo.comboId} className={styles.sectionCard} styles={{ body: { padding: 20 } }}>
                  <Flex vertical gap={20}>
                    {/* Header with name, strategy, autopilot badge & 3 top KPI boxes */}
                    <Flex justify="space-between" align="flex-start" wrap gap={14}>
                      <div>
                        <Flex align="center" gap={8} wrap>
                          <Title level={4} style={{ margin: 0, fontSize: 17 }}>{combo.comboName}</Title>
                          <Tag color="purple" style={{ textTransform: "uppercase" }}>{combo.strategy}</Tag>
                          {comboAutopilot && (
                            <Tag color={comboAutopilot.state === "down" ? "error" : comboAutopilot.state === "degraded" ? "warning" : "success"}>
                              {comboAutopilot.state === "healthy" ? "● 健康" : comboAutopilot.state === "degraded" ? "▲ 降级" : "✖ 故障"} · {comboAutopilot.score}分
                            </Tag>
                          )}
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: "block" }}>
                          {combo.models.length} 个候选模型 · {combo.quotaHealth.providers.length} 个提供商链路
                        </Text>
                      </div>

                      <Row gutter={[10, 10]} style={{ minWidth: 380 }}>
                        <Col span={8}>
                          <div className={styles.metricBox}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthWorstQuotaLeft", undefined, "最差配额余量")}</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
                              {formatPercent(combo.quotaHealth.worstRemainingPct, 1)}
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className={styles.metricBox}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthUsageSkew", undefined, "使用偏斜度")}</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#3b82f6", marginTop: 2 }}>
                              {combo.usageSkew.giniCoefficient.toFixed(2)}
                            </div>
                          </div>
                        </Col>
                        <Col span={8}>
                          <div className={styles.metricBox}>
                            <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthSuccessRate", undefined, "成功率")}</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
                              {formatPercent(combo.performance.successRate * 100, 1)}
                            </div>
                          </div>
                        </Col>
                      </Row>
                    </Flex>

                    {/* 3 Core Columns: Quota Health, Usage Skew, Performance */}
                    <Row gutter={[14, 14]}>
                      {/* Column 1: Quota Health */}
                      <Col xs={24} lg={8}>
                        <div className={styles.subCard} style={{ height: "100%" }}>
                          <Title level={5} style={{ margin: "0 0 10px 0", fontSize: 14 }}>
                            {t("analytics.comboHealthQuotaHealth", undefined, "提供商配额水位")}
                          </Title>
                          <Flex vertical gap={10}>
                            {combo.quotaHealth.providers.map((p) => (
                              <div key={p.provider} className={styles.distributionBox}>
                                <Flex justify="space-between" align="center">
                                  <Text strong style={{ textTransform: "capitalize" }}>{p.provider}</Text>
                                  <Flex align="center" gap={6}>
                                    <Tag color={p.trend === "improving" ? "success" : p.trend === "declining" ? "warning" : "default"}>
                                      {p.trend === "improving" ? "上升" : p.trend === "declining" ? "下降" : "平稳"}
                                    </Tag>
                                    {p.isExhausted && <Tag color="error">{t("analytics.statusExhausted", undefined, "已耗尽")}</Tag>}
                                  </Flex>
                                </Flex>
                                <Progress
                                  percent={Math.max(p.remainingPct, 0)}
                                  strokeColor={p.isExhausted ? "#ef4444" : p.remainingPct < 20 ? "#f59e0b" : "#10b981"}
                                  showInfo={false}
                                  style={{ margin: "2px 0" }}
                                />
                                <Flex justify="space-between" style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                                  <span>剩余: {formatPercent(p.remainingPct, 1)}</span>
                                </Flex>
                              </div>
                            ))}
                          </Flex>
                        </div>
                      </Col>

                      {/* Column 2: Usage Skew */}
                      <Col xs={24} lg={8}>
                        <div className={styles.subCard} style={{ height: "100%" }}>
                          <Title level={5} style={{ margin: "0 0 10px 0", fontSize: 14 }}>
                            {t("analytics.comboHealthUsageSkew", undefined, "模型流量与 Token 偏斜")}
                          </Title>
                          <Flex vertical gap={10}>
                            {combo.usageSkew.modelDistribution.map((m) => (
                              <div key={m.model} className={styles.distributionBox}>
                                <Flex justify="space-between" align="center">
                                  <Text strong style={{ maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {m.model}
                                  </Text>
                                  <Tag color="blue">{formatShare(m.requestShare)}</Tag>
                                </Flex>
                                <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                                  请求占比: {formatShare(m.requestShare)} · Token 占比: {formatShare(m.tokenShare)}
                                </div>
                                <Progress percent={m.requestShare * 100} showInfo={false} strokeColor="#3b82f6" style={{ margin: "2px 0" }} />
                              </div>
                            ))}
                          </Flex>
                        </div>
                      </Col>

                      {/* Column 3: Performance */}
                      <Col xs={24} lg={8}>
                        <div className={styles.subCard} style={{ height: "100%" }}>
                          <Title level={5} style={{ margin: "0 0 10px 0", fontSize: 14 }}>
                            {t("analytics.comboHealthPerformance", undefined, "链路响应性能")}
                          </Title>
                          <Flex vertical gap={10}>
                            <div className={styles.metricBox}>
                              <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthAvgLatency", undefined, "平均响应延迟")}</Text>
                              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{formatLatency(combo.performance.avgLatencyMs)}</div>
                            </div>
                            <div className={styles.metricBox}>
                              <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthSuccessRate", undefined, "请求成功率")}</Text>
                              <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
                                {formatPercent(combo.performance.successRate * 100, 1)}
                              </div>
                            </div>
                            <div className={styles.metricBox}>
                              <Text type="secondary" style={{ fontSize: 11 }}>{t("analytics.comboHealthTotalRequests", undefined, "累计路由请求")}</Text>
                              <div style={{ fontSize: 20, fontWeight: 700, marginTop: 2 }}>{combo.performance.totalRequests.toLocaleString()}</div>
                            </div>
                          </Flex>
                        </div>
                      </Col>
                    </Row>

                    {/* Execution Targets Grid */}
                    {targets.length > 0 && (
                      <div className={styles.subCard}>
                        <Title level={5} style={{ margin: "0 0 12px 0", fontSize: 14 }}>
                          {t("analytics.comboHealthExecutionTargets", undefined, "执行链路候选节点状态")}
                        </Title>
                        <Row gutter={[12, 12]}>
                          {targets.map((tgt) => (
                            <Col xs={24} md={12} key={tgt.executionKey}>
                              <div className={styles.distributionBox}>
                                <Flex justify="space-between" align="flex-start" gap={8}>
                                  <div>
                                    <Text strong>{tgt.label || tgt.model}</Text>
                                    <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                                      {tgt.provider} {tgt.connectionId ? `· ${tgt.connectionId.slice(0, 8)}` : ""}
                                    </div>
                                  </div>
                                  <Flex align="center" gap={6}>
                                    <Tag color={tgt.lastStatus === "ok" ? "success" : "error"}>{tgt.lastStatus || "ok"}</Tag>
                                    <Tag color="default">{tgt.requests} 请求</Tag>
                                  </Flex>
                                </Flex>
                                <Row gutter={[8, 8]} style={{ marginTop: 4 }}>
                                  <Col span={8}>
                                    <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>成功率: {formatPercent(tgt.successRate)}</div>
                                  </Col>
                                  <Col span={8}>
                                    <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>延迟: {formatLatency(tgt.avgLatencyMs)}</div>
                                  </Col>
                                  <Col span={8}>
                                    <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>配额: {formatPercent(tgt.quotaRemainingPct ?? 100)}</div>
                                  </Col>
                                </Row>
                              </div>
                            </Col>
                          ))}
                        </Row>
                      </div>
                    )}

                    {/* Forecast Panel */}
                    {comboForecast && (
                      <div className={styles.subCard} style={{ borderLeft: "3px solid #6366f1" }}>
                        <Flex justify="space-between" align="center" wrap gap={8}>
                          <Title level={5} style={{ margin: 0, fontSize: 14 }}>
                            {t("analytics.comboHealthForecastTitle", undefined, "容量与消耗趋势预测")} ({horizon})
                          </Title>
                          <Tag color="blue">置信度: {comboForecast.confidence}</Tag>
                        </Flex>
                        <Row gutter={[12, 12]} style={{ marginTop: 10 }}>
                          <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ fontSize: 11 }}>预估周期消耗</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
                              {formatUsd(comboForecast.forecast.projectedCostUsd)}
                            </div>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ fontSize: 11 }}>预估请求总量</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 2 }}>
                              {comboForecast.forecast.projectedRequests.toLocaleString()}
                            </div>
                          </Col>
                          <Col xs={24} sm={8}>
                            <Text type="secondary" style={{ fontSize: 11 }}>预估最差剩余配额</Text>
                            <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
                              {comboForecast.quotaRisk.projectedWorstRemainingPct != null ? formatPercent(comboForecast.quotaRisk.projectedWorstRemainingPct, 1) : "充裕"}
                            </div>
                          </Col>
                        </Row>
                      </div>
                    )}
                  </Flex>
                </Card>
              );
            })
          )}
        </>
      )}
    </div>
  );
}

export default ComboHealthPage;
