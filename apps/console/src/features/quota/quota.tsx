import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Flex,
  Input,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import {
  providersApi,
  quotaApi,
  type ProviderConnection,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";
import {
  parseQuotaData,
  hasCanonicalWindowOrder,
  sortQuotasByWindow,
} from "./quotaParsing";
import {
  formatQuotaLabel,
  formatResetTime,
  calculatePercentage,
  getPurchaseType,
  getWorstStatus,
  supportsProviderQuota,
  filterQuotasByVisibility,
  getHiddenQuotaRows,
  getQuotaVisibilityKey,
  PROVIDER_LABEL,
  type PurchaseTypeKey,
  type StatusKey,
} from "./quotaUtils";
import { QuotaCutoffModal } from "./QuotaCutoffModal";
import { ProviderUsdCostModal } from "./ProviderUsdCostModal";

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
    boxShadow: token.boxShadowTertiary,
  },
  kpiCard: {
    borderRadius: 10,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
      transform: "translateY(-1px)",
      boxShadow: token.boxShadowSecondary,
    },
  },
  filterCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  providerSectionCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    overflow: "hidden",
    transition: "all 0.2s ease",
  },
  accountCard: {
    borderRadius: 10,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    height: "100%",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimary,
      boxShadow: token.boxShadowSecondary,
    },
  },
  quotaWindowRow: {
    padding: "8px 10px",
    background: token.colorFillQuaternary,
    borderRadius: 8,
    marginBottom: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  quotaScrollArea: {
    "&::-webkit-scrollbar": {
      width: 4,
    },
    "&::-webkit-scrollbar-thumb": {
      background: token.colorFillSecondary,
      borderRadius: 4,
    },
    "&::-webkit-scrollbar-thumb:hover": {
      background: token.colorFill,
    },
  },
  poolDrawerCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    marginBottom: 12,
    padding: 12,
    background: token.colorFillQuaternary,
  },
}));

interface ConnectionQuotaState {
  quotas: any[];
  plan: string | null;
  message: string | null;
  raw?: any;
  lastRefreshedAt?: string | null;
}

