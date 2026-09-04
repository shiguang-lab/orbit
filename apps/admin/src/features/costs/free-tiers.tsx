import { useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  freeTiersApi,
  type FreeBudgetPerModel,
  type FreeBudgetSummaryData,
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
  kpiTile: {
    padding: "14px 16px",
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: "rgba(255,255,255,0.02)",
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  barContainer: {
    height: 14,
    borderRadius: 7,
    display: "flex",
    overflow: "hidden",
    background: "rgba(0,0,0,0.06)",
    marginTop: 8,
    marginBottom: 6,
  },
  providerIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 6,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 11,
    fontWeight: 700,
    color: "#fff",
    flexShrink: 0,
  },
}));

const BAR_HUES = [
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

function fmt(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(2).replace(/\.?0+$/, "") + "B";
  if (n >= 1e6) return Math.round(n / 1e6) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "K";
  return String(n);
}

function relativeTimeFromNow(iso?: string | null): string | null {
  if (!iso) return null;
  const ts = Date.parse(iso);
  if (Number.isNaN(ts)) return null;
  const diffMs = Date.now() - ts;
  if (diffMs < 60_000) return "刚刚";
  const min = Math.floor(diffMs / 60_000);
  if (min < 60) return `${min} 分钟前`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} 小时前`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `${day} 天前`;
  return `${Math.floor(day / 30)} 个月前`;
}

export function FreeTiersPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");
  const [keylessOnly, setKeylessOnly] = useState(false);
  const [hideAvoid, setHideAvoid] = useState(false);
  const [sortBy, setSortBy] = useState<"tokens" | "name" | "provider">("tokens");

  const summaryQuery = useQuery({
    queryKey: ["free-tier-summary", hideAvoid],
    queryFn: () => freeTiersApi.getSummary({ excludeTosAvoid: hideAvoid }),
  });

  const data: FreeBudgetSummaryData = summaryQuery.data ?? {
    steadyRecurringTokens: 0,
    steadyWithRecurringCreditsTokens: 0,
    firstMonthRealisticTokens: 0,
    usedThisMonth: 0,
    remaining: 0,
    modelCount: 0,
    poolCount: 0,
    perModel: [],
    boostMonthlyTokens: 0,
    uncappedProviders: [],
    noCredentialProviders: [],
  };

  const pct =
    data.steadyRecurringTokens > 0
      ? Math.round((data.remaining / data.steadyRecurringTokens) * 100)
      : 100;

  // Filter & sort
  const allProviders = useMemo(() => {
    const set = new Set<string>();
    for (const m of data.perModel) set.add(m.provider);
    return Array.from(set).sort();
  }, [data.perModel]);

  const displayedModels = useMemo(() => {
    let rows = data.perModel.filter((m) => m.monthlyTokens > 0 || m.creditTokens > 0);
    if (keylessOnly && data.noCredentialProviders?.length) {
      rows = rows.filter((m) => data.noCredentialProviders?.includes(m.provider));
    }
    if (providerFilter !== "all") {
      rows = rows.filter((m) => m.provider === providerFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      rows = rows.filter(
        (m) =>
          m.displayName.toLowerCase().includes(q) ||
          m.modelId.toLowerCase().includes(q) ||
          m.provider.toLowerCase().includes(q)
      );
    }
    const copy = [...rows];
    if (sortBy === "name") {
      copy.sort((a, b) => a.displayName.localeCompare(b.displayName));
    } else if (sortBy === "provider") {
      copy.sort(
        (a, b) => a.provider.localeCompare(b.provider) || b.monthlyTokens - a.monthlyTokens
      );
    } else {
      copy.sort((a, b) => b.monthlyTokens - a.monthlyTokens || b.creditTokens - a.creditTokens);
    }
    return copy;
  }, [data.perModel, keylessOnly, providerFilter, search, sortBy, data.noCredentialProviders]);

  if (summaryQuery.isLoading && !summaryQuery.data) {
    return <PageSkeleton />;
  }

  // Bar segments for stacked progress bar
  const providerColorMap = new Map<string, string>();
  allProviders.forEach((p, idx) => {
    providerColorMap.set(p, BAR_HUES[idx % BAR_HUES.length]);
  });

  const barSegments = useMemo(() => {
    const seenPools = new Map<string, { label: string; tokens: number; color: string }>();
    const looseSegments: Array<{ label: string; tokens: number; color: string }> = [];

    for (const m of data.perModel) {
      if (m.monthlyTokens <= 0) continue;
      const color = providerColorMap.get(m.provider) || "#6366f1";
      if (m.poolKey) {
        const existing = seenPools.get(m.poolKey);
        if (!existing || m.monthlyTokens > existing.tokens) {
          seenPools.set(m.poolKey, {
            label: `${m.displayName} (${m.provider})`,
            tokens: m.monthlyTokens,
            color,
          });
        }
      } else {
        looseSegments.push({
          label: `${m.displayName} (${m.provider})`,
          tokens: m.monthlyTokens,
          color,
        });
      }
    }
    return [...seenPools.values(), ...looseSegments];
  }, [data.perModel, providerColorMap]);

  const totalBarTokens = barSegments.reduce((s, seg) => s + seg.tokens, 0) || 1;
  const freshness = relativeTimeFromNow(data.catalogUpdatedAt);

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
              <MaterialIcon name="savings" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("免费 Token 额度预算池", "Free-Token Budget & Quota Pool")}
                </Title>
                <Tag color="green">
                  {tt(`~${fmt(data.remaining)} 剩余 · ${pct}% 可用`, `${fmt(data.remaining)} remaining · ${pct}%`)}
                </Tag>
                {freshness && (
                  <span style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    · {tt(`规则库更新于 ${freshness}`, `Updated ${freshness}`)}
                  </span>
                )}
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "统计已接入的所有免费公共模型配额与额度池，去重计算真实可用的月度 Token 预算总量。",
                  "Consolidated tracking of all free upstream provider quotas, pool-deduplicated without inflated limits."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="default"
            icon={<MaterialIcon name="refresh" size={16} />}
            loading={summaryQuery.isFetching}
            onClick={() => void summaryQuery.refetch()}
          >
            {tt("刷新额度", "Refresh")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Top KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={8}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("每月稳定免费额度 (Steady / Month)", "Steady / Month")}
            </Text>
            <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4, fontFamily: "monospace" }}>
              ~{fmt(data.steadyRecurringTokens)} Tokens
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("每日/每月自然刷新的稳定额度", "Recurring quota refreshed daily/monthly")}
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("首月可用总额度 (含礼赠)", "First Month (+ Credits)")}
            </Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981", marginTop: 4, fontFamily: "monospace" }}>
              ~{fmt(data.firstMonthRealisticTokens)} Tokens
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("含新注册赠送的一次性免费额度", "Including one-time registration welcome credits")}
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={8}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("本月已消耗额度 (Used This Month)", "Used This Month")}
            </Text>
            <div style={{ fontSize: 22, fontWeight: 700, color: "#38bdf8", marginTop: 4, fontFamily: "monospace" }}>
              {fmt(data.usedThisMonth)} Tokens
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("当前自然月网关真实请求累计", "Total actual consumption this billing cycle")}
            </Text>
          </div>
        </Col>
      </Row>

      {/* 3. Stacked Color Bar */}
      <Card className={styles.sectionCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center">
          <Text strong style={{ fontSize: 13 }}>
            {tt("免费额度池分布可视化", "Free Pool Distribution")}
          </Text>
          <Text type="secondary" style={{ fontSize: 11 }}>
            {tt("每个色块代表一个独立的免费提供商/模型池（已去重）", "Each segment represents one deduped free pool")}
          </Text>
        </Flex>

        <div className={styles.barContainer}>
          {barSegments.map((seg, i) => {
            const widthPct = Math.max(0.5, (seg.tokens / totalBarTokens) * 100);
            return (
              <Tooltip key={i} title={`${seg.label}: ~${fmt(seg.tokens)} Tokens/月`}>
                <div
                  style={{
                    width: `${widthPct}%`,
                    height: "100%",
                    backgroundColor: seg.color,
                    cursor: "pointer",
                  }}
                />
              </Tooltip>
            );
          })}
        </div>

        {/* Boost & Keyless Info Banners */}
        <Flex vertical gap={6} style={{ marginTop: 8 }}>
          {Boolean(data.boostMonthlyTokens && data.boostMonthlyTokens > 0) && (
            <Flex align="center" gap={6}>
              <MaterialIcon name="bolt" size={16} style={{ color: "#f59e0b" }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  `提示：通过一次性小额充值（如 OpenRouter $10）可额外解锁约 ${fmt(data.boostMonthlyTokens || 0)} Tokens/月的充沛额度（50 → 1000 次/天）。`,
                  `Boost: A one-time $10 deposit unlocks ~${fmt(data.boostMonthlyTokens || 0)} more Tokens/mo.`
                )}
              </Text>
            </Flex>
          )}

          {Boolean(data.noCredentialProviders && data.noCredentialProviders.length > 0) && (
            <Flex align="center" gap={6} wrap>
              <MaterialIcon name="lock_open" size={16} style={{ color: "#10b981" }} />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("免 API Key 即开即用提供商:", "No API Key required:")}
              </Text>
              {data.noCredentialProviders?.map((p) => (
                <Tag key={p} color="green" style={{ margin: 0 }}>
                  {p}
                </Tag>
              ))}
            </Flex>
          )}
        </Flex>
      </Card>

      {/* 4. Filter Toolbar */}
      <Card className={styles.sectionCard} styles={{ body: { padding: "10px 14px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Space wrap>
            <Input
              placeholder={tt("搜索模型、提供商...", "Search model, provider...")}
              prefix={<MaterialIcon name="search" size={16} style={{ color: "var(--ant-color-text-tertiary)" }} />}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              allowClear
              style={{ width: 220 }}
            />

            <Select
              value={providerFilter}
              onChange={setProviderFilter}
              style={{ width: 160 }}
              options={[
                { label: tt("全部提供商", "All Providers"), value: "all" },
                ...allProviders.map((p) => ({ label: p, value: p })),
              ]}
            />

            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ width: 160 }}
              options={[
                { label: tt("按月额度降序", "Sort: Max Tokens"), value: "tokens" },
                { label: tt("按模型名称", "Sort: Model Name"), value: "name" },
                { label: tt("按提供商", "Sort: Provider"), value: "provider" },
              ]}
            />
          </Space>

          <Space wrap>
            <Flex align="center" gap={6}>
              <Switch checked={keylessOnly} onChange={setKeylessOnly} />
              <Text style={{ fontSize: 12 }}>{tt("仅显示免 API Key", "Keyless only")}</Text>
            </Flex>
            <Flex align="center" gap={6}>
              <Switch checked={hideAvoid} onChange={setHideAvoid} />
              <Text style={{ fontSize: 12 }}>{tt("隐藏 ToS 限制模型", "Hide ToS Avoid")}</Text>
            </Flex>
          </Space>
        </Flex>
      </Card>

      {/* 5. Full Budget Models Table */}
      <Card
        title={tt(`免费模型额度清单 (${displayedModels.length} 个模型)`, `Free Models Inventory (${displayedModels.length})`)}
        className={styles.sectionCard}
        size="small"
      >
        <Table<FreeBudgetPerModel>
          rowKey={(r) => `${r.provider}-${r.modelId}`}
          size="small"
          pagination={false}
          dataSource={displayedModels}
          columns={[
            {
              title: tt("提供商", "Provider"),
              key: "provider",
              width: 160,
              render: (_, record) => {
                const color = providerColorMap.get(record.provider) || "#6366f1";
                return (
                  <Flex align="center" gap={8}>
                    <div className={styles.providerIconBadge} style={{ backgroundColor: color }}>
                      {record.provider.charAt(0).toUpperCase()}
                    </div>
                    <Text strong style={{ fontSize: 13 }}>{record.provider}</Text>
                  </Flex>
                );
              },
            },
            {
              title: tt("模型名称与 ID", "Model Display Name & ID"),
              key: "model",
              render: (_, record) => (
                <div>
                  <Text strong style={{ fontSize: 13 }}>{record.displayName}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", fontFamily: "monospace" }}>
                    {record.modelId}
                  </div>
                </div>
              ),
            },
            {
              title: tt("免费类型", "Free Type"),
              dataIndex: "freeType",
              key: "freeType",
              render: (type: string) => {
                const isKeyless = type === "keyless";
                return (
                  <Tag color={isKeyless ? "green" : "default"}>
                    {type}
                  </Tag>
                );
              },
            },
            {
              title: tt("月度免费额度", "Tokens / Month"),
              dataIndex: "monthlyTokens",
              key: "monthlyTokens",
              align: "right",
              render: (tokens: number) => (
                <Text strong style={{ color: "#10b981", fontFamily: "monospace", fontSize: 13 }}>
                  {tokens > 0 ? `~${fmt(tokens)}` : "—"}
                </Text>
              ),
            },
            {
              title: tt("注册礼赠", "Signup Credit"),
              dataIndex: "creditTokens",
              key: "creditTokens",
              align: "right",
              render: (tokens: number) => (
                <span style={{ color: "var(--ant-color-text-secondary)", fontFamily: "monospace", fontSize: 12 }}>
                  {tokens > 0 ? `+${fmt(tokens)}` : "—"}
                </span>
              ),
            },
            {
              title: tt("ToS 条款合规", "ToS Flags"),
              dataIndex: "tos",
              key: "tos",
              align: "right",
              render: (tos: string) => {
                if (tos === "avoid") {
                  return <Tag color="error">{tt("限制条款", "Avoid")}</Tag>;
                }
                if (tos === "caution") {
                  return <Tag color="warning">{tt("需注意", "Caution")}</Tag>;
                }
                return <Tag color="success">{tt("合规良好", "OK")}</Tag>;
              },
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default FreeTiersPage;
