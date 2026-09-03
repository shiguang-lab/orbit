import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  Badge,
  Button,
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  monitoringHealthApi,
  type RuntimeHealthPayload,
  type RuntimeConnectionItem,
} from "@/entities/api";
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
  kpiCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    padding: "14px 16px",
    cursor: "pointer",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      transform: "translateY(-1px)",
      boxShadow: token.boxShadowTertiary,
    },
  },
  kpiCardActive: {
    borderColor: token.colorPrimary,
    boxShadow: `0 0 0 1px ${token.colorPrimary}`,
  },
  breakerChip: {
    borderRadius: 6,
    padding: "8px 10px",
    border: `1px solid ${token.colorBorderSecondary}`,
    display: "flex",
    flexDirection: "column",
    gap: 4,
  },
  feedItem: {
    padding: "8px 10px",
    borderRadius: 6,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
  },
  layerHeader: {
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    paddingTop: 12,
    marginTop: 12,
    "&:first-of-type": {
      borderTop: "none",
      paddingTop: 0,
      marginTop: 0,
    },
  },
}));

type FeedEventKind =
  | "circuit-opened"
  | "circuit-degraded"
  | "circuit-recovered"
  | "circuit-closed"
  | "cooldown-added"
  | "cooldown-cleared"
  | "lockout-added"
  | "lockout-cleared"
  | "session-new"
  | "quota-alert"
  | "quota-exhausted"
  | "quota-recovered";

interface FeedEvent {
  id: string;
  ts: number;
  kind: FeedEventKind;
  title: string;
  detail: string;
  group: "circuits" | "cooldowns" | "lockouts" | "sessions" | "quotas";
}

const FEED_META: Record<FeedEventKind, { icon: string; color: string; group: "circuits" | "cooldowns" | "lockouts" | "sessions" | "quotas" }> = {
  "circuit-opened": { icon: "block", color: "#ef4444", group: "circuits" },
  "circuit-degraded": { icon: "warning", color: "#f97316", group: "circuits" },
  "circuit-recovered": { icon: "sync", color: "#eab308", group: "circuits" },
  "circuit-closed": { icon: "check_circle", color: "#22c55e", group: "circuits" },
  "cooldown-added": { icon: "ac_unit", color: "#3b82f6", group: "cooldowns" },
  "cooldown-cleared": { icon: "lock_open", color: "#22c55e", group: "cooldowns" },
  "lockout-added": { icon: "lock", color: "#f97316", group: "lockouts" },
  "lockout-cleared": { icon: "lock_open", color: "#22c55e", group: "lockouts" },
  "session-new": { icon: "fingerprint", color: "#06b6d4", group: "sessions" },
  "quota-alert": { icon: "warning", color: "#eab308", group: "quotas" },
  "quota-exhausted": { icon: "error", color: "#ef4444", group: "quotas" },
  "quota-recovered": { icon: "check_circle", color: "#22c55e", group: "quotas" },
};

const BREAKER_CONFIG: Record<string, { labelZh: string; labelEn: string; color: string; bg: string; icon: string }> = {
  CLOSED: { labelZh: "正常", labelEn: "Healthy", color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: "check_circle" },
  HALF_OPEN: { labelZh: "探测恢复中", labelEn: "Probing", color: "#eab308", bg: "rgba(234,179,8,0.08)", icon: "sync" },
  DEGRADED: { labelZh: "降级运行", labelEn: "Degraded", color: "#f97316", bg: "rgba(249,115,22,0.08)", icon: "warning" },
  OPEN: { labelZh: "熔断拦截", labelEn: "Open", color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: "block" },
};

function fmtMs(ms?: number | null): string {
  if (!ms || ms <= 0) return "0s";
  if (ms < 1000) return `${ms}ms`;
  const s = Math.ceil(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
}

function fmtClock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });
}

function shortId(val?: string | null, max = 12): string {
  if (!val) return "—";
  return val.length > max ? `${val.slice(0, max)}…` : val;
}