export function QuotaPage() {
  const { styles } = useStyles();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  // Expanded Model rows per account
  const [expandedAccounts, setExpandedAccounts] = useState<Record<string, boolean>>({});

  // Filters & State
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState<string>("all");
  const [purchaseFilter, setPurchaseFilter] = useState<PurchaseTypeKey>("all");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [supportsQuotaOnly, setSupportsQuotaOnly] = useState<boolean>(true);

  // Auto-refresh clock
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(180);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(180);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  // Active Collapsible Provider Panels
  const [activePanels, setActivePanels] = useState<string[]>([]);

  // Cutoff Modal, Cost Modal & Pool Drawer
  const [cutoffTarget, setCutoffTarget] = useState<ProviderConnection | null>(null);
  const [costModalConnection, setCostModalConnection] = useState<ProviderConnection | null>(null);
  const [poolDrawerVisible, setPoolDrawerVisible] = useState(false);

  // Per-operator Quota Visibility
  const [quotaVisibility, setQuotaVisibility] = useState<Record<string, { hidden?: string[] }>>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => (r.ok ? r.json() : {}))
      .then((data: any) => {
        if (data?.quotaVisibility && typeof data.quotaVisibility === "object") {
          setQuotaVisibility(data.quotaVisibility);
        }
      })
      .catch(() => {});
  }, []);

  const handleToggleQuotaVisibility = useCallback(
    async (provider: string, quotaKey: string, hide: boolean) => {
      const prev = quotaVisibility;
      const providerVis = prev[provider] || {};
      const hidden = new Set(providerVis.hidden || []);
      if (hide) {
        hidden.add(quotaKey);
      } else {
        hidden.delete(quotaKey);
      }
      const next = {
        ...prev,
        [provider]: { ...providerVis, hidden: Array.from(hidden) },
      };
      setQuotaVisibility(next);
      try {
        await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ quotaVisibility: next }),
        });
        messageApi.success(hide ? "已隐藏该配额项" : "已恢复显示配额项");
      } catch {
        setQuotaVisibility(prev);
        messageApi.error("更新配额显隐失败");
      }
    },
    [quotaVisibility, messageApi]
  );


  // Quota Windows Defaults
  const [providerWindowDefaults, setProviderWindowDefaults] = useState<Record<string, Record<string, number>>>({});
  const [globalThresholdDefault, setGlobalThresholdDefault] = useState<number>(98);

  // Cached Quota State map: { [connectionId]: ConnectionQuotaState }
  const [quotaStateMap, setQuotaStateMap] = useState<Record<string, ConnectionQuotaState>>({});

  // 1. Fetch Connections
  const connectionsQuery = useQuery({
    queryKey: ["providers-connections"],
    queryFn: async () => {
      const res = await providersApi.list({ limit: 100 });
      return Array.isArray(res?.connections) ? res.connections : [];
    },
    staleTime: 20_000,
  });

  const connections = connectionsQuery.data ?? [];

  // 2. Fetch Catalog for metadata/colors
  const catalogQuery = useQuery({
    queryKey: ["providers-catalog"],
    queryFn: () => providersApi.catalog(),
    staleTime: 60_000,
  });

  const catalogMap = useMemo(() => {
    const map = new Map<string, { name: string; color?: string; icon?: string }>();
    for (const cat of catalogQuery.data?.categories ?? []) {
      for (const p of cat.providers ?? []) {
        map.set(p.id, { name: p.name, color: p.color, icon: p.icon });
      }
    }
    return map;
  }, [catalogQuery.data]);

  // 3. Fetch Quota Windows Defaults
  useEffect(() => {
    fetch("/api/providers/quota-windows")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        setProviderWindowDefaults(data.defaults?.providerWindowDefaults || {});
        if (typeof data.defaults?.globalThresholdPercent === "number") {
          setGlobalThresholdDefault(data.defaults.globalThresholdPercent);
        }
      })
      .catch(() => {});
  }, []);

  // 4. Fetch Quota Pools
  const poolsQuery = useQuery({
    queryKey: ["quota-pools"],
    queryFn: () => quotaApi.listPools(),
    staleTime: 30_000,
  });

  const pools = useMemo(
    () => (Array.isArray(poolsQuery.data) ? poolsQuery.data : []),
    [poolsQuery.data]
  );

  // 5. Initial / Full Provider Limits fetch
  const fetchCachedLimits = useCallback(async () => {
    try {
      const res = await fetch("/api/usage/provider-limits");
      if (!res.ok) return;
      const data = await res.json();
      const caches = data?.caches || {};
      const nextMap: Record<string, ConnectionQuotaState> = {};

      for (const conn of connections) {
        const cached = caches[conn.id];
        if (cached) {
          nextMap[conn.id] = {
            quotas: parseQuotaData(conn.provider, cached),
            plan: cached.plan || null,
            message: cached.message || null,
            raw: cached,
            lastRefreshedAt: cached.fetchedAt || null,
          };
        }
      }
      setQuotaStateMap((prev) => ({ ...prev, ...nextMap }));
    } catch {
      // ignore
    }
  }, [connections]);

  useEffect(() => {
    if (connections.length > 0) {
      void fetchCachedLimits();
    }
  }, [connections, fetchCachedLimits]);

  // Refresh Single Provider Quota on-demand
  const fetchSingleQuota = useCallback(
    async (connectionId: string, provider: string, force = true) => {
      setLoadingMap((prev) => ({ ...prev, [connectionId]: true }));
      try {
        const res = await fetch(`/api/usage/${encodeURIComponent(connectionId)}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData?.error || `HTTP ${res.status}`);
        }
        const data = await res.json();
        const parsed = parseQuotaData(provider, data);
        setQuotaStateMap((prev) => ({
          ...prev,
          [connectionId]: {
            quotas: parsed,
            plan: data.plan || null,
            message: data.message || null,
            raw: data,
            lastRefreshedAt: new Date().toISOString(),
          },
        }));
        if (force) messageApi.success("配额已刷新");
      } catch (err: unknown) {
        if (force) messageApi.error(err instanceof Error ? err.message : "刷新失败");
      } finally {
        setLoadingMap((prev) => ({ ...prev, [connectionId]: false }));
      }
    },
    [messageApi]
  );

  // Refresh all accounts belonging to a single provider
  const handleRefreshProviderAccounts = async (providerId: string) => {
    const providerConns = connections.filter((c) => c.provider === providerId);
    if (providerConns.length === 0) return;
    messageApi.loading({ content: `正在同步 ${PROVIDER_LABEL[providerId] || providerId} 账号配额...`, key: `refresh-${providerId}` });
    await Promise.allSettled(providerConns.map((c) => fetchSingleQuota(c.id, c.provider, false)));
    messageApi.success({ content: `${PROVIDER_LABEL[providerId] || providerId} 配额同步完成`, key: `refresh-${providerId}` });
  };

  // Refresh All Quotas
  const handleRefreshAll = useCallback(async () => {
    setRefreshingAll(true);
    setSecondsRemaining(autoRefreshInterval);
    try {
      const res = await fetch("/api/usage/provider-limits", { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        const caches = data?.caches || {};
        const nextMap: Record<string, ConnectionQuotaState> = {};
        for (const conn of connections) {
          const cached = caches[conn.id];
          if (cached) {
            nextMap[conn.id] = {
              quotas: parseQuotaData(conn.provider, cached),
              plan: cached.plan || null,
              message: cached.message || null,
              raw: cached,
              lastRefreshedAt: cached.fetchedAt || new Date().toISOString(),
            };
          }
        }
        setQuotaStateMap((prev) => ({ ...prev, ...nextMap }));
        messageApi.success("已完成全量配额同步");
      }
    } catch {
      messageApi.error("全量刷新失败");
    } finally {
      setRefreshingAll(false);
    }
  }, [autoRefreshInterval, connections, messageApi]);

  // Auto-refresh Countdown Timer
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;
    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev <= 1) {
          void handleRefreshAll();
          return autoRefreshInterval;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [autoRefreshInterval, handleRefreshAll]);

  // Toggle Connection Active
  const handleToggleActive = async (connectionId: string, nextActive: boolean) => {
    try {
      await providersApi.update(connectionId, { isActive: nextActive });
      messageApi.success(nextActive ? "已启用连接" : "已停用连接");
      void queryClient.invalidateQueries({ queryKey: ["providers-connections"] });
    } catch {
      messageApi.error("更新连接状态失败");
    }
  };

  // Save Quota Cutoff Thresholds
  const handleSaveCutoff = async (patch: Record<string, number | null> | null) => {
    if (!cutoffTarget) return;
    try {
      await providersApi.update(cutoffTarget.id, { quotaWindowThresholds: patch });
      messageApi.success("切流阈值已保存");
      setCutoffTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["providers-connections"] });
    } catch {
      messageApi.error("保存切流阈值失败");
    }
  };

  const deletePoolMutation = useMutation({
    mutationFn: (poolId: string) => quotaApi.deletePool(poolId),
    onSuccess: () => {
      messageApi.success("共享池已删除");
      void queryClient.invalidateQueries({ queryKey: ["quota-pools"] });
    },
    onError: (err: unknown) => {
      messageApi.error(err instanceof Error ? err.message : "删除共享池失败");
    },
  });

  // Base visible connections (honoring supportsQuotaOnly and quotaVisible)
  const baseConnections = useMemo(() => {
    return connections.filter((conn) => {
      if (conn.quotaVisible === false) return false;
      if (supportsQuotaOnly && !supportsProviderQuota(conn.provider)) return false;
      return true;
    });
  }, [connections, supportsQuotaOnly]);

  // Dynamic Provider options with count
  const providerOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of baseConnections) {
      if (c.provider) {
        counts.set(c.provider, (counts.get(c.provider) || 0) + 1);
      }
    }
    return [
      { value: "all", label: `全部提供商 (${baseConnections.length})` },
      ...Array.from(counts.entries()).map(([p, count]) => ({
        value: p,
        label: `${PROVIDER_LABEL[p] || catalogMap.get(p)?.name || p} (${count})`,
      })),
    ];
  }, [baseConnections, catalogMap]);

  // Dynamic Purchase type options (only show existing types)
  const purchaseOptions = useMemo(() => {
    const counts: Record<string, number> = { "oauth-sub": 0, "oauth-free": 0, apikey: 0 };
    for (const c of baseConnections) {
      const quotaInfo = quotaStateMap[c.id];
      const plan = quotaInfo?.plan || (c.plan as string) || "";
      const pType = getPurchaseType(c.authType, plan);
      if (pType in counts) counts[pType]++;
    }
    const opts: Array<{ value: PurchaseTypeKey; label: string }> = [
      { value: "all", label: `全部类型 (${baseConnections.length})` },
    ];
    if (counts["oauth-sub"] > 0) {
      opts.push({ value: "oauth-sub", label: `订阅 (${counts["oauth-sub"]})` });
    }
    if (counts["oauth-free"] > 0) {
      opts.push({ value: "oauth-free", label: `OAuth 免费 (${counts["oauth-free"]})` });
    }
    if (counts["apikey"] > 0) {
      opts.push({ value: "apikey", label: `API Key (${counts["apikey"]})` });
    }
    return opts;
  }, [baseConnections, quotaStateMap]);

  // Dynamic Tier/Plan options (only show existing plans)
  const tierOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const c of baseConnections) {
      const quotaInfo = quotaStateMap[c.id];
      const plan = (quotaInfo?.plan || (c.plan as string) || "").trim();
      if (plan) {
        counts.set(plan, (counts.get(plan) || 0) + 1);
      }
    }
    if (counts.size === 0) return [];
    return [
      { value: "all", label: `${tt("全部层级", "All Tiers")} (${baseConnections.length})` },
      ...Array.from(counts.entries()).map(([plan, count]) => ({
        value: plan,
        label: `${plan} (${count})`,
      })),
    ];
  }, [baseConnections, quotaStateMap, tt]);

  // Dynamic Status options
  const statusOptions = useMemo(() => {
    const counts: Record<StatusKey, number> = { all: 0, ok: 0, alert: 0, critical: 0, empty: 0 };
    for (const c of baseConnections) {
      const quotaInfo = quotaStateMap[c.id];
      const st = getWorstStatus(quotaInfo?.quotas);
      counts[st]++;
    }
    const opts: Array<{ value: StatusKey; label: string }> = [
      { value: "all", label: `${tt("全部状态", "All Statuses")} (${baseConnections.length})` },
    ];
    if (counts.ok > 0) {
      opts.push({ value: "ok", label: `${tt("充足", "Healthy")} >50% (${counts.ok})` });
    }
    if (counts.alert > 0) {
      opts.push({ value: "alert", label: `${tt("预警", "Warning")} 20%~50% (${counts.alert})` });
    }
    if (counts.critical > 0) {
      opts.push({ value: "critical", label: `${tt("告急", "Critical")} ≤20% (${counts.critical})` });
    }
    if (counts.empty > 0) {
      opts.push({ value: "empty", label: `${tt("未获取到数据", "No Data")} (${counts.empty})` });
    }
    return opts;
  }, [baseConnections, quotaStateMap, tt]);

  // Auto-reset invalid filter values when options change
  useEffect(() => {
    if (providerFilter !== "all" && !providerOptions.some((o) => o.value === providerFilter)) {
      setProviderFilter("all");
    }
    if (purchaseFilter !== "all" && !purchaseOptions.some((o) => o.value === purchaseFilter)) {
      setPurchaseFilter("all");
    }
    if (statusFilter !== "all" && !statusOptions.some((o) => o.value === statusFilter)) {
      setStatusFilter("all");
    }
    if (tierFilter !== "all" && !tierOptions.some((o) => o.value.toLowerCase() === tierFilter.toLowerCase())) {
      setTierFilter("all");
    }
  }, [providerFilter, purchaseFilter, statusFilter, tierFilter, providerOptions, purchaseOptions, statusOptions, tierOptions]);

  // Grouping connections by Provider (一级分类: Provider -> 二级: Accounts)
  const providerGroups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map<string, ProviderConnection[]>();

    for (const conn of baseConnections) {
      const quotaInfo = quotaStateMap[conn.id];
      const quotas = quotaInfo?.quotas || [];
      const plan = quotaInfo?.plan || (conn.plan as string) || "";
      const purchaseType = getPurchaseType(conn.authType, plan);
      const worstStatus = getWorstStatus(quotas);

      if (providerFilter !== "all" && conn.provider !== providerFilter) continue;
      if (purchaseFilter !== "all" && purchaseType !== purchaseFilter) continue;
      if (statusFilter !== "all" && worstStatus !== statusFilter) continue;
      if (tierFilter !== "all" && plan.toLowerCase() !== tierFilter.toLowerCase()) continue;

      if (q) {
        const matches =
          conn.name.toLowerCase().includes(q) ||
          conn.provider.toLowerCase().includes(q) ||
          conn.id.toLowerCase().includes(q) ||
          plan.toLowerCase().includes(q) ||
          (conn.baseUrl && conn.baseUrl.toLowerCase().includes(q));
        if (!matches) continue;
      }

      const list = map.get(conn.provider) || [];
      list.push(conn);
      map.set(conn.provider, list);
    }

    return Array.from(map.entries()).map(([provider, accountList]) => ({
      provider,
      accounts: accountList,
    }));
  }, [baseConnections, quotaStateMap, providerFilter, purchaseFilter, statusFilter, tierFilter, search]);

  // Set default all panels expanded (only once on initial data load)
  const hasInitializedPanelsRef = useRef(false);
  useEffect(() => {
    if (providerGroups.length > 0 && !hasInitializedPanelsRef.current) {
      hasInitializedPanelsRef.current = true;
      setActivePanels(providerGroups.map((g) => g.provider));
    }
  }, [providerGroups]);

  // Overall KPI Metrics
  const kpi = useMemo(() => {
    const total = baseConnections.length;
    let ok = 0;
    let alert = 0;
    let critical = 0;
    let empty = 0;
    let active = 0;

    for (const conn of baseConnections) {
      if (conn.isActive !== false) active++;
      const quotaInfo = quotaStateMap[conn.id];
      const st = getWorstStatus(quotaInfo?.quotas);
      if (st === "ok") ok++;
      else if (st === "alert") alert++;
      else if (st === "critical") critical++;
      else empty++;
    }

    return { total, active, ok, alert, critical, empty };
  }, [baseConnections, quotaStateMap]);

  if (connectionsQuery.isLoading && connections.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Header Banner */}
      <Card size="small" className={styles.headerCard}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <div>
            <Flex align="center" gap={8}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "#F472B622",
                  color: "#F472B6",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <MaterialIcon name="tune" size={18} />
              </div>
              <Title level={4} style={{ margin: 0 }}>
                {tt("提供者配额与限制监控 (Provider Limits & Quota)", "Provider Limits & Quota Monitoring")}
              </Title>
              <Tag color="magenta">{tt("实时监测", "Live")}</Tag>
            </Flex>
            <Text type="secondary" style={{ fontSize: 13, marginTop: 4, display: "block" }}>
              {tt(
                "按提供商类型分组聚合，多维度追踪上游各账号的时间窗口、额度余量、重置倒计时与智能降级切流阈值。",
                "Grouped by provider to track account windows, remaining quotas, reset countdowns, and automatic failover thresholds."
              )}
            </Text>
          </div>

          <Space wrap size={8}>
            <Tooltip title={tt("自动刷新倒计时，点击可立即全量同步", "Auto-refresh countdown. Click to sync all immediately.")}>
              <Button
                icon={<MaterialIcon name="refresh" size={16} />}
                loading={refreshingAll}
                onClick={() => void handleRefreshAll()}
              >
                {refreshingAll ? tt("正在同步...", "Syncing...") : `${tt("全量同步", "Sync All")} (${secondsRemaining}s)`}
              </Button>
            </Tooltip>
            <Select
              size="middle"
              value={autoRefreshInterval}
              onChange={(val) => {
                setAutoRefreshInterval(val);
                setSecondsRemaining(val);
              }}
              style={{ minWidth: 140 }}
              options={[
                { value: 30, label: tt("30秒刷新", "Every 30s") },
                { value: 60, label: tt("60秒刷新", "Every 60s") },
                { value: 180, label: tt("3分钟刷新", "Every 3m") },
                { value: 300, label: tt("5分钟刷新", "Every 5m") },
                { value: 0, label: tt("暂停轮询", "Paused") },
              ]}
            />
            <Button
              icon={<MaterialIcon name="pie_chart" size={16} />}
              onClick={() => setPoolDrawerVisible(true)}
            >
              {tt("配额共享池", "Quota Pools")} ({pools.length})
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* KPI Overview Metric Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.kpiCard}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("提供商连接总数", "Total Connections")}
                </Text>
                <Title level={3} style={{ margin: "4px 0 0" }}>
                  {kpi.total}
                </Title>
              </div>
              <Tag color="blue">{kpi.active} {tt("启用", "Active")}</Tag>
            </Flex>
            <Progress
              percent={kpi.total > 0 ? (kpi.active / kpi.total) * 100 : 100}
              size="small"
              strokeColor="#3b82f6"
              showInfo={false}
              style={{ marginTop: 8 }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.kpiCard}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("充裕状态 (> 50%)", "Healthy (> 50%)")}
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", color: "#22c55e" }}>
                  {kpi.ok}
                </Title>
              </div>
              <Tag color="success">{tt("稳定运行", "Stable")}</Tag>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: "block" }}>
              {tt("高配额冗余保障", "High quota redundancy")}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.kpiCard}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("低额度预警 (20%~50%)", "Warning (20%~50%)")}
                </Text>
                <Title level={3} style={{ margin: "4px 0 0", color: kpi.alert > 0 ? "#f59e0b" : undefined }}>
                  {kpi.alert}
                </Title>
              </div>
              <Tag color={kpi.alert > 0 ? "warning" : "default"}>
                {kpi.alert > 0 ? tt("需关注", "Attention") : tt("无预警", "Normal")}
              </Tag>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: "block" }}>
              {tt("建议监控消耗速率", "Monitor consumption rate")}
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.kpiCard}>
            <Flex justify="space-between" align="flex-start">
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("配额告急 / 耗尽 (≤ 20%)", "Critical / Exhausted (≤ 20%)")}
                </Text>
                <Title
                  level={3}
                  style={{ margin: "4px 0 0", color: kpi.critical > 0 ? "#ef4444" : undefined }}
                >
                  {kpi.critical}
                </Title>
              </div>
              <Tag color={kpi.critical > 0 ? "error" : "default"}>
                {kpi.critical > 0 ? tt("紧急", "Urgent") : tt("正常", "OK")}
              </Tag>
            </Flex>
            <Text type="secondary" style={{ fontSize: 11, marginTop: 8, display: "block" }}>
              {tt("需及时充值或切换备选", "Top up or switch backup")}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* Filter Toolbar */}
      <Card className={styles.filterCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Space wrap size={8}>
            <Input.Search
              allowClear
              placeholder="搜索连接名称、账号、ID 或 Base URL"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 280 }}
            />
            <Select
              value={providerFilter}
              onChange={setProviderFilter}
              style={{ minWidth: 160 }}
              options={providerOptions}
            />
            {purchaseOptions.length > 1 && (
              <Select
                value={purchaseFilter}
                onChange={(val) => setPurchaseFilter(val as PurchaseTypeKey)}
                style={{ minWidth: 140 }}
                options={purchaseOptions}
              />
            )}
            {statusOptions.length > 1 && (
              <Select
                value={statusFilter}
                onChange={(val) => setStatusFilter(val as StatusKey)}
                style={{ minWidth: 150 }}
                options={statusOptions}
              />
            )}
            {tierOptions.length > 1 && (
              <Select
                value={tierFilter}
                onChange={setTierFilter}
                style={{ minWidth: 130 }}
                options={tierOptions}
              />
            )}
          </Space>

          <Space size={12}>
            <Tooltip title="官方仅针对具备上游额度/Session查询接口的提供商开启配额监控，关闭可查看全部连接">
              <Switch
                checked={supportsQuotaOnly}
                onChange={setSupportsQuotaOnly}
                checkedChildren="仅配额厂商"
                unCheckedChildren="全部连接"
              />
            </Tooltip>
            <Button
              onClick={() => {
                if (activePanels.length === providerGroups.length) {
                  setActivePanels([]);
                } else {
                  setActivePanels(providerGroups.map((g) => g.provider));
                }
              }}
            >
              {activePanels.length === providerGroups.length ? "全部折叠" : "全部展开"}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* Main Hierarchical Content: Level-1 Provider Groups -> Level-2 Account Cards */}
      {providerGroups.length === 0 ? (
        <Card style={{ padding: 32, textAlign: "center", borderRadius: 12 }}>
          <Empty description="没有匹配的提供商连接配额数据" />
        </Card>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {providerGroups.map(({ provider, accounts }) => {
            const cat = catalogMap.get(provider);
            const color = cat?.color || "#3b82f6";
            const providerName = PROVIDER_LABEL[provider] || cat?.name || provider;

            // Compute provider-level aggregate health
            let providerOk = 0;
            let providerAlert = 0;
            let providerCritical = 0;
            for (const acc of accounts) {
              const st = getWorstStatus(quotaStateMap[acc.id]?.quotas);
              if (st === "ok") providerOk++;
              else if (st === "alert") providerAlert++;
              else if (st === "critical") providerCritical++;
            }

            const isExpanded = activePanels.includes(provider);

            return (
              <Card
                key={provider}
                className={styles.providerSectionCard}
                styles={{
                  header: {
                    padding: "14px 18px",
                    minHeight: 56,
                    borderBottom: isExpanded ? undefined : "none",
                  },
                  body: {
                    padding: isExpanded ? 16 : 0,
                    display: isExpanded ? "block" : "none",
                  },
                }}
                title={
                  <Flex
                    align="center"
                    justify="space-between"
                    style={{ width: "100%", cursor: "pointer", userSelect: "none" }}
                    onClick={() => {
                      setActivePanels((prev) =>
                        prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
                      );
                    }}
                  >
                    <Flex align="center" gap={12}>
                      <div
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 8,
                          background: `${color}18`,
                          color: color,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 600,
                          fontSize: 16,
                          flexShrink: 0,
                        }}
                      >
                        <MaterialIcon name="tune" size={20} />
                      </div>
                      <div>
                        <Flex align="center" gap={8} wrap>
                          <span style={{ fontWeight: 600, fontSize: 16, color: "inherit" }}>
                            {providerName}
                          </span>
                          <Tag color="purple" style={{ margin: 0, fontSize: 12 }}>
                            {accounts.length} 个账号
                          </Tag>
                          {providerCritical > 0 ? (
                            <Tag color="red" style={{ fontSize: 12 }}>{providerCritical} 告急</Tag>
                          ) : providerAlert > 0 ? (
                            <Tag color="warning" style={{ fontSize: 12 }}>{providerAlert} 预警</Tag>
                          ) : (
                            <Tag color="success" style={{ fontSize: 12 }}>全部正常</Tag>
                          )}
                        </Flex>
                      </div>
                    </Flex>

                    <Space size={10} onClick={(e) => e.stopPropagation()}>
                      <Button
                        icon={<MaterialIcon name="refresh" size={15} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          void handleRefreshProviderAccounts(provider);
                        }}
                      >
                        同步此分类
                      </Button>
                      <Button
                        type="text"
                        icon={<MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} size={20} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setActivePanels((prev) =>
                            prev.includes(provider) ? prev.filter((p) => p !== provider) : [...prev, provider]
                          );
                        }}
                      />
                    </Space>
                  </Flex>
                }
              >
                {isExpanded && (
                  <Row gutter={[12, 12]}>
                  {accounts.map((record) => {
                    const quotaInfo = quotaStateMap[record.id];
                    const plan = quotaInfo?.plan || (record.plan as string);
                    const purchaseType = getPurchaseType(record.authType, plan);
                    const rawQuotas = quotaInfo?.quotas || [];
                    const allQuotas = hasCanonicalWindowOrder(rawQuotas)
                      ? sortQuotasByWindow(rawQuotas)
                      : rawQuotas;
                    const visibleQuotas = filterQuotasByVisibility(record.provider, allQuotas, quotaVisibility);
                    const hiddenQuotas = getHiddenQuotaRows(record.provider, allQuotas, quotaVisibility);
                    const isAccountExpanded = Boolean(expandedAccounts[record.id]);
                    const DEFAULT_VISIBLE_COUNT = 3;
                    const displayedQuotas = isAccountExpanded
                      ? visibleQuotas
                      : visibleQuotas.slice(0, DEFAULT_VISIBLE_COUNT);
                    const hiddenModelCount = visibleQuotas.length - displayedQuotas.length;
                    const overrides = record.quotaWindowThresholds as Record<string, number> | undefined;

                    return (
                      <Col xs={24} sm={12} lg={8} key={record.id}>
                        <Card size="small" className={styles.accountCard}>
                          <div>
                            {/* Account Header */}
                            <Flex justify="space-between" align="flex-start">
                              <div>
                                <Flex align="center" gap={6}>
                                  <Text strong style={{ fontSize: 13 }}>
                                    {record.name || record.provider}
                                  </Text>
                                  {plan && (
                                    <Tag color="gold" style={{ margin: 0, fontSize: 10 }}>
                                      {plan}
                                    </Tag>
                                  )}
                                  <Tag
                                    color={
                                      purchaseType === "oauth-sub"
                                        ? "geekblue"
                                        : purchaseType === "apikey"
                                        ? "cyan"
                                        : "default"
                                    }
                                    style={{ margin: 0, fontSize: 10 }}
                                  >
                                    {purchaseType === "oauth-sub"
                                      ? "订阅"
                                      : purchaseType === "apikey"
                                      ? "API Key"
                                      : "免费"}
                                  </Tag>
                                </Flex>
                                <Text
                                  type="secondary"
                                  style={{
                                    fontFamily: "monospace",
                                    fontSize: 11,
                                    display: "block",
                                    marginTop: 2,
                                  }}
                                >
                                  {record.id.length > 14
                                    ? `${record.id.slice(0, 7)}...${record.id.slice(-5)}`
                                    : record.id}
                                </Text>
                              </div>

                              <Switch
                                size="small"
                                checked={record.isActive !== false}
                                onChange={(checked) => void handleToggleActive(record.id, checked)}
                              />
                            </Flex>

                            {/* Quota Windows List */}
                            <div style={{ marginTop: 12 }}>
                              {visibleQuotas.length === 0 && hiddenQuotas.length === 0 ? (
                                <div
                                  style={{
                                    padding: "16px 8px",
                                    textAlign: "center",
                                    background: "rgba(128,128,128,0.04)",
                                    borderRadius: 8,
                                    marginBottom: 8,
                                  }}
                                >
                                  <Text type="secondary" style={{ fontSize: 12 }}>
                                    {quotaInfo?.message || "暂无配额数据（点击刷新）"}
                                  </Text>
                                </div>
                              ) : (
                                <>
                                  <div
                                    style={{
                                      maxHeight: isAccountExpanded ? 320 : undefined,
                                      overflowY: isAccountExpanded ? "auto" : undefined,
                                      paddingRight: isAccountExpanded ? 4 : 0,
                                    }}
                                    className={styles.quotaScrollArea}
                                  >
                                    {displayedQuotas.map((q, qIdx) => {
                                      const pct = q.unlimited
                                        ? 100
                                        : (q.remainingPercentage ?? calculatePercentage(q.used, q.total));
                                      const toneColor =
                                        pct <= 20 ? "#ef4444" : pct <= 50 ? "#f59e0b" : "#22c55e";
                                      const label = formatQuotaLabel(q.name || q.displayName || "");
                                      const resetCountdown = formatResetTime(q.resetAt);
                                      const cutoffVal = overrides?.[q.name] ?? globalThresholdDefault;
                                      const quotaKey = getQuotaVisibilityKey(q);

                                      return (
                                        <div key={qIdx} className={styles.quotaWindowRow}>
                                          <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                                            <Flex align="center" gap={6}>
                                              <Text style={{ fontSize: 12, fontWeight: 500 }}>{label}</Text>
                                              {cutoffVal < 100 && (
                                                <Tag color="magenta" style={{ fontSize: 9, padding: "0 3px", margin: 0 }}>
                                                  切流 {cutoffVal}%
                                                </Tag>
                                              )}
                                            </Flex>
                                            <Space size={4}>
                                              {resetCountdown !== "-" && (
                                                <Tag
                                                  style={{ fontSize: 10, margin: 0, padding: "0 4px" }}
                                                  color="default"
                                                >
                                                  重置: {resetCountdown}
                                                </Tag>
                                              )}
                                              <Text style={{ fontSize: 12, fontWeight: 600, color: toneColor }}>
                                                {q.isCredits
                                                  ? `$${Number(q.remaining || 0).toFixed(2)}`
                                                  : `${pct.toFixed(0)}%`}
                                              </Text>
                                              <Tooltip title="隐藏此配额行">
                                                <Button
                                                  type="text"
                                                  size="small"
                                                  style={{ padding: 0, height: 18, width: 18, color: "rgba(128,128,128,0.45)" }}
                                                  icon={<MaterialIcon name="visibility_off" size={13} />}
                                                  onClick={() => void handleToggleQuotaVisibility(record.provider, quotaKey, true)}
                                                />
                                              </Tooltip>
                                            </Space>
                                          </Flex>

                                          <Progress
                                            percent={Math.min(100, Math.max(0, pct))}
                                            size="small"
                                            strokeColor={toneColor}
                                            showInfo={false}
                                          />
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {/* Expand / Collapse Button for Many Models */}
                                  {visibleQuotas.length > DEFAULT_VISIBLE_COUNT && (
                                    <Button
                                      size="small"
                                      type="dashed"
                                      block
                                      style={{ fontSize: 12, marginTop: 2, marginBottom: 8, height: 28 }}
                                      icon={<MaterialIcon name={isAccountExpanded ? "expand_less" : "expand_more"} size={16} />}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedAccounts((prev) => ({
                                          ...prev,
                                          [record.id]: !prev[record.id],
                                        }));
                                      }}
                                    >
                                      {isAccountExpanded
                                        ? "收起模型列表"
                                        : `展开其余 ${hiddenModelCount} 个模型配额`}
                                    </Button>
                                  )}

                                  {/* Hidden Quota Rows Restoring Tag Row */}
                                  {hiddenQuotas.length > 0 && (
                                    <div style={{ marginTop: 4, marginBottom: 8, padding: "2px 4px" }}>
                                      <Space wrap size={4}>
                                        <Text type="secondary" style={{ fontSize: 10 }}>
                                          已隐藏 {hiddenQuotas.length} 项:
                                        </Text>
                                        {hiddenQuotas.map((hq, hqIdx) => (
                                          <Tag
                                            key={hqIdx}
                                            style={{ cursor: "pointer", fontSize: 10, margin: 0 }}
                                            onClick={() => void handleToggleQuotaVisibility(record.provider, getQuotaVisibilityKey(hq), false)}
                                          >
                                            {formatQuotaLabel(hq.name || hq.displayName || "")}{" "}
                                            <MaterialIcon name="visibility" size={11} style={{ verticalAlign: "middle", marginLeft: 2 }} />
                                          </Tag>
                                        ))}
                                      </Space>
                                    </div>
                                  )}
                                </>
                              )}
                            </div>
                          </div>

                          {/* Account Footer */}
                          <Flex
                            justify="space-between"
                            align="center"
                            style={{
                              marginTop: 10,
                              paddingTop: 8,
                              borderTop: "1px solid rgba(128,128,128,0.12)",
                            }}
                          >
                            <Text type="secondary" style={{ fontSize: 11 }}>
                              {quotaInfo?.lastRefreshedAt
                                ? `${new Date(quotaInfo.lastRefreshedAt).toLocaleTimeString()} 更新`
                                : "未同步"}
                            </Text>

                            <Space size={2}>
                              <Tooltip title="查看此账号周期内 USD 消耗明细与额度估算">
                                <Button
                                  size="small"
                                  type="text"
                                  icon={<MaterialIcon name="attach_money" size={15} style={{ color: "#10B981" }} />}
                                  onClick={() => setCostModalConnection(record)}
                                >
                                  USD
                                </Button>
                              </Tooltip>
                              <Button
                                size="small"
                                type="text"
                                icon={<MaterialIcon name="sync" size={15} />}
                                loading={loadingMap[record.id]}
                                onClick={() => void fetchSingleQuota(record.id, record.provider, true)}
                              >
                                刷新
                              </Button>
                              <Button
                                size="small"
                                type="text"
                                icon={<MaterialIcon name="tune" size={15} />}
                                onClick={() => setCutoffTarget(record)}
                              >
                                阈值
                              </Button>
                              <Button
                                size="small"
                                type="link"
                                icon={<MaterialIcon name="open_in_new" size={15} />}
                                onClick={() => navigate(`/dashboard/providers/${record.id}`)}
                              >
                                详情
                              </Button>
                            </Space>
                          </Flex>
                        </Card>
                      </Col>
                    );
                  })}
                </Row>
              )}
            </Card>
          );
        })}
        </div>
      )}

      {/* Quota Cutoff Threshold Modal */}
      {cutoffTarget && (
        <QuotaCutoffModal
          open={Boolean(cutoffTarget)}
          onClose={() => setCutoffTarget(null)}
          connectionId={cutoffTarget.id}
          connectionName={cutoffTarget.name}
          provider={cutoffTarget.provider}
          windows={
            (quotaStateMap[cutoffTarget.id]?.quotas || []).map((q) => ({
              key: q.name,
              displayName: formatQuotaLabel(q.name || q.displayName || ""),
            }))
          }
          current={(cutoffTarget.quotaWindowThresholds as Record<string, number>) || null}
          providerDefaults={providerWindowDefaults[cutoffTarget.provider] || {}}
          globalDefaultPercent={globalThresholdDefault}
          onSave={handleSaveCutoff}
        />
      )}

      {/* Provider USD Cost Detail Modal */}
      {costModalConnection && (
        <ProviderUsdCostModal
          open={Boolean(costModalConnection)}
          onClose={() => setCostModalConnection(null)}
          connection={costModalConnection}
          providerLabel={PROVIDER_LABEL[costModalConnection.provider] || costModalConnection.provider}
          accountLabel={costModalConnection.name || costModalConnection.id}
        />
      )}

      {/* Quota Sharing Pool Drawer */}
      <Drawer
        open={poolDrawerVisible}
        onClose={() => setPoolDrawerVisible(false)}
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="pie_chart" size={20} style={{ color: "#06B6D4" }} />
            <span>配额共享池 (Quota Share Pool)</span>
          </Flex>
        }
        width={480}
        extra={
          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={15} />}
            onClick={() => {
              setPoolDrawerVisible(false);
              navigate("/dashboard/costs/quota-share");
            }}
          >
            新建共享池
          </Button>
        }
      >
        <Alert
          type="info"
          showIcon
          message="配额共享池说明"
          description="将同一上游提供商的多个账号/Key 划入共享池，自动实现多 Key 额度负载均衡、超额自动切流与全局预算约束。"
          style={{ marginBottom: 16 }}
        />

        {pools.length === 0 ? (
          <Empty description="暂无配额共享池，点击右上角新建" />
        ) : (
          pools.map((pool) => (
            <div key={pool.id} className={styles.poolDrawerCard}>
              <Flex justify="space-between" align="flex-start">
                <div>
                  <Text strong>{pool.name}</Text>
                  <Tag color="cyan" style={{ marginLeft: 8 }}>
                    {pool.groupId}
                  </Tag>
                  <div style={{ marginTop: 4 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {pool.connectionIds.length} 个上游账号 · {pool.allocations.length} 个 API Key
                    </Text>
                  </div>
                </div>
                <Space size={4}>
                  <Button
                    size="small"
                    type="text"
                    icon={<MaterialIcon name="edit" size={15} />}
                    onClick={() => navigate("/dashboard/costs/quota-share")}
                  />
                  <Popconfirm
                    title="确定删除此共享池？"
                    onConfirm={() => deletePoolMutation.mutate(pool.id)}
                  >
                    <Button
                      size="small"
                      type="text"
                      danger
                      icon={<MaterialIcon name="delete" size={15} />}
                    />
                  </Popconfirm>
                </Space>
              </Flex>
            </div>
          ))
        )}
      </Drawer>
    </div>
  );
}

export default QuotaPage;
