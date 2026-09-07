import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  InputNumber,
  message,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  pricingApi,
  type PricingCatalogModel,
  type PricingCatalogProvider,
  type PricingSource,
  type PricingSyncStatus,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

// ────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────────────────────

type CoverageFilter = "all" | "lt50" | "gte50lt100" | "full";
type AuthFilter = "all" | "oauth" | "apikey" | "unknown";
type SortKey = "modelsDesc" | "coverageDesc" | "coverageAsc" | "nameAsc";

const INITIAL_VISIBLE = 20;
const VISIBLE_INCREMENT = 30;

const PRICING_FIELDS = ["input", "output", "cached", "reasoning", "cache_creation"] as const;
type PricingField = (typeof PRICING_FIELDS)[number];

const FIELD_LABELS: Record<PricingField, { zh: string; en: string }> = {
  input: { zh: "Prompt 输入", en: "Input" },
  output: { zh: "Completion 补全", en: "Output" },
  cached: { zh: "缓存读取", en: "Cached Read" },
  reasoning: { zh: "推理思考", en: "Reasoning" },
  cache_creation: { zh: "缓存写入", en: "Cache Creation" },
};

const SOURCE_CONFIG: Record<
  PricingSource,
  { labelZh: string; labelEn: string; color: string; tagColor: string; emoji?: string }
> = {
  user: {
    labelZh: "用户自定义",
    labelEn: "User Override",
    color: "#f59e0b",
    tagColor: "gold",
    emoji: "💎",
  },
  modelsDev: {
    labelZh: "models.dev",
    labelEn: "models.dev",
    color: "#0284c7",
    tagColor: "blue",
  },
  litellm: {
    labelZh: "LiteLLM 全网库",
    labelEn: "LiteLLM",
    color: "#10b981",
    tagColor: "green",
  },
  default: {
    labelZh: "系统内置预设",
    labelEn: "Default",
    color: "var(--ant-color-text-secondary)",
    tagColor: "default",
  },
};

