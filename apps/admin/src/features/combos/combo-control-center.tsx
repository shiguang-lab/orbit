import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  Spin,
  Tag,
  Typography,
  message,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { Scrollbar } from "@shiguang2/components/esm/scrollbar";
import { MaterialIcon } from "@/app/nav";
import { useBreadcrumbTitle } from "@/shell/useBreadcrumbTitle";
import {
  combosApi,
  type ComboHealthResponse,
  type ComboItem,
  type ComboMetrics,
  type ComboStep,
} from "@/entities/api";
import {
  getStrategyDef,
  getStepDisplayName,
  getStepProvider,
  getStepConnection,
} from "./constants";

const { Title, Text, Paragraph } = Typography;

type TimeRange = "1h" | "24h" | "7d" | "30d";

export type ComboHealthState = "healthy" | "warning" | "critical" | "idle";

export interface ComboTargetHealth {
  executionKey?: string;
  stepId?: string | null;
  model?: string;
  provider?: string;
  connectionId?: string | null;
  label?: string | null;
  requests?: number;
  successRate?: number;
  avgLatencyMs?: number;
  lastStatus?: "ok" | "error" | null;
  lastUsedAt?: string | null;
  quotaRemainingPct?: number | null;
  quotaIsExhausted?: boolean | null;
  quotaTrend?: "improving" | "stable" | "declining" | null;
  quotaScope?: "connection" | "provider" | "none";
}

export interface ComboConfiguredTarget {
  id: string;
  kind: "model" | "combo-ref" | "provider-wildcard";
  index: number;
  label: string;
  model: string;
  provider: string | null;
  connectionId: string | null;
  weight: number;
  health: ComboTargetHealth | null;
}

export interface ComboControlSummary {
  strategy: string;
  strategyLabel: string;
  isActive: boolean;
  targetCount: number;
  modelTargetCount: number;
  nestedComboCount: number;
  providerCount: number;
  totalRequests: number;
  successRate: number;
  avgLatencyMs: number;
  fallbackRate: number;
  worstQuotaRemainingPct: number | null;
  usageSkew: number;
  healthState: ComboHealthState;
  healthReasons: string[];
}

export interface CallLogEntry {
  id?: string;
  requestId?: string;
  timestamp?: string | number;
  status?: number;
  model?: string;
  provider?: string;
  duration?: number;
  latencyMs?: number;
  comboName?: string;
  comboStepId?: string | null;
  comboExecutionKey?: string | null;
  error?: string | null;
}