export function RuntimePage() {
  const { styles } = useStyles();
  const { isZh, tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [paused, setPaused] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<number>(Date.now());
  const [feedFilter, setFeedFilter] = useState<string>("all");
  const [feed, setFeed] = useState<FeedEvent[]>([]);

  const prevSnapshotRef = useRef<{ health: RuntimeHealthPayload | null; conns: RuntimeConnectionItem[] }>({
    health: null,
    conns: [],
  });
  const initialLoadRef = useRef(true);

  const healthQuery = useQuery({
    queryKey: ["runtime-health-stats"],
    queryFn: monitoringHealthApi.getHealth,
    refetchInterval: paused ? false : 4000,
  });

  const cooldownsQuery = useQuery({
    queryKey: ["resilience-model-cooldowns"],
    queryFn: monitoringHealthApi.getModelCooldowns,
    refetchInterval: paused ? false : 4000,
  });

  const clearModelCooldownMutation = useMutation({
    mutationFn: ({ provider, model }: { provider: string; model: string }) =>
      monitoringHealthApi.clearModelCooldown(provider, model),
    onSuccess: () => {
      messageApi.success(tt("已解除该模型冷却限制", "Reactivated model"));
      void queryClient.invalidateQueries({ queryKey: ["resilience-model-cooldowns"] });
    },
  });

  const clearAllMutation = useMutation({
    mutationFn: monitoringHealthApi.clearAllModelCooldowns,
    onSuccess: () => {
      messageApi.success(tt("已重置所有模型冷却与熔断状态", "Reactivated all models and circuits"));
      void queryClient.invalidateQueries({ queryKey: ["resilience-model-cooldowns"] });
      void queryClient.invalidateQueries({ queryKey: ["runtime-health-stats"] });
    },
  });

  // Track real-time events via snapshot diffs
  useEffect(() => {
    if (!healthQuery.data) return;
    const nextHealth = healthQuery.data;
    const conns = nextHealth.connections || [];
    const nowTs = Date.now();
    setLastUpdated(nowTs);

    if (initialLoadRef.current) {
      initialLoadRef.current = false;
      prevSnapshotRef.current = { health: nextHealth, conns };
      // Initial initial seed events
      setFeed([
        {
          id: `init-${nowTs}`,
          ts: nowTs,
          kind: "circuit-closed",
          title: isZh ? "全链路断路器就绪" : "All circuits healthy",
          detail: isZh ? `网关接入 ${nextHealth.providerBreakers.length} 个提供商断路器` : `${nextHealth.providerBreakers.length} provider circuits active`,
          group: "circuits",
        },
      ]);
      return;
    }

    const prev = prevSnapshotRef.current;
    const newEvents: FeedEvent[] = [];

    // Diff breakers
    const prevBreakers = new Map((prev.health?.providerBreakers ?? []).map((b) => [b.provider, b]));
    for (const nb of nextHealth.providerBreakers) {
      const pb = prevBreakers.get(nb.provider);
      if (!pb) continue;
      const ps = String(pb.state || "").toUpperCase();
      const ns = String(nb.state || "").toUpperCase();
      if (ps !== ns) {
        if (ns === "OPEN") {
          newEvents.push({
            id: `cb-open-${nb.provider}-${nowTs}`,
            ts: nowTs,
            kind: "circuit-opened",
            title: `${nb.provider} 触发熔断`,
            detail: `已达到失败阈值 · 重试倒计时 ${fmtMs(nb.retryAfterMs)}`,
            group: "circuits",
          });
        } else if (ns === "CLOSED") {
          newEvents.push({
            id: `cb-closed-${nb.provider}-${nowTs}`,
            ts: nowTs,
            kind: "circuit-closed",
            title: `${nb.provider} 熔断恢复正常`,
            detail: "链路恢复通畅",
            group: "circuits",
          });
        }
      }
    }

    if (newEvents.length > 0) {
      setFeed((prevFeed) => [...newEvents, ...prevFeed].slice(0, 50));
    }
    prevSnapshotRef.current = { health: nextHealth, conns };
  }, [healthQuery.data, isZh]);

  const health = healthQuery.data || {
    status: "ok",
    timestamp: new Date().toISOString(),
    providerBreakers: [],
    connections: [],
    lockouts: {},
    quotaMonitor: { active: 0, alerting: 0, exhausted: 0, errors: 0, monitors: [] },
    sessions: { activeCount: 0, stickyBoundCount: 0, byApiKey: {}, top: [] },
  };

  const modelCooldowns = cooldownsQuery.data || [];
  const breakers = health.providerBreakers || [];
  const connections = health.connections || [];
  const lockoutEntries = Object.entries(health.lockouts || {});

  const activeCooldownConns = connections.filter((c) => {
    if (!c.rateLimitedUntil) return false;
    const ts = new Date(c.rateLimitedUntil).getTime();
    return Number.isFinite(ts) && ts > Date.now();
  });

  // Calculate stats
  let openCircuits = 0;
  let halfCircuits = 0;
  let degradedCircuits = 0;
  for (const b of breakers) {
    const s = String(b.state || "").toUpperCase();
    if (s === "OPEN") openCircuits++;
    else if (s === "HALF_OPEN") halfCircuits++;
    else if (s === "DEGRADED") degradedCircuits++;
  }
  const totalBreakers = breakers.length || 1;
  const healthyBreakers = totalBreakers - openCircuits - halfCircuits - degradedCircuits;
  const overallPercent = Math.max(0, Math.min(100, Math.round((healthyBreakers / totalBreakers) * 100)));

  const filteredFeed = useMemo(() => {
    if (feedFilter === "all") return feed;
    return feed.filter((ev) => ev.group === feedFilter);
  }, [feed, feedFilter]);

  const monitors = health.quotaMonitor?.monitors || [];
  const exhaustedMonitors = monitors.filter((m) => m.status === "exhausted");
  const alertingMonitors = monitors.filter((m) => m.status === "alerting");
  const errorMonitors = monitors.filter((m) => m.status === "error");

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="bolt" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("运行时监控与弹性控制中心", "Runtime & Resilience Control Center")}
                </Title>
                <Tag color={openCircuits > 0 ? "error" : "green"}>
                  {openCircuits > 0
                    ? tt(`⚠️ ${openCircuits} 个提供商熔断`, `⚠️ ${openCircuits} Circuits Open`)
                    : tt("全链路运行正常", "All Systems Operational")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "实时监控全网关提供商断路器、连接级限流退避、模型封锁、会话粘性绑定与实时熔断流。",
                  "Live telemetry monitoring for circuit breakers, rate-limit cooldowns, model lockouts, and session stickiness."
                )}
              </Text>
            </div>
          </Flex>

          <Space wrap>
            <span style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", fontFamily: "monospace" }}>
              ↻ {fmtClock(lastUpdated)}
            </span>
            <Button
              type="default"
              icon={<MaterialIcon name={paused ? "play_arrow" : "pause"} size={16} />}
              onClick={() => setPaused((p) => !p)}
            >
              {paused ? tt("恢复轮询", "Resume") : tt("暂停", "Pause")}
            </Button>
            <Button
              type="primary"
              icon={<MaterialIcon name="refresh" size={16} />}
              loading={healthQuery.isFetching}
              onClick={() => {
                void healthQuery.refetch();
                void cooldownsQuery.refetch();
              }}
            >
              {tt("立即刷新", "Refresh")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 2. Top 4 KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <div
            className={`${styles.kpiCard} ${feedFilter === "sessions" ? styles.kpiCardActive : ""}`}
            onClick={() => setFeedFilter(feedFilter === "sessions" ? "all" : "sessions")}
          >
            <Flex justify="space-between" align="center">
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("活跃会话数", "Active Sessions")}</Text>
              <MaterialIcon name="fingerprint" size={20} style={{ color: "#06b6d4" }} />
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#06b6d4", marginTop: 4, fontFamily: "monospace" }}>
              {health.sessions.activeCount}
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
              {tt(`${health.sessions.stickyBoundCount} 个粘性路由绑定`, `${health.sessions.stickyBoundCount} sticky bound`)}
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div
            className={`${styles.kpiCard} ${feedFilter === "circuits" ? styles.kpiCardActive : ""}`}
            onClick={() => setFeedFilter(feedFilter === "circuits" ? "all" : "circuits")}
          >
            <Flex justify="space-between" align="center">
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("断路器熔断状态", "Circuit Breakers")}</Text>
              <MaterialIcon name="bolt" size={20} style={{ color: openCircuits > 0 ? "#ef4444" : "#22c55e" }} />
            </Flex>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: openCircuits > 0 ? "#ef4444" : "#22c55e",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              {openCircuits} / {totalBreakers}
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
              {openCircuits > 0
                ? tt(`${openCircuits} 个断路器处于打开熔断状态`, `${openCircuits} open circuits`)
                : tt("全部提供商断路器处于健康闭合状态", "All circuits healthy (CLOSED)")}
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div
            className={`${styles.kpiCard} ${feedFilter === "cooldowns" ? styles.kpiCardActive : ""}`}
            onClick={() => setFeedFilter(feedFilter === "cooldowns" ? "all" : "cooldowns")}
          >
            <Flex justify="space-between" align="center">
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("连接限流冷却中", "Connection Cooldowns")}</Text>
              <MaterialIcon name="ac_unit" size={20} style={{ color: activeCooldownConns.length > 0 ? "#3b82f6" : "#22c55e" }} />
            </Flex>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: activeCooldownConns.length > 0 ? "#3b82f6" : "#22c55e",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              {activeCooldownConns.length}
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
              {activeCooldownConns.length > 0
                ? tt(`${activeCooldownConns.length} 个提供商连接正在退避冷却`, `${activeCooldownConns.length} cooling conns`)
                : tt("无处于限流状态的提供商连接", "No rate-limited connections")}
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div
            className={`${styles.kpiCard} ${feedFilter === "lockouts" ? styles.kpiCardActive : ""}`}
            onClick={() => setFeedFilter(feedFilter === "lockouts" ? "all" : "lockouts")}
          >
            <Flex justify="space-between" align="center">
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("模型冷却与封锁", "Model Lockouts")}</Text>
              <MaterialIcon name="lock" size={20} style={{ color: modelCooldowns.length > 0 ? "#f97316" : "#22c55e" }} />
            </Flex>
            <div
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: modelCooldowns.length > 0 ? "#f97316" : "#22c55e",
                marginTop: 4,
                fontFamily: "monospace",
              }}
            >
              {modelCooldowns.length}
            </div>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 4 }}>
              {modelCooldowns.length > 0
                ? tt(`${modelCooldowns.length} 个模型处于冷却封锁中`, `${modelCooldowns.length} models blocked`)
                : tt("无被封锁隔离的模型", "No models blocked")}
            </Text>
          </div>
        </Col>
      </Row>

      {/* Model Cooldowns Card */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="ac_unit" size={18} style={{ color: "#3b82f6" }} />
              <span>{tt("模型限流冷却状态", "Model Cooldowns")}</span>
            </Flex>
            <Space>
              <Button size="small" onClick={() => void cooldownsQuery.refetch()}>
                {tt("刷新", "Refresh")}
              </Button>
              {modelCooldowns.length > 0 && (
                <Button
                  size="small"
                  danger
                  loading={clearAllMutation.isPending}
                  onClick={() => clearAllMutation.mutate()}
                >
                  {tt("全部解封", "Reactivate All")}
                </Button>
              )}
            </Space>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        {modelCooldowns.length === 0 ? (
          <div style={{ padding: "16px 0", textAlign: "center", color: "var(--ant-color-text-secondary)" }}>
            {tt("当前没有处于限流冷却中的模型，所有路由模型就绪", "No models currently in cooldown")}
          </div>
        ) : (
          <Flex vertical gap={8}>
            {modelCooldowns.map((item) => (
              <Flex
                key={`${item.provider}::${item.model}`}
                justify="space-between"
                align="center"
                style={{
                  padding: "8px 12px",
                  borderRadius: 6,
                  background: "rgba(249, 115, 22, 0.06)",
                  border: "1px solid rgba(249, 115, 22, 0.2)",
                }}
              >
                <div>
                  <Text strong style={{ fontSize: 13 }}>
                    {item.provider} / <code>{item.model}</code>
                  </Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 2 }}>
                    {item.reason} · {tt(`剩余冷却时间: ${fmtMs(item.remainingMs)}`, `Remaining: ${fmtMs(item.remainingMs)}`)}
                  </div>
                </div>
                <Button
                  size="small"
                  type="primary"
                  ghost
                  loading={clearModelCooldownMutation.isPending}
                  onClick={() => clearModelCooldownMutation.mutate({ provider: item.provider, model: item.model })}
                >
                  {tt("立即解封", "Reactivate")}
                </Button>
              </Flex>
            ))}
          </Flex>
        )}
      </Card>

      {/* Row 2: Resilience Layers (Left 2/3) + Live Feed (Right 1/3) */}
      <Row gutter={[12, 12]}>
        <Col xs={24} xl={16}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <MaterialIcon name="shield" size={18} style={{ color: "#22c55e" }} />
                  <span>{tt("全链路弹性分层防御机制 (Resilience Layers)", "Resilience Layers")}</span>
                </Flex>
                <Space size={12}>
                  <span style={{ fontSize: 11, color: "#22c55e" }}>✓ {healthyBreakers} {tt("正常", "Healthy")}</span>
                  <span style={{ fontSize: 11, color: "#eab308" }}>⚠ {halfCircuits + degradedCircuits} {tt("探测中", "Probing")}</span>
                  <span style={{ fontSize: 11, color: "#ef4444" }}>⛔ {openCircuits} {tt("熔断", "Open")}</span>
                </Space>
              </Flex>
            }
            className={styles.sectionCard}
            size="small"
          >
            {/* Overall Score */}
            <div style={{ marginBottom: 14 }}>
              <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 4 }}>
                <Text type="secondary">{tt("全网关提供商健康度评分", "Overall Providers Health")}</Text>
                <Text strong>{overallPercent}%</Text>
              </Flex>
              <Progress percent={overallPercent} strokeColor={{ "0%": "#22c55e", "100%": "#10b981" }} size="small" />
            </div>

            {/* Layer 1: Circuit Breakers */}
            <div className={styles.layerHeader}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                <Flex align="center" gap={6}>
                  <Tag color="cyan">Layer 1</Tag>
                  <Text strong style={{ fontSize: 13 }}>{tt("提供商断路器 (Circuit Breakers)", "Provider Circuit Breakers")}</Text>
                </Flex>
                <Tag color={openCircuits > 0 ? "error" : "green"}>
                  {healthyBreakers} / {totalBreakers} {tt("正常", "Healthy")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                {tt("在提供商发生故障或超限时自动隔离，避免雪崩", "Isolate failing providers automatically to prevent cascading failures")}
              </Text>

              {breakers.length === 0 ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: "var(--ant-color-text-secondary)" }}>
                  {tt("暂无配置提供商断路器", "No provider breakers configured")}
                </div>
              ) : (
                <Row gutter={[8, 8]}>
                  {breakers.map((b) => {
                    const st = String(b.state || "CLOSED").toUpperCase();
                    const conf = BREAKER_CONFIG[st] || BREAKER_CONFIG.CLOSED;
                    return (
                      <Col xs={24} sm={12} md={8} lg={6} key={b.provider}>
                        <div
                          className={styles.breakerChip}
                          style={{
                            background: conf.bg,
                            borderColor: st === "CLOSED" ? undefined : conf.color,
                          }}
                        >
                          <Flex justify="space-between" align="center">
                            <Text strong style={{ fontSize: 12 }} ellipsis>
                              {b.provider}
                            </Text>
                            <span style={{ fontSize: 10, fontWeight: 700, color: conf.color }}>
                              {isZh ? conf.labelZh : conf.labelEn}
                            </span>
                          </Flex>
                          <Flex justify="space-between" align="center" style={{ fontSize: 10, color: "var(--ant-color-text-secondary)" }}>
                            <span>{tt(`失败: ${b.failureCount}`, `Failures: ${b.failureCount}`)}</span>
                            <span>{b.retryAfterMs > 0 ? `${fmtMs(b.retryAfterMs)}` : "OK"}</span>
                          </Flex>
                        </div>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </div>

            {/* Layer 2: Connection Cooldowns */}
            <div className={styles.layerHeader}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                <Flex align="center" gap={6}>
                  <Tag color="blue">Layer 2</Tag>
                  <Text strong style={{ fontSize: 13 }}>{tt("连接限流冷却状态 (Connection Cooldowns)", "Connection Cooldowns")}</Text>
                </Flex>
                <Tag color={activeCooldownConns.length > 0 ? "blue" : "green"}>
                  {activeCooldownConns.length} {tt("冷却中", "Cooling")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                {tt("针对单个提供商凭据的 429 退避隔离", "Per-credential rate-limit backoff and cooldown tracking")}
              </Text>

              {activeCooldownConns.length === 0 ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: "var(--ant-color-text-secondary)" }}>
                  {tt("暂无处于限流冷却中的提供商连接", "No connections currently in rate-limit cooldown")}
                </div>
              ) : (
                <Row gutter={[8, 8]}>
                  {activeCooldownConns.slice(0, 8).map((c) => (
                    <Col xs={24} sm={12} key={c.id}>
                      <div
                        style={{
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--ant-color-border-secondary)",
                          background: "var(--ant-color-bg-elevated)",
                        }}
                      >
                        <Flex justify="space-between" align="center">
                          <Text strong style={{ fontSize: 12 }} ellipsis>
                            {c.provider} / {c.name || c.displayName || c.email || c.id.slice(0, 8)}
                          </Text>
                          <Tag color="orange" style={{ margin: 0, fontSize: 10 }}>
                            {c.rateLimitedUntil ? fmtMs(new Date(c.rateLimitedUntil).getTime() - Date.now()) : "OK"}
                          </Tag>
                        </Flex>
                        <div style={{ fontSize: 10, color: "var(--ant-color-text-secondary)", marginTop: 4 }}>
                          {c.lastError ? `错误: ${c.lastError}` : `退避等级: L${c.backoffLevel || 0}`}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </div>

            {/* Layer 3: Model Lockouts */}
            <div className={styles.layerHeader}>
              <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                <Flex align="center" gap={6}>
                  <Tag color="orange">Layer 3</Tag>
                  <Text strong style={{ fontSize: 13 }}>{tt("模型锁定池 (Model Lockouts)", "Model Lockouts")}</Text>
                </Flex>
                <Tag color={lockoutEntries.length > 0 ? "orange" : "green"}>
                  {lockoutEntries.length} {tt("已锁定", "Locked")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 11, display: "block", marginBottom: 8 }}>
                {tt("针对特定模型的并发超限与封锁管理", "Per-model rate limiting and transient lockout protection")}
              </Text>

              {lockoutEntries.length === 0 ? (
                <div style={{ padding: "12px 0", textAlign: "center", color: "var(--ant-color-text-secondary)" }}>
                  {tt("暂无被锁定隔离的模型", "No models currently locked out")}
                </div>
              ) : (
                <Row gutter={[8, 8]}>
                  {lockoutEntries.slice(0, 8).map(([key, lk]) => (
                    <Col xs={24} sm={12} key={key}>
                      <div
                        style={{
                          padding: "8px 10px",
                          borderRadius: 6,
                          border: "1px solid var(--ant-color-border-secondary)",
                          background: "var(--ant-color-bg-elevated)",
                        }}
                      >
                        <Flex justify="space-between" align="center">
                          <Text strong style={{ fontSize: 12 }} ellipsis>
                            {key}
                          </Text>
                          <span style={{ fontSize: 10, color: "#f97316" }}>
                            {typeof lk.remainingMs === "number" ? fmtMs(lk.remainingMs) : "—"}
                          </span>
                        </Flex>
                        <div style={{ fontSize: 10, color: "var(--ant-color-text-secondary)", marginTop: 4 }}>
                          {lk.reason || "Rate-limit lockout"}
                        </div>
                      </div>
                    </Col>
                  ))}
                </Row>
              )}
            </div>
          </Card>
        </Col>

        {/* Live Feed (Right 1/3) */}
        <Col xs={24} xl={8}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={6}>
                  <MaterialIcon name="feed" size={18} style={{ color: "#a855f7" }} />
                  <span>{tt("实时事件流 (Live Feed)", "Live Resilience Feed")}</span>
                </Flex>
                <Badge status="processing" text={tt("实时监听", "Live")} />
              </Flex>
            }
            className={styles.sectionCard}
            size="small"
            style={{ height: "100%" }}
          >
            <Flex justify="space-between" align="center" style={{ marginBottom: 10 }}>
              <Select
                value={feedFilter}
                onChange={setFeedFilter}
                size="small"
                style={{ width: 130 }}
                options={[
                  { label: tt("全部事件", "All Events"), value: "all" },
                  { label: tt("断路器事件", "Circuits"), value: "circuits" },
                  { label: tt("冷却事件", "Cooldowns"), value: "cooldowns" },
                  { label: tt("锁定事件", "Lockouts"), value: "lockouts" },
                  { label: tt("会话事件", "Sessions"), value: "sessions" },
                  { label: tt("配额事件", "Quotas"), value: "quotas" },
                ]}
              />
              <Button size="small" type="text" onClick={() => setFeed([])}>
                {tt("清空", "Clear")}
              </Button>
            </Flex>

            <Flex vertical gap={6} style={{ maxHeight: 420, overflowY: "auto", paddingRight: 2 }}>
              {filteredFeed.length === 0 ? (
                <div style={{ padding: "32px 0", textAlign: "center", color: "var(--ant-color-text-secondary)" }}>
                  <MaterialIcon name="hourglass_empty" size={32} style={{ opacity: 0.3, display: "block", margin: "0 auto 8px" }} />
                  <span style={{ fontSize: 12 }}>{tt("正在监听实时全链路状态变迁...", "Waiting for live resilience events...")}</span>
                </div>
              ) : (
                filteredFeed.map((ev) => {
                  const meta = FEED_META[ev.kind] || FEED_META["circuit-closed"];
                  return (
                    <div className={styles.feedItem} key={ev.id}>
                      <MaterialIcon name={meta.icon} size={16} style={{ color: meta.color, marginTop: 2 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Flex justify="space-between" align="center">
                          <Text strong style={{ fontSize: 12 }}>{ev.title}</Text>
                          <span style={{ fontSize: 9, color: "var(--ant-color-text-secondary)" }}>{fmtClock(ev.ts)}</span>
                        </Flex>
                        <Text type="secondary" style={{ fontSize: 11, display: "block" }}>
                          {ev.detail}
                        </Text>
                      </div>
                    </div>
                  );
                })
              )}
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* Row 3: Sessions Table (Left 3/5) + Quota Monitors (Right 2/5) */}
      <Row gutter={[12, 12]}>
        <Col xs={24} xl={14}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <MaterialIcon name="fingerprint" size={18} style={{ color: "#06b6d4" }} />
                  <span>{tt("活跃会话与粘性路由 (Sessions & Sticky Routing)", "Active Sessions")}</span>
                </Flex>
                <Tag color="cyan">{health.sessions.activeCount} {tt("个活跃会话", "Active")}</Tag>
              </Flex>
            }
            className={styles.sectionCard}
            size="small"
          >
            {(health.sessions.top || []).length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ant-color-text-secondary)" }}>
                <MaterialIcon name="fingerprint" size={36} style={{ opacity: 0.3, display: "block", margin: "0 auto 6px" }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{tt("暂无活跃长连接会话", "No active sessions")}</span>
                <p style={{ fontSize: 11, marginTop: 4 }}>{tt("当客户端建立会话或开启粘性会话时将在此列出", "Active sessions will appear here as requests stream through")}</p>
              </div>
            ) : (
              <div>
                <Table
                  dataSource={health.sessions.top}
                  rowKey="sessionId"
                  size="small"
                  pagination={false}
                  columns={[
                    {
                      title: tt("会话 ID", "Session ID"),
                      dataIndex: "sessionId",
                      render: (v) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{shortId(v, 14)}</span>,
                    },
                    {
                      title: tt("存活时间", "Age"),
                      dataIndex: "ageMs",
                      align: "right",
                      render: (v) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtMs(v)}</span>,
                    },
                    {
                      title: tt("空闲时间", "Idle"),
                      dataIndex: "idleMs",
                      align: "right",
                      render: (v) => <span style={{ fontFamily: "monospace", fontSize: 11 }}>{fmtMs(v)}</span>,
                    },
                    {
                      title: tt("请求数", "Requests"),
                      dataIndex: "requestCount",
                      align: "right",
                      render: (v) => <Text strong style={{ fontFamily: "monospace", fontSize: 11 }}>{v}</Text>,
                    },
                    {
                      title: tt("绑定连接", "Bound Connection"),
                      dataIndex: "connectionId",
                      render: (v) =>
                        v ? (
                          <Tag color="cyan" style={{ fontFamily: "monospace", fontSize: 10 }}>{shortId(v, 12)}</Tag>
                        ) : (
                          <span style={{ color: "var(--ant-color-text-secondary)" }}>—</span>
                        ),
                    },
                  ]}
                />
              </div>
            )}
          </Card>
        </Col>

        {/* Quota Monitors */}
        <Col xs={24} xl={10}>
          <Card
            title={
              <Flex justify="space-between" align="center">
                <Flex align="center" gap={8}>
                  <MaterialIcon name="radar" size={18} style={{ color: "#f59e0b" }} />
                  <span>{tt("配额监控告警 (Quota Monitors)", "Quota Monitors")}</span>
                </Flex>
                <Link to="/dashboard/quota" style={{ fontSize: 11, color: "var(--ant-color-primary)" }}>
                  {tt("打开配额管理 →", "Open Quotas →")}
                </Link>
              </Flex>
            }
            className={styles.sectionCard}
            size="small"
          >
            {exhaustedMonitors.length === 0 && alertingMonitors.length === 0 && errorMonitors.length === 0 ? (
              <div style={{ padding: "24px 0", textAlign: "center", color: "var(--ant-color-text-secondary)" }}>
                <MaterialIcon name="check_circle" size={36} style={{ color: "#22c55e", display: "block", margin: "0 auto 6px", opacity: 0.8 }} />
                <span style={{ fontSize: 13, fontWeight: 600 }}>{tt("所有提供商配额处于健康水位", "All quotas healthy")}</span>
                <p style={{ fontSize: 11, marginTop: 4 }}>{tt("无耗尽或警戒告警的提供商额度窗口", "No exhausted or alerting quota windows")}</p>
              </div>
            ) : (
              <Flex vertical gap={8}>
                {exhaustedMonitors.map((m, i) => (
                  <div
                    key={`ex-${i}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "rgba(239, 68, 68, 0.08)",
                      border: "1px solid rgba(239, 68, 68, 0.2)",
                    }}
                  >
                    <Flex justify="space-between" align="center">
                      <Text strong style={{ fontSize: 12 }}>{m.accountId || m.provider} ({m.window})</Text>
                      <Tag color="error">{tt("已耗尽", "Exhausted")}</Tag>
                    </Flex>
                  </div>
                ))}
                {alertingMonitors.map((m, i) => (
                  <div
                    key={`al-${i}`}
                    style={{
                      padding: "8px 10px",
                      borderRadius: 6,
                      background: "rgba(234, 179, 8, 0.08)",
                      border: "1px solid rgba(234, 179, 8, 0.2)",
                    }}
                  >
                    <Flex justify="space-between" align="center">
                      <Text strong style={{ fontSize: 12 }}>{m.accountId || m.provider} ({m.window})</Text>
                      <Tag color="warning">{tt(`仅剩 ${Math.round(m.remainingPercent || 0)}%`, `${Math.round(m.remainingPercent || 0)}% left`)}</Tag>
                    </Flex>
                  </div>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default RuntimePage;