const PROVIDER_HUES = [
  "#6366f1",
  "#10b981",
  "#f59e0b",
  "#3b82f6",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#8b5cf6",
  "#06b6d4",
  "#84cc16",
];

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
  kpiTile: {
    padding: "12px 14px",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: "rgba(255,255,255,0.02)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
    textAlign: "center",
  },
  syncPanel: {
    padding: "14px 16px",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorFillQuaternary,
    display: "flex",
    flexDirection: "column",
    gap: 10,
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
  providerCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    marginBottom: 10,
    overflow: "hidden",
    transition: "border-color 0.2s ease",
  },
  providerCardEdited: {
    borderColor: "#eab308",
  },
  filterChip: {
    cursor: "pointer",
    borderRadius: 6,
    padding: "4px 10px",
    fontSize: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    transition: "all 0.2s ease",
    userSelect: "none",
  },
  filterChipActive: {
    borderColor: token.colorPrimary,
    background: token.colorPrimaryBg,
    color: token.colorPrimary,
    fontWeight: 600,
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

export function PricingPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();

  // Local State
  const [searchQuery, setSearchQuery] = useState("");
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>("all");
  const [authFilter, setAuthFilter] = useState<AuthFilter>("all");
  const [sortKey, setSortKey] = useState<SortKey>("modelsDesc");
  const [visibleCount, setVisibleCount] = useState(INITIAL_VISIBLE);
  const [expandedKeys, setExpandedKeys] = useState<string[]>([]);
  const [editedProviders, setEditedProviders] = useState<Set<string>>(new Set());

  // In-memory editable pricing cache
  const [localPricingData, setLocalPricingData] = useState<
    Record<string, Record<string, Record<string, number>>>
  >({});
  const [localPricingSources, setLocalPricingSources] = useState<
    Record<string, Record<string, PricingSource>>
  >({});

  // Queries
  const catalogQuery = useQuery({
    queryKey: ["pricing-models-catalog"],
    queryFn: () => pricingApi.getCatalog(),
  });

  const pricingWithSourcesQuery = useQuery({
    queryKey: ["pricing-data-sources"],
    queryFn: async () => {
      const res = await pricingApi.getPricingWithSources();
      return res;
    },
  });

  const syncStatusQuery = useQuery({
    queryKey: ["pricing-sync-status"],
    queryFn: () => pricingApi.getSyncStatus(),
  });

  // Sync loaded remote pricing into local state on first fetch or reload
  useEffect(() => {
    if (pricingWithSourcesQuery.data) {
      setLocalPricingData(pricingWithSourcesQuery.data.pricing || {});
      setLocalPricingSources(pricingWithSourcesQuery.data.sourceMap || {});
    }
  }, [pricingWithSourcesQuery.data]);

  const catalog: Record<string, PricingCatalogProvider> = catalogQuery.data ?? {};
  const syncStatus: PricingSyncStatus = syncStatusQuery.data ?? {
    enabled: false,
    lastSync: null,
    lastSyncModelCount: 0,
    nextSync: null,
    intervalMs: 86400000,
    sources: ["litellm"],
  };

  // Mutations
  const syncMutation = useMutation({
    mutationFn: () => pricingApi.sync(),
    onSuccess: (res) => {
      message.success(
        tt(
          `全网定价同步成功！已更新 ${res.modelCount || 0} 款模型定价规则。`,
          `Pricing synced successfully! Updated ${res.modelCount || 0} model pricing rules.`
        )
      );
      void queryClient.invalidateQueries({ queryKey: ["pricing-models-catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["pricing-data-sources"] });
      void queryClient.invalidateQueries({ queryKey: ["pricing-sync-status"] });
    },
    onError: (err: any) => {
      message.error(err?.message || tt("同步定价规则失败", "Failed to sync pricing rules"));
    },
  });

  const clearSyncedMutation = useMutation({
    mutationFn: () => pricingApi.clearSynced(),
    onSuccess: () => {
      message.info(tt("已清除所有全网同步的缓存定价数据", "Cleared all synced pricing cache"));
      void queryClient.invalidateQueries({ queryKey: ["pricing-models-catalog"] });
      void queryClient.invalidateQueries({ queryKey: ["pricing-data-sources"] });
      void queryClient.invalidateQueries({ queryKey: ["pricing-sync-status"] });
    },
    onError: () => {
      message.error(tt("清除同步数据失败", "Failed to clear synced pricing data"));
    },
  });

  const saveProviderMutation = useMutation({
    mutationFn: async ({
      providerAlias,
      pricingKey,
    }: {
      providerAlias: string;
      pricingKey?: string;
    }) => {
      const writeKey = pricingKey || providerAlias;
      const data = localPricingData[writeKey] || {};
      await pricingApi.saveProviderPricing(writeKey, data);
      return writeKey;
    },
    onSuccess: (writeKey) => {
      message.success(tt(`已保存提供商 ${writeKey.toUpperCase()} 的定价规则`, `Saved pricing for ${writeKey.toUpperCase()}`));
      setEditedProviders((prev) => {
        const next = new Set(prev);
        next.delete(writeKey);
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["pricing-data-sources"] });
    },
    onError: (err: any) => {
      message.error(err?.message || tt("保存定价规则失败", "Failed to save pricing rules"));
    },
  });

  const resetProviderMutation = useMutation({
    mutationFn: async ({
      providerAlias,
      pricingKey,
    }: {
      providerAlias: string;
      pricingKey?: string;
    }) => {
      const writeKey = pricingKey || providerAlias;
      await pricingApi.resetProviderPricing(writeKey);
      return writeKey;
    },
    onSuccess: (writeKey) => {
      message.success(tt(`已恢复提供商 ${writeKey.toUpperCase()} 为系统默认定价`, `Reset pricing for ${writeKey.toUpperCase()}`));
      setEditedProviders((prev) => {
        const next = new Set(prev);
        next.delete(writeKey);
        return next;
      });
      void queryClient.invalidateQueries({ queryKey: ["pricing-data-sources"] });
    },
    onError: (err: any) => {
      message.error(err?.message || tt("恢复默认定价失败", "Failed to reset pricing"));
    },
  });

  // Handle local pricing input edit
  const handlePriceChange = useCallback(
    (pricingKey: string, modelId: string, field: PricingField, value: number | null) => {
      const num = Number(value ?? 0);
      setLocalPricingData((prev) => {
        const next = { ...prev };
        if (!next[pricingKey]) next[pricingKey] = {};
        if (!next[pricingKey][modelId]) {
          next[pricingKey][modelId] = {
            input: 0,
            output: 0,
            cached: 0,
            reasoning: 0,
            cache_creation: 0,
          };
        }
        next[pricingKey][modelId] = {
          ...next[pricingKey][modelId],
          [field]: num >= 0 ? num : 0,
        };
        return next;
      });

      // Mark user override source locally
      setLocalPricingSources((prev) => {
        const next = { ...prev };
        if (!next[pricingKey]) next[pricingKey] = {};
        next[pricingKey][modelId] = "user";
        return next;
      });

      setEditedProviders((prev) => new Set(prev).add(pricingKey));
    },
    []
  );

  // Aggregate providers list
  const allProviders = useMemo(() => {
    return Object.entries(catalog).map(([alias, info], idx) => {
      const pricingKey = info.pricingKey || alias;
      const providerPricing = localPricingData[pricingKey] || {};
      const pricedModels = Object.keys(providerPricing).length;
      return {
        ...info,
        alias,
        pricingKey,
        pricedModels,
        color: PROVIDER_HUES[idx % PROVIDER_HUES.length],
      };
    });
  }, [catalog, localPricingData]);

  // Filters & Sorting
  const filteredProviders = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();

    const providerMatchesSearch = (p: (typeof allProviders)[number]) => {
      if (!q) return true;
      return (
        p.alias.toLowerCase().includes(q) ||
        p.id.toLowerCase().includes(q) ||
        (p.name && p.name.toLowerCase().includes(q)) ||
        p.models.some((m) => m.id.toLowerCase().includes(q) || m.name.toLowerCase().includes(q))
      );
    };

    const coveragePct = (p: (typeof allProviders)[number]) =>
      p.modelCount > 0 ? (p.pricedModels / p.modelCount) * 100 : 0;

    const matchesCoverage = (p: (typeof allProviders)[number]) => {
      if (coverageFilter === "all") return true;
      const pct = coveragePct(p);
      if (coverageFilter === "lt50") return pct < 50;
      if (coverageFilter === "gte50lt100") return pct >= 50 && pct < 100;
      return pct >= 100;
    };

    const matchesAuth = (p: (typeof allProviders)[number]) => {
      if (authFilter === "all") return true;
      const auth = (p.authType || "unknown").toLowerCase();
      return (
        auth === authFilter || (authFilter === "unknown" && !["oauth", "apikey"].includes(auth))
      );
    };

    const filtered = allProviders.filter(
      (p) => providerMatchesSearch(p) && matchesCoverage(p) && matchesAuth(p)
    );

    const sorted = [...filtered];
    switch (sortKey) {
      case "modelsDesc":
        sorted.sort((a, b) => b.modelCount - a.modelCount);
        break;
      case "coverageDesc":
        sorted.sort((a, b) => coveragePct(b) - coveragePct(a));
        break;
      case "coverageAsc":
        sorted.sort((a, b) => coveragePct(a) - coveragePct(b));
        break;
      case "nameAsc":
        sorted.sort((a, b) => a.alias.localeCompare(b.alias));
        break;
    }
    return sorted;
  }, [allProviders, searchQuery, coverageFilter, authFilter, sortKey]);

  // Auth counts & Gap count
  const authCounts = useMemo(() => {
    const counts = { oauth: 0, apikey: 0, unknown: 0 };
    for (const p of allProviders) {
      const auth = (p.authType || "unknown").toLowerCase();
      if (auth === "oauth") counts.oauth += 1;
      else if (auth === "apikey") counts.apikey += 1;
      else counts.unknown += 1;
    }
    return counts;
  }, [allProviders]);

  const coverageGapCount = useMemo(
    () => allProviders.filter((p) => p.modelCount > 0 && p.pricedModels / p.modelCount < 0.5).length,
    [allProviders]
  );

  // Overall Stats
  const stats = useMemo(() => {
    const totalModels = allProviders.reduce((sum, p) => sum + p.modelCount, 0);
    const pricedCount = Object.values(localPricingData).reduce(
      (sum, models) => sum + Object.keys(models).length,
      0
    );
    const overriddenCount = Object.values(localPricingSources).reduce(
      (sum, models) => sum + Object.values(models).filter((source) => source === "user").length,
      0
    );
    return {
      providers: allProviders.length,
      totalModels,
      pricedCount,
      overriddenCount,
    };
  }, [allProviders, localPricingData, localPricingSources]);

  const overallCoveragePct =
    stats.totalModels > 0 ? Math.round((stats.pricedCount / stats.totalModels) * 100) : 0;

  const displayProviders = filteredProviders.slice(0, visibleCount);

  if (catalogQuery.isLoading && !catalogQuery.data) {
    return <PageSkeleton />;
  }

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
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="payments" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("模型计费与价格规则库", "Model Pricing & Rate Standards")}
                </Title>
                <Tag color="green">
                  {tt(`已收录 ${stats.providers} 个提供商 · ${stats.totalModels} 款模型`, `${stats.providers} providers · ${stats.totalModels} models`)}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "实时同步 LiteLLM、models.dev 与官方标准价格，精准度量 Prompt、Completion、缓存与推理链 Token 计费，并支持单模型自定义覆写。",
                  "Sync standard rates from LiteLLM and models.dev to accurately measure prompt, completion, and cache token spending with custom per-model overrides."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="default"
            icon={<MaterialIcon name="refresh" size={16} />}
            loading={catalogQuery.isFetching || pricingWithSourcesQuery.isFetching}
            onClick={() => {
              void catalogQuery.refetch();
              void pricingWithSourcesQuery.refetch();
              void syncStatusQuery.refetch();
            }}
          >
            {tt("刷新数据", "Refresh")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Top Stats & Sync Panel Row */}
      <Row gutter={[12, 12]}>
        {/* Coverage Overview Stats */}
        <Col xs={24} lg={14}>
          <Card className={styles.sectionCard} styles={{ body: { padding: "14px 18px" } }}>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ fontSize: 13 }}>
                {tt("模型定价库覆盖度总览", "Pricing Coverage Overview")}
              </Text>
            </div>
            <Row gutter={[12, 12]} style={{ marginBottom: 14 }}>
              <Col span={6}>
                <div className={styles.kpiTile}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("提供商总数", "Providers")}
                  </Text>
                  <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "monospace" }}>
                    {stats.providers}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className={styles.kpiTile}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("模型注册数", "Total Models")}
                  </Text>
                  <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "monospace" }}>
                    {stats.totalModels}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className={styles.kpiTile}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("已配置定价", "Priced Models")}
                  </Text>
                  <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "monospace", color: "#10b981" }}>
                    {stats.pricedCount}
                  </div>
                </div>
              </Col>
              <Col span={6}>
                <div className={styles.kpiTile}>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("用户自定义", "User Overrides")}
                  </Text>
                  <div style={{ fontSize: 19, fontWeight: 700, fontFamily: "monospace", color: "#f59e0b" }}>
                    💎 {stats.overriddenCount}
                  </div>
                </div>
              </Col>
            </Row>

            <div>
              <Flex justify="space-between" align="center" style={{ fontSize: 11, marginBottom: 4 }}>
                <span style={{ color: "var(--ant-color-text-secondary)", fontWeight: 600 }}>
                  {tt("全局定价覆盖率 (Priced / Total)", "Global Pricing Coverage")}
                </span>
                <span style={{ fontWeight: 700, fontFamily: "monospace" }}>
                  {overallCoveragePct}% ({stats.pricedCount}/{stats.totalModels})
                </span>
              </Flex>
              <Progress
                percent={overallCoveragePct}
                showInfo={false}
                strokeColor={overallCoveragePct >= 90 ? "#10b981" : overallCoveragePct >= 60 ? "#f59e0b" : "#ef4444"}
                trailColor="rgba(0,0,0,0.06)"
              />
            </div>
          </Card>
        </Col>

        {/* Sync Controls Panel */}
        <Col xs={24} lg={10}>
          <div className={styles.syncPanel}>
            <Flex justify="space-between" align="center">
              <div>
                <Flex align="center" gap={6}>
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: "50%",
                      background: syncStatus.enabled ? "#10b981" : "var(--ant-color-text-secondary)",
                    }}
                  />
                  <Text strong style={{ fontSize: 13 }}>
                    {syncStatus.enabled
                      ? tt("全网定价自动同步 (已开启)", "Auto-Sync Enabled")
                      : tt("全网定价自动同步 (按需触发)", "Auto-Sync Standby")}
                  </Text>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  {tt("数据源: LiteLLM 官方价格标准库", "Source: LiteLLM Model Prices Index")}
                </Text>
              </div>

              <Space>
                <Popconfirm
                  title={tt("确定清除已同步的全网定价缓存？", "Clear synced pricing cache?")}
                  onConfirm={() => clearSyncedMutation.mutate()}
                  okText={tt("清除", "Clear")}
                  cancelText={tt("取消", "Cancel")}
                >
                  <Button type="default" loading={clearSyncedMutation.isPending}>
                    {tt("清除同步缓存", "Clear Synced")}
                  </Button>
                </Popconfirm>

                <Button
                  type="primary"
                  icon={<MaterialIcon name="sync" size={16} />}
                  loading={syncMutation.isPending}
                  onClick={() => syncMutation.mutate()}
                >
                  {tt("立即同步", "Sync Now")}
                </Button>
              </Space>
            </Flex>

            <Row gutter={[8, 8]}>
              <Col span={8}>
                <div className={styles.kpiTile} style={{ padding: "8px 10px" }}>
                  <Text type="secondary" style={{ fontSize: 10 }}>{tt("最近同步", "Last Sync")}</Text>
                  <Text strong style={{ fontSize: 11 }} ellipsis>
                    {syncStatus.lastSync ? new Date(syncStatus.lastSync).toLocaleTimeString() : tt("未同步", "Never")}
                  </Text>
                </div>
              </Col>
              <Col span={8}>
                <div className={styles.kpiTile} style={{ padding: "8px 10px" }}>
                  <Text type="secondary" style={{ fontSize: 10 }}>{tt("同步模型数", "Synced Models")}</Text>
                  <Text strong style={{ fontSize: 11, fontFamily: "monospace" }}>
                    {syncStatus.lastSyncModelCount || 0}
                  </Text>
                </div>
              </Col>
              <Col span={8}>
                <div className={styles.kpiTile} style={{ padding: "8px 10px" }}>
                  <Text type="secondary" style={{ fontSize: 10 }}>{tt("下次计划", "Next Sync")}</Text>
                  <Text strong style={{ fontSize: 11 }} ellipsis>
                    {syncStatus.nextSync ? new Date(syncStatus.nextSync).toLocaleTimeString() : tt("按需", "On-demand")}
                  </Text>
                </div>
              </Col>
            </Row>
          </div>
        </Col>
      </Row>

      {/* 3. Filter Toolbar */}
      <Card className={styles.sectionCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Space wrap>
            <Input
              placeholder={tt("搜索提供商、模型名称或 ID...", "Search provider, model name or ID...")}
              prefix={<MaterialIcon name="search" size={16} style={{ color: "var(--ant-color-text-tertiary)" }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              style={{ width: 260 }}
            />

            <Select
              value={coverageFilter}
              onChange={setCoverageFilter}
              style={{ width: 160 }}
              options={[
                { label: `${tt("全部覆盖度", "All Coverage")} (${allProviders.length})`, value: "all" },
                { label: tt("严重缺口 (<50%)", "Gaps (<50%)"), value: "lt50" },
                { label: tt("部分覆盖 (50–99%)", "Partial (50–99%)"), value: "gte50lt100" },
                { label: tt("完全覆盖 (100%)", "Full (100%)"), value: "full" },
              ]}
            />

            <Select
              value={authFilter}
              onChange={setAuthFilter}
              style={{ width: 160 }}
              options={[
                { label: `${tt("全部鉴权类型", "All Auth Types")}`, value: "all" },
                { label: `OAuth (${authCounts.oauth})`, value: "oauth" },
                { label: `API Key (${authCounts.apikey})`, value: "apikey" },
                { label: `${tt("其他/未知", "Unknown")} (${authCounts.unknown})`, value: "unknown" },
              ]}
            />

            <Select
              value={sortKey}
              onChange={setSortKey}
              style={{ width: 160 }}
              options={[
                { label: tt("按模型数量降序", "Sort: Models Count"), value: "modelsDesc" },
                { label: tt("按覆盖率最高", "Sort: High Coverage"), value: "coverageDesc" },
                { label: tt("按覆盖率最低", "Sort: Low Coverage"), value: "coverageAsc" },
                { label: tt("按提供商名称 A-Z", "Sort: Provider A-Z"), value: "nameAsc" },
              ]}
            />
          </Space>

          <Space wrap>
            <div
              onClick={() => setCoverageFilter(coverageFilter === "lt50" ? "all" : "lt50")}
              className={`${styles.filterChip} ${coverageFilter === "lt50" ? styles.filterChipActive : ""}`}
            >
              <Flex align="center" gap={6}>
                <MaterialIcon name="warning" size={14} style={{ color: "#f59e0b" }} />
                <span>{tt("定价缺口提供商", "Coverage Gaps")} ({coverageGapCount})</span>
              </Flex>
            </div>

            {(searchQuery || coverageFilter !== "all" || authFilter !== "all" || sortKey !== "modelsDesc") && (
              <Button
                type="link"
                style={{ padding: 0 }}
                onClick={() => {
                  setSearchQuery("");
                  setCoverageFilter("all");
                  setAuthFilter("all");
                  setSortKey("modelsDesc");
                }}
              >
                {tt("重置筛选条件", "Clear Filters")}
              </Button>
            )}
          </Space>
        </Flex>
      </Card>

      {/* 4. Providers List */}
      <div>
        {displayProviders.length === 0 ? (
          <Card className={styles.sectionCard}>
            <Empty description={tt("没有匹配的提供商与模型定价记录", "No matching providers or model pricing")} />
          </Card>
        ) : (
          displayProviders.map((provider) => {
            const pricingKey = provider.pricingKey || provider.alias;
            const providerPricing = localPricingData[pricingKey] || {};
            const providerSources = localPricingSources[pricingKey] || {};
            const isEdited = editedProviders.has(pricingKey);
            const isExpanded = expandedKeys.includes(provider.alias);

            const userOverrideCount = Object.values(providerSources).filter((s) => s === "user").length;
            const pct = provider.modelCount > 0 ? Math.round((provider.pricedModels / provider.modelCount) * 100) : 0;
            const barColor = pct >= 100 ? "#10b981" : pct >= 50 ? "#f59e0b" : "#ef4444";

            return (
              <div
                key={provider.alias}
                className={`${styles.providerCard} ${isEdited ? styles.providerCardEdited : ""}`}
              >
                {/* Header Row */}
                <div
                  style={{
                    padding: "12px 16px",
                    cursor: "pointer",
                    background: "rgba(255,255,255,0.01)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                  onClick={() =>
                    setExpandedKeys((prev) =>
                      prev.includes(provider.alias)
                        ? prev.filter((k) => k !== provider.alias)
                        : [...prev, provider.alias]
                    )
                  }
                >
                  <Flex align="center" gap={10} style={{ minWidth: 0 }}>
                    <MaterialIcon
                      name={isExpanded ? "expand_more" : "chevron_right"}
                      size={20}
                      style={{ color: "var(--ant-color-text-tertiary)" }}
                    />
                    <div className={styles.providerIconBadge} style={{ backgroundColor: provider.color }}>
                      {provider.id.charAt(0).toUpperCase()}
                    </div>
                    <Flex align="center" gap={6} wrap>
                      <Text strong style={{ fontSize: 14 }}>
                        {provider.name}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
                        ({provider.alias.toUpperCase()})
                      </Text>
                      <Tag color={provider.authType === "oauth" ? "cyan" : provider.authType === "apikey" ? "purple" : "default"}>
                        {provider.authType.toUpperCase()}
                      </Tag>
                      <Tag>{provider.format}</Tag>
                    </Flex>
                  </Flex>

                  <Flex align="center" gap={12}>
                    {userOverrideCount > 0 && (
                      <Tag color="gold" style={{ margin: 0 }}>
                        💎 {userOverrideCount} {tt("个自定义覆写", "overrides")}
                      </Tag>
                    )}
                    {isEdited && (
                      <Tag color="warning" style={{ margin: 0 }}>
                        {tt("未保存修改", "Unsaved")}
                      </Tag>
                    )}

                    <div style={{ width: 120, textAlign: "right" }}>
                      <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                        <span style={{ color: "var(--ant-color-text-secondary)" }}>
                          {provider.pricedModels}/{provider.modelCount}
                        </span>
                        <span style={{ fontWeight: 700, color: barColor, fontFamily: "monospace" }}>
                          {pct}% {pct >= 100 ? "✓" : pct >= 50 ? "◐" : "⚠"}
                        </span>
                      </Flex>
                      <Progress
                        percent={pct}
                        showInfo={false}
                        strokeColor={barColor}
                        trailColor="rgba(0,0,0,0.06)"
                      />
                    </div>
                  </Flex>
                </div>

                {/* Expanded Models Table & Save/Reset Actions */}
                {isExpanded && (
                  <div style={{ borderTop: "1px solid var(--ant-color-border-secondary)", padding: "14px 16px" }}>
                    <Flex justify="space-between" align="center" style={{ marginBottom: 12 }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {tt(
                          `共维护 ${provider.modelCount} 款模型 · ${provider.pricedModels} 款已生效定价（单位：美元 / 每 1M Tokens）`,
                          `Total ${provider.modelCount} models · ${provider.pricedModels} priced (USD per 1M Tokens)`
                        )}
                      </Text>
                      <Space>
                        <Popconfirm
                          title={tt(`确定恢复提供商 ${provider.alias.toUpperCase()} 的全部定价为系统默认？`, `Reset all pricing for ${provider.alias.toUpperCase()}?`)}
                          onConfirm={() =>
                            resetProviderMutation.mutate({
                              providerAlias: provider.alias,
                              pricingKey: provider.pricingKey,
                            })
                          }
                          okText={tt("恢复默认", "Reset")}
                          cancelText={tt("取消", "Cancel")}
                        >
                          <Button type="default" danger>
                            {tt("恢复默认定价", "Reset Defaults")}
                          </Button>
                        </Popconfirm>

                        <Button
                          type="primary"
                          disabled={!isEdited}
                          loading={saveProviderMutation.isPending}
                          onClick={() =>
                            saveProviderMutation.mutate({
                              providerAlias: provider.alias,
                              pricingKey: provider.pricingKey,
                            })
                          }
                        >
                          {tt("保存提供商定价", "Save Provider Pricing")}
                        </Button>
                      </Space>
                    </Flex>

                    <Table<PricingCatalogModel>
                      rowKey="id"
                      pagination={false}
                      dataSource={provider.models}
                      columns={[
                        {
                          title: tt("模型名称与标识", "Model Name & ID"),
                          key: "name",
                          render: (_, model) => {
                            const pData = providerPricing[model.id];
                            const hasPrice = Boolean(
                              pData && Object.values(pData).some((v) => Number(v) > 0)
                            );
                            const source: PricingSource = providerSources[model.id] || "default";
                            const sourceCfg = SOURCE_CONFIG[source];

                            return (
                              <Flex vertical gap={2}>
                                <Flex align="center" gap={6}>
                                  <span
                                    style={{
                                      width: 6,
                                      height: 6,
                                      borderRadius: "50%",
                                      background: hasPrice ? "#10b981" : "var(--ant-color-text-quaternary)",
                                    }}
                                  />
                                  <Text strong style={{ fontSize: 13 }}>
                                    {model.name}
                                  </Text>
                                  {model.custom && <Tag color="blue">{tt("自定义", "Custom")}</Tag>}
                                  <Tag color={sourceCfg.tagColor} style={{ fontSize: 10, margin: 0 }}>
                                    {sourceCfg.emoji ? `${sourceCfg.emoji} ` : ""}
                                    {tt(sourceCfg.labelZh, sourceCfg.labelEn)}
                                  </Tag>
                                </Flex>
                                <Text type="secondary" style={{ fontSize: 11, fontFamily: "monospace" }}>
                                  {model.id}
                                </Text>
                              </Flex>
                            );
                          },
                        },
                        ...PRICING_FIELDS.map((field) => ({
                          title: tt(`${FIELD_LABELS[field].zh} ($/1M)`, `${FIELD_LABELS[field].en} ($/1M)`),
                          key: field,
                          width: 140,
                          align: "right" as const,
                          render: (_: any, model: PricingCatalogModel) => {
                            const val = providerPricing[model.id]?.[field] ?? 0;
                            return (
                              <InputNumber
                                min={0}
                                step={0.01}
                                prefix="$"
                                value={val}
                                onChange={(newVal) =>
                                  handlePriceChange(pricingKey, model.id, field, newVal)
                                }
                                style={{ width: "100%", textAlign: "right" }}
                              />
                            );
                          },
                        })),
                      ]}
                    />
                  </div>
                )}
              </div>
            );
          })
        )}

        {visibleCount < filteredProviders.length && (
          <div style={{ textAlign: "center", marginTop: 12 }}>
            <Button
              type="default"
              icon={<MaterialIcon name="expand_more" size={16} />}
              onClick={() => setVisibleCount((c) => c + VISIBLE_INCREMENT)}
            >
              {tt(
                `加载更多提供商 (还有 ${filteredProviders.length - visibleCount} 个)`,
                `Show more (${filteredProviders.length - visibleCount} remaining)`
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

export default PricingPage;