const useStyles = createStyles(({ token }) => ({
  metricCard: {
    boxSizing: "border-box",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "all 0.2s",
  },
  overviewCard: {
    boxSizing: "border-box",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  sectionCard: {
    boxSizing: "border-box",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  subBlock: {
    boxSizing: "border-box",
    borderRadius: 6,
    padding: "10px 14px",
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  targetCard: {
    boxSizing: "border-box",
    borderRadius: 6,
    padding: "8px 12px",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    transition: "all 0.2s",
  },
  targetCardHealthy: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    background: "rgba(16, 185, 129, 0.02)",
  },
  targetCardWarning: {
    borderColor: "rgba(245, 158, 11, 0.3)",
    background: "rgba(245, 158, 11, 0.02)",
  },
  targetCardCritical: {
    borderColor: "rgba(239, 68, 68, 0.3)",
    background: "rgba(239, 68, 68, 0.02)",
  },
  telemetryGrid: {
    boxSizing: "border-box",
    borderRadius: 6,
    padding: "6px 10px",
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    display: "grid",
    gridTemplateColumns: "auto minmax(32px, auto) auto minmax(32px, auto)",
    alignItems: "center",
    gap: "3px 8px",
    fontSize: 11,
  },
  logRow: {
    boxSizing: "border-box",
    padding: "10px 12px",
    borderRadius: 6,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  configRow: {
    boxSizing: "border-box",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: 6,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    gap: 8,
  },
}));

function fmtPercent(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "—";
  return `${Math.round(value)}%`;
}

function fmtMs(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return "—";
  return `${Math.round(value)}ms`;
}

function fmtDate(value: string | number | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString();
}

function shortId(value: string | null | undefined, fallback: string, max = 8): string {
  if (!value) return fallback;
  return value.length > max ? `${value.slice(0, max)}…` : value;
}

const HEALTH_REASONS_MAP: Record<string, { label: string; color: string }> = {
  "No recent combo traffic": { label: "暂无近期流量", color: "blue" },
  "Low success rate": { label: "请求成功率过低 (<80%)", color: "red" },
  "Success rate below target": { label: "成功率未达标 (<95%)", color: "orange" },
  "High fallback rate": { label: "故障回退率过高 (≥20%)", color: "red" },
  "Elevated fallback rate": { label: "故障回退率偏高 (≥10%)", color: "orange" },
  "At least one quota is exhausted": { label: "至少一个提供商配额已耗尽", color: "red" },
  "Quota is nearly exhausted": { label: "配额即将耗尽 (<10%)", color: "red" },
  "Quota is getting low": { label: "配额余额偏低 (<25%)", color: "orange" },
  "Traffic distribution is highly skewed": { label: "流量分布高度偏斜 (基尼系数 ≥0.5)", color: "purple" },
  "Combo looks healthy": { label: "组合运行健康", color: "green" },
};

type ComboHealthItem = NonNullable<ComboHealthResponse["combos"]>[number];

function getComboTargets(
  combo: ComboItem,
  health?: ComboHealthItem | null
): ComboConfiguredTarget[] {
  const steps: ComboStep[] = combo.models || [];
  const healthByModel = new Map<string, ComboTargetHealth>();
  const healthByStepId = new Map<string, ComboTargetHealth>();

  for (const th of health?.targetHealth || []) {
    if (th.stepId) healthByStepId.set(th.stepId, th);
    if (th.model && !healthByModel.has(th.model)) healthByModel.set(th.model, th);
  }

  return steps.map((step, index) => {
    const dName = getStepDisplayName(step);
    const pId = getStepProvider(step);
    const cId = getStepConnection(step);
    const hEntry = (step.id && healthByStepId.get(step.id)) || healthByModel.get(dName) || null;

    let kind: "model" | "combo-ref" | "provider-wildcard" = "model";
    if ("comboName" in step && step.comboName) kind = "combo-ref";
    else if ("modelPattern" in step && step.modelPattern) kind = "provider-wildcard";

    return {
      id: step.id || `step-${index}`,
      kind,
      index,
      label: dName,
      model: dName,
      provider: pId || hEntry?.provider || null,
      connectionId: cId || null,
      weight: step.weight || 0,
      health: hEntry,
    };
  });
}

function summarizeCombo(
  combo: ComboItem,
  metrics?: ComboMetrics | null,
  health?: ComboHealthItem | null
): ComboControlSummary {
  const targets = getComboTargets(combo, health);
  const resolvedTargets = health?.targetHealth || [];
  const providers = new Set<string>();

  for (const t of targets) {
    if (t.provider) providers.add(t.provider);
  }
  for (const t of resolvedTargets) {
    if (t.provider) providers.add(t.provider);
  }

  const strategyMeta = getStrategyDef(combo.strategy);
  const healthRequests = health?.performance?.totalRequests || 0;
  const metricRequests = metrics?.totalRequests || 0;
  const totalRequests = healthRequests || metricRequests;

  const successRate =
    healthRequests > 0
      ? Math.round((health?.performance?.successRate ?? 1) <= 1 ? (health?.performance?.successRate ?? 1) * 100 : health?.performance?.successRate ?? 100)
      : Math.round(metrics?.successRate ?? 100);

  const avgLatencyMs = health?.performance?.avgLatencyMs || metrics?.avgLatencyMs || 0;
  const fallbackRate = Math.round(metrics?.fallbackRate ?? 0);
  const worstQuotaRemainingPct =
    typeof health?.quotaHealth?.worstRemainingPct === "number"
      ? health.quotaHealth.worstRemainingPct
      : null;
  const usageSkew = health?.usageSkew?.giniCoefficient || 0;
  const hasExhaustedQuota = Boolean(
    health?.quotaHealth?.providers?.some((p) => p.isExhausted)
  );

  const healthReasons: string[] = [];
  if (totalRequests === 0) healthReasons.push("No recent combo traffic");
  if (successRate > 0 && successRate < 80) healthReasons.push("Low success rate");
  else if (successRate > 0 && successRate < 95) healthReasons.push("Success rate below target");
  if (fallbackRate >= 20) healthReasons.push("High fallback rate");
  else if (fallbackRate >= 10) healthReasons.push("Elevated fallback rate");
  if (hasExhaustedQuota) healthReasons.push("At least one quota is exhausted");
  else if (worstQuotaRemainingPct !== null && worstQuotaRemainingPct < 10) {
    healthReasons.push("Quota is nearly exhausted");
  } else if (worstQuotaRemainingPct !== null && worstQuotaRemainingPct < 25) {
    healthReasons.push("Quota is getting low");
  }
  if (usageSkew >= 0.5) healthReasons.push("Traffic distribution is highly skewed");
  if (healthReasons.length === 0) healthReasons.push("Combo looks healthy");

  let healthState: ComboHealthState = "healthy";
  if (totalRequests === 0 && worstQuotaRemainingPct === null) {
    healthState = "idle";
  } else if (hasExhaustedQuota || (worstQuotaRemainingPct !== null && worstQuotaRemainingPct < 10) || successRate < 80 || fallbackRate >= 20) {
    healthState = "critical";
  } else if ((worstQuotaRemainingPct !== null && worstQuotaRemainingPct < 25) || successRate < 95 || fallbackRate >= 10 || usageSkew >= 0.5) {
    healthState = "warning";
  }

  return {
    strategy: combo.strategy,
    strategyLabel: strategyMeta.label,
    isActive: combo.isActive !== false,
    targetCount: targets.length,
    modelTargetCount: targets.filter((t) => t.kind === "model").length,
    nestedComboCount: targets.filter((t) => t.kind === "combo-ref").length,
    providerCount: providers.size,
    totalRequests,
    successRate,
    avgLatencyMs,
    fallbackRate,
    worstQuotaRemainingPct,
    usageSkew,
    healthState,
    healthReasons,
  };
}

export function ComboControlCenter() {
  const { id } = useParams<{ id: string }>();
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const setCustomTitle = useBreadcrumbTitle((s) => s.setCustomTitle);

  const [loading, setLoading] = useState(true);
  const [combo, setCombo] = useState<ComboItem | null>(null);
  const [metrics, setMetrics] = useState<ComboMetrics | null>(null);
  const [healthData, setHealthData] = useState<ComboHealthResponse | null>(null);
  const [callLogs, setCallLogs] = useState<CallLogEntry[]>([]);
  const [range, setRange] = useState<TimeRange>("24h");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (combo?.name) {
      setCustomTitle(combo.name);
    }
    return () => {
      setCustomTitle(null);
    };
  }, [combo?.name, setCustomTitle]);

  const loadData = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const comboData = await combosApi.get(id);
      setCombo(comboData);

      const [mRes, hRes, lRes] = await Promise.allSettled([
        combosApi.metrics(comboData.name),
        combosApi.health(id, range),
        combosApi.callLogs(comboData.name, 10),
      ]);

      if (mRes.status === "fulfilled") {
        const m = mRes.value.metrics;
        setMetrics(m && typeof m === "object" && !Array.isArray(m) ? (m as ComboMetrics) : null);
      }
      if (hRes.status === "fulfilled") {
        setHealthData(hRes.value);
      }
      if (lRes.status === "fulfilled") {
        setCallLogs((lRes.value as CallLogEntry[]) || []);
      }
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "加载组合监控数据失败");
      message.error("加载组合监控数据失败");
    } finally {
      setLoading(false);
    }
  }, [id, range]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const currentHealthCombo = useMemo(() => {
    return healthData?.combos?.find((c) => c.comboId === id || c.comboName === combo?.name) || null;
  }, [healthData, id, combo?.name]);

  const summary = useMemo(() => {
    return combo ? summarizeCombo(combo, metrics, currentHealthCombo) : null;
  }, [combo, metrics, currentHealthCombo]);

  const configuredTargets = useMemo(() => {
    return combo ? getComboTargets(combo, currentHealthCombo) : [];
  }, [combo, currentHealthCombo]);

  const resolvedTargets = useMemo(() => {
    return currentHealthCombo?.targetHealth || [];
  }, [currentHealthCombo]);

  const runtimeConfig = useMemo(() => {
    if (!combo) return {};
    const base: Record<string, unknown> = {};
    if (combo.config) Object.assign(base, combo.config);
    if (combo.customOutputModel) base.customOutputModel = combo.customOutputModel;
    if (combo.context_length) base.context_length = combo.context_length;
    if (combo.context_cache_protection) base.context_cache_protection = combo.context_cache_protection;
    if (combo.tool_filter_regex) base.tool_filter_regex = combo.tool_filter_regex;
    return base;
  }, [combo]);

  if (loading && !combo) {
    return (
      <div style={{ padding: 60, textAlign: "center" }}>
        <Spin size="large" />
      </div>
    );
  }

  if (error && !combo) {
    return (
      <Flex vertical gap={16}>
        <Link to="/dashboard/combos">
          <Button icon={<MaterialIcon name="arrow_back" size={16} />} size="small">
            返回模型组合
          </Button>
        </Link>
        <Alert
          type="error"
          showIcon
          title="组合不可用或未找到"
          description={error}
          action={
            <Link to="/dashboard/combos">
              <Button size="small" type="primary">
                返回列表
              </Button>
            </Link>
          }
        />
      </Flex>
    );
  }

  if (!combo || !summary) return null;

  const stateColors: Record<ComboHealthState, { color: string; label: string }> = {
    healthy: { color: "success", label: "健康" },
    warning: { color: "warning", label: "警告" },
    critical: { color: "error", label: "严重" },
    idle: { color: "default", label: "空闲" },
  };

  return (
    <Flex vertical gap={16}>
      {/* Top Header */}
      <Flex align="center" justify="space-between" wrap gap={12}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <Title level={2} style={{ margin: 0, fontSize: 20 }}>
              组合控制中心
            </Title>
            <Tag color={stateColors[summary.healthState].color} style={{ fontSize: 12, padding: "2px 8px" }}>
              {stateColors[summary.healthState].label}
            </Tag>
            <Tag color={summary.isActive ? "purple" : "default"} style={{ fontSize: 12 }}>
              {summary.isActive ? "已启用" : "已停用"}
            </Tag>
          </div>
          <Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
            模型组合 <Text code strong>{combo.name}</Text> 的实时遥测、调度决策、目标健康度与配额消耗分析
          </Paragraph>
        </div>

        <Space wrap>
          <Button
            icon={<MaterialIcon name="refresh" size={16} />}
            onClick={() => void loadData()}
            loading={loading}
          >
            刷新
          </Button>
          <Link to="/dashboard/combos">
            <Button
              type="primary"
              icon={<MaterialIcon name="edit" size={16} />}
              style={{ background: "#8B5CF6", borderColor: "#8B5CF6" }}
            >
              编辑组合
            </Button>
          </Link>
        </Space>
      </Flex>

      {/* KPI Top 4 Blocks */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              请求总量
            </Text>
            <Title level={3} style={{ margin: "4px 0 0" }}>
              {summary.totalRequests.toLocaleString()}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {range} 统计窗口
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              请求成功率
            </Text>
            <Title
              level={3}
              style={{
                margin: "4px 0 0",
                color: summary.successRate >= 95 ? "#10B981" : summary.successRate >= 80 ? "#F59E0B" : "#EF4444",
              }}
            >
              {fmtPercent(summary.successRate)}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              运行时健康度加权
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              平均响应耗时
            </Text>
            <Title level={3} style={{ margin: "4px 0 0" }}>
              {fmtMs(summary.avgLatencyMs)}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              平均端到端响应耗时
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.5 }}>
              最差剩余配额
            </Text>
            <Title
              level={3}
              style={{
                margin: "4px 0 0",
                color:
                  summary.worstQuotaRemainingPct === null
                    ? "inherit"
                    : summary.worstQuotaRemainingPct >= 25
                    ? "#10B981"
                    : summary.worstQuotaRemainingPct >= 10
                    ? "#F59E0B"
                    : "#EF4444",
              }}
            >
              {fmtPercent(summary.worstQuotaRemainingPct)}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              提供商与账户遥测
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Overview Card */}
      <Card size="small" className={styles.overviewCard}>
        <Flex align="center" justify="space-between" wrap gap={12} style={{ marginBottom: 14 }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600 }}>运行概览与健康评估</span>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              当前生效策略、节点拓扑及系统自动生成的健康诊断项
            </Text>
          </div>

          <Segmented<TimeRange>
            size="small"
            value={range}
            onChange={(val) => setRange(val)}
            options={[
              { label: "1 小时", value: "1h" },
              { label: "24 小时", value: "24h" },
              { label: "7 天", value: "7d" },
              { label: "30 天", value: "30d" },
            ]}
          />
        </Flex>

        <Row gutter={[12, 12]}>
          <Col xs={24} sm={8}>
            <div className={styles.subBlock}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                调度策略
              </Text>
              <div style={{ marginTop: 4, fontWeight: 600, fontSize: 14 }}>
                {summary.strategyLabel}
                <Tag color="purple" style={{ marginLeft: 6, fontSize: 10 }}>
                  {summary.strategy}
                </Tag>
              </div>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div className={styles.subBlock}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                调度目标总数
              </Text>
              <div style={{ marginTop: 4, fontWeight: 600, fontSize: 14 }}>
                配置 {summary.targetCount} 个 · 解析 {resolvedTargets.length} 个
              </div>
            </div>
          </Col>

          <Col xs={24} sm={8}>
            <div className={styles.subBlock}>
              <Text type="secondary" style={{ fontSize: 11, textTransform: "uppercase" }}>
                覆盖提供商
              </Text>
              <div style={{ marginTop: 4, fontWeight: 600, fontSize: 14 }}>
                {summary.providerCount} 个独立提供商
              </div>
            </div>
          </Col>
        </Row>

        {/* Health Diagnostic Badges */}
        <div style={{ marginTop: 14 }}>
          <Text strong style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            系统健康诊断详情:
          </Text>
          <Space wrap size={[6, 6]}>
            {summary.healthReasons.map((r) => {
              const meta = HEALTH_REASONS_MAP[r] || { label: r, color: "default" };
              return (
                <Tag key={r} color={meta.color} style={{ fontSize: 12, padding: "2px 8px" }}>
                  {meta.label}
                </Tag>
              );
            })}
          </Space>
        </div>
      </Card>

      {/* Configured Targets & Runtime Config */}
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={15} style={{ display: "flex", flexDirection: "column" }}>
          <Card
            size="small"
            className={styles.sectionCard}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            styles={{ body: { flex: 1, display: "flex", flexDirection: "column" } }}
          >
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>已配置编排目标与遥测</span>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                按照路由策略顺序编排的候选模型、通配规则与嵌套子组合
              </Text>
            </div>

            {configuredTargets.length === 0 ? (
              <Empty description="该组合尚未配置任何目标模型" style={{ padding: 20 }} />
            ) : (
              <Scrollbar scrollX={false} style={{ flex: 1, maxHeight: 380 }}>
                <Flex vertical gap={10} style={{ paddingRight: 8 }}>
                  {configuredTargets.map((target) => {
                    const h = target.health;
                    const isCrit = h?.lastStatus === "error" || h?.quotaIsExhausted;
                    const isWarn = (h?.quotaRemainingPct ?? 100) < 25 || (h?.successRate ?? 100) < 95;
                    const toneClass = isCrit
                      ? styles.targetCardCritical
                      : isWarn
                      ? styles.targetCardWarning
                      : styles.targetCardHealthy;

                    return (
                      <div key={target.id} className={`${styles.targetCard} ${toneClass}`}>
                        <Flex align="center" justify="space-between" wrap gap={12}>
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Space size={6} wrap style={{ marginBottom: 4 }}>
                              <span
                                style={{
                                  width: 20,
                                  height: 20,
                                  borderRadius: "50%",
                                  background: "rgba(139, 92, 246, 0.15)",
                                  color: "#8B5CF6",
                                  fontSize: 11,
                                  fontWeight: 700,
                                  display: "inline-flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                {target.index + 1}
                              </span>
                              <Tag style={{ margin: 0, fontSize: 10 }}>
                                {target.kind === "combo-ref"
                                  ? "嵌套组合"
                                  : target.kind === "provider-wildcard"
                                  ? "提供商通配"
                                  : "模型目标"}
                              </Tag>
                              {target.weight > 0 && (
                                <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>
                                  权重: {target.weight}%
                                </Tag>
                              )}
                            </Space>

                            <div style={{ fontWeight: 600, fontSize: 13, fontFamily: "monospace" }}>
                              {target.label}
                            </div>
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {target.provider || "组合引用"} · 账户: {shortId(target.connectionId, "动态选择")}
                            </Text>
                          </div>

                          <div className={styles.telemetryGrid}>
                            <span style={{ color: token.colorTextSecondary }}>请求数:</span>
                            <span style={{ fontWeight: 600 }}>{h?.requests ?? 0}</span>
                            <span style={{ color: token.colorTextSecondary }}>平均延迟:</span>
                            <span style={{ fontWeight: 600 }}>{fmtMs(h?.avgLatencyMs)}</span>

                            <span style={{ color: token.colorTextSecondary }}>成功率:</span>
                            <span
                              style={{
                                fontWeight: 600,
                                color: (h?.successRate ?? 100) >= 95 ? "#10B981" : "#EF4444",
                              }}
                            >
                              {fmtPercent(h?.successRate)}
                            </span>
                            <span style={{ color: token.colorTextSecondary }}>剩余配额:</span>
                            <span style={{ fontWeight: 600 }}>{fmtPercent(h?.quotaRemainingPct)}</span>
                          </div>
                        </Flex>
                      </div>
                    );
                  })}
                </Flex>
              </Scrollbar>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={9} style={{ display: "flex", flexDirection: "column" }}>
          <Card
            size="small"
            className={styles.sectionCard}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            styles={{ body: { flex: 1, display: "flex", flexDirection: "column" } }}
          >
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>运行时配置参数</span>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                生效的重试策略、降级熔断与模型输出别名
              </Text>
            </div>

            {Object.keys(runtimeConfig).length === 0 ? (
              <Empty description="使用系统默认运行参数" style={{ padding: 20 }} />
            ) : (
              <Scrollbar scrollX={false} style={{ flex: 1, maxHeight: 380 }}>
                <Flex vertical gap={8} style={{ paddingRight: 8 }}>
                  {Object.entries(runtimeConfig).map(([key, val]) => (
                    <div key={key} className={styles.configRow}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {key}
                      </Text>
                      <Text code style={{ fontSize: 11, maxWidth: 160 }} ellipsis>
                        {typeof val === "object" ? JSON.stringify(val) : String(val)}
                      </Text>
                    </div>
                  ))}
                </Flex>
              </Scrollbar>
            )}
          </Card>
        </Col>
      </Row>

      {/* Resolved Dynamic Targets */}
      {resolvedTargets.length > 0 && (
        <Card size="small" className={styles.sectionCard}>
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>已解析动态目标健康度</span>
            <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
              通过通配或动态路由实际命中的下游物理端点指标
            </Text>
          </div>
          <Scrollbar scrollX={false} style={{ maxHeight: 280 }}>
            <Flex vertical gap={8} style={{ paddingRight: 8 }}>
              {resolvedTargets.map((rt, idx) => (
                <div key={rt.executionKey || `${rt.model}-${idx}`} className={styles.logRow}>
                  <Flex align="center" justify="space-between" wrap gap={12}>
                    <div>
                      <Text code strong style={{ fontSize: 13 }}>
                        {rt.model || "未知模型"}
                      </Text>
                      <div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>
                        提供商: {rt.provider || "未知"} · 账户: {shortId(rt.connectionId, "动态")} · 标识: {shortId(rt.executionKey, "默认")}
                      </div>
                    </div>
                    <Space size={16}>
                      <Text style={{ fontSize: 12 }}>请求: <b>{rt.requests ?? 0}</b></Text>
                      <Text style={{ fontSize: 12 }}>成功率: <b style={{ color: (rt.successRate ?? 100) >= 95 ? "#10B981" : "#EF4444" }}>{fmtPercent(rt.successRate)}</b></Text>
                      <Text style={{ fontSize: 12 }}>延迟: <b>{fmtMs(rt.avgLatencyMs)}</b></Text>
                      <Text style={{ fontSize: 12 }}>配额: <b>{fmtPercent(rt.quotaRemainingPct)}</b></Text>
                    </Space>
                  </Flex>
                </div>
              ))}
            </Flex>
          </Scrollbar>
        </Card>
      )}

      {/* Quota Distribution & Recent Decisions */}
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={12} style={{ display: "flex", flexDirection: "column" }}>
          <Card
            size="small"
            className={styles.sectionCard}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            styles={{ body: { flex: 1, display: "flex", flexDirection: "column" } }}
          >
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>配额健康度与分布偏斜</span>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                各提供商账户剩余配额与流量分布集中度
              </Text>
            </div>

            <Scrollbar scrollX={false} style={{ flex: 1, maxHeight: 320 }}>
              <Flex vertical gap={10} style={{ paddingRight: 8 }}>
                {(currentHealthCombo?.quotaHealth?.providers || []).length === 0 ? (
                  <Text type="secondary" style={{ fontSize: 12, textAlign: "center", padding: 16 }}>
                    暂无提供商配额快照
                  </Text>
                ) : (
                  currentHealthCombo?.quotaHealth?.providers?.map((p) => (
                    <div key={p.provider} className={styles.subBlock}>
                      <Flex align="center" justify="space-between" style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 12 }}>
                          {p.provider}
                        </Text>
                        <Space size={6}>
                          {p.isExhausted && <Tag color="error" style={{ margin: 0, fontSize: 10 }}>配额耗尽</Tag>}
                          <Text type="secondary" style={{ fontSize: 11 }}>
                            趋势: {p.trend === "improving" ? "提升中 ↗" : p.trend === "declining" ? "消耗中 ↘" : "稳定 →"}
                          </Text>
                        </Space>
                      </Flex>
                      <Progress
                        percent={p.remainingPct}
                        size="small"
                        status={p.isExhausted ? "exception" : p.remainingPct < 25 ? "normal" : "success"}
                        strokeColor={p.isExhausted ? "#EF4444" : p.remainingPct < 25 ? "#F59E0B" : "#10B981"}
                      />
                    </div>
                  ))
                )}

                <div className={styles.subBlock} style={{ marginTop: 4 }}>
                  <Flex align="center" justify="space-between">
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      流量分布偏斜度 (基尼系数):
                    </Text>
                    <Text strong style={{ fontSize: 13, color: summary.usageSkew >= 0.5 ? "#EF4444" : "#10B981" }}>
                      {summary.usageSkew.toFixed(2)} {summary.usageSkew >= 0.5 ? "(高度集中)" : "(相对均衡)"}
                    </Text>
                  </Flex>
                </div>
              </Flex>
            </Scrollbar>
          </Card>
        </Col>

        <Col xs={24} lg={12} style={{ display: "flex", flexDirection: "column" }}>
          <Card
            size="small"
            className={styles.sectionCard}
            style={{ flex: 1, display: "flex", flexDirection: "column" }}
            styles={{ body: { flex: 1, display: "flex", flexDirection: "column" } }}
          >
            <div style={{ marginBottom: 14 }}>
              <span style={{ fontSize: 14, fontWeight: 600 }}>近期路由决策与调用日志</span>
              <Text type="secondary" style={{ fontSize: 12, display: "block" }}>
                最近命中的下游分发记录与耗时明细
              </Text>
            </div>

            {callLogs.length === 0 ? (
              <Empty description="该组合暂无近期调用日志" style={{ padding: 20 }} />
            ) : (
              <Scrollbar scrollX={false} style={{ flex: 1, maxHeight: 320 }}>
                <Flex vertical gap={8} style={{ paddingRight: 8 }}>
                  {callLogs.slice(0, 10).map((log, idx) => {
                    const isOk = typeof log.status === "number" && log.status >= 200 && log.status < 400;
                    return (
                      <div key={log.id || `log-${idx}`} className={styles.logRow}>
                        <Flex align="center" justify="space-between" wrap gap={8}>
                          <div>
                            <Space size={6}>
                              <Tag color={isOk ? "success" : "error"} style={{ margin: 0, fontSize: 10 }}>
                                {log.status || "—"}
                              </Tag>
                              <Text code style={{ fontSize: 12 }}>
                                {log.model || "默认模型"}
                              </Text>
                            </Space>
                            <div style={{ fontSize: 11, color: token.colorTextSecondary, marginTop: 2 }}>
                              {fmtDate(log.timestamp)} · {log.provider || "提供商"} · 步进: {shortId(log.comboStepId || log.comboExecutionKey, "默认")}
                            </div>
                          </div>
                          <Text strong style={{ fontSize: 12 }}>
                            {fmtMs(log.duration || log.latencyMs)}
                          </Text>
                        </Flex>
                        {log.error && (
                          <div style={{ marginTop: 4, fontSize: 11, color: "#EF4444" }}>
                            {log.error}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </Flex>
              </Scrollbar>
            )}
          </Card>
        </Col>
      </Row>
    </Flex>
  );
}

export default ComboControlCenter;


