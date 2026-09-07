import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
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
  Tooltip,
  Typography,
} from "antd";
import type { TableProps } from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  keysApi,
  budgetApi,
  type ApiKeyView,
  type BudgetSummary,
  type ProviderCostBreakdown,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

// ────────────────────────────────────────────────────────────────────────────
// Types & Constants
// ────────────────────────────────────────────────────────────────────────────

export interface KeyBudgetRow {
  id: string;
  name?: string;
  provider?: string;
  budget: BudgetSummary | null;
}

export type StatusKey = "all" | "blocked" | "alerting" | "warning" | "safe" | "no-limit";

export interface BudgetTemplate {
  id: string;
  name: string;
  emoji: string;
  dailyLimitUsd?: number;
  weeklyLimitUsd?: number;
  monthlyLimitUsd?: number;
  warningThreshold: number; // e.g. 80
  resetInterval: "daily" | "weekly" | "monthly";
  resetTime: string;
}

const LS_TEMPLATES = "orbit:budget:templates";

const DEFAULT_TEMPLATES: BudgetTemplate[] = [
  {
    id: "tpl-prod",
    name: "生产环境",
    emoji: "💎",
    dailyLimitUsd: 50,
    monthlyLimitUsd: 1000,
    warningThreshold: 80,
    resetInterval: "monthly",
    resetTime: "00:00",
  },
  {
    id: "tpl-dev",
    name: "开发测试",
    emoji: "🛠",
    dailyLimitUsd: 10,
    monthlyLimitUsd: 200,
    warningThreshold: 75,
    resetInterval: "monthly",
    resetTime: "00:00",
  },
  {
    id: "tpl-ci",
    name: "CI 自动化",
    emoji: "📊",
    monthlyLimitUsd: 500,
    warningThreshold: 90,
    resetInterval: "monthly",
    resetTime: "00:00",
  },
];

const STATUS_CONFIG: Record<
  StatusKey,
  { labelZh: string; labelEn: string; color: string; tagColor: string; dot: string }
> = {
  all: {
    labelZh: "全部状态",
    labelEn: "All",
    color: "default",
    tagColor: "default",
    dot: "var(--ant-color-text-secondary)",
  },
  blocked: {
    labelZh: "已熔断阻断",
    labelEn: "Blocked",
    color: "error",
    tagColor: "error",
    dot: "#ef4444",
  },
  alerting: {
    labelZh: "临界告警",
    labelEn: "Alerting",
    color: "warning",
    tagColor: "warning",
    dot: "#f59e0b",
  },
  warning: {
    labelZh: "注意关注",
    labelEn: "Warning",
    color: "gold",
    tagColor: "gold",
    dot: "#eab308",
  },
  safe: {
    labelZh: "充裕安全",
    labelEn: "Safe",
    color: "success",
    tagColor: "success",
    dot: "#10b981",
  },
  "no-limit": {
    labelZh: "未设限额",
    labelEn: "No Limit",
    color: "default",
    tagColor: "default",
    dot: "var(--ant-color-text-tertiary)",
  },
};

// ────────────────────────────────────────────────────────────────────────────
// Calculation Helpers
// ────────────────────────────────────────────────────────────────────────────

function getRowStatus(row: KeyBudgetRow): StatusKey {
  const b = row.budget;
  if (!b) return "no-limit";
  const limit = b.activeLimitUsd || b.dailyLimitUsd || b.monthlyLimitUsd || 0;
  if (limit <= 0) return "no-limit";
  const used = b.totalCostPeriod ?? b.totalCostToday ?? 0;
  const pct = limit > 0 ? (used / limit) * 100 : 0;
  const warnPct = (b.warningThreshold ?? 0.8) * 100;
  if (pct >= 100) return "blocked";
  if (pct >= warnPct) return "alerting";
  if (pct >= 50) return "warning";
  return "safe";
}

function getPctUsed(row: KeyBudgetRow): number {
  const b = row.budget;
  if (!b) return 0;
  const limit = b.activeLimitUsd || b.dailyLimitUsd || b.monthlyLimitUsd || 0;
  if (limit <= 0) return 0;
  const used = b.totalCostPeriod ?? b.totalCostToday ?? 0;
  return (used / limit) * 100;
}

function projectEndOfMonth(monthlyCost: number, now = new Date()): number {
  const dayOfMonth = now.getDate();
  const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  if (dayOfMonth <= 0) return monthlyCost;
  const burnRate = monthlyCost / dayOfMonth;
  return burnRate * daysInMonth;
}

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
  expandedBox: {
    padding: "16px 20px",
    background: token.colorFillQuaternary,
    borderRadius: 8,
    margin: "8px 0",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  providerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    fontSize: 12,
    marginBottom: 6,
  },
}));

// ────────────────────────────────────────────────────────────────────────────
// Main Component
// ────────────────────────────────────────────────────────────────────────────

export function BudgetPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusKey>("all");
  const [sortKey, setSortKey] = useState<"usedDesc" | "todayDesc" | "monthDesc" | "name">("usedDesc");
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [expandedRowKeys, setExpandedRowKeys] = useState<string[]>([]);
  const [breakdownCache, setBreakdownCache] = useState<Record<string, ProviderCostBreakdown[]>>({});

  // Templates
  const [templates] = useState<BudgetTemplate[]>(() => {
    if (typeof window === "undefined") return DEFAULT_TEMPLATES;
    try {
      const saved = localStorage.getItem(LS_TEMPLATES);
      if (saved) return JSON.parse(saved);
    } catch {
      /* ignore */
    }
    return DEFAULT_TEMPLATES;
  });

  // Queries
  const keysQuery = useQuery({
    queryKey: ["budget-api-keys"],
    queryFn: async () => {
      const res = await keysApi.list();
      return Array.isArray(res) ? res : res.keys || [];
    },
  });

  const bulkBudgetQuery = useQuery({
    queryKey: ["budget-bulk-summary"],
    queryFn: () => budgetApi.getBulk(),
    refetchInterval: 60000,
  });

  // Combine Keys & Budgets
  const rows: KeyBudgetRow[] = useMemo(() => {
    const keys: ApiKeyView[] = keysQuery.data ?? [];
    const budgets = bulkBudgetQuery.data ?? {};
    return keys.map((k) => ({
      id: k.id,
      name: k.name || k.id,
      provider: typeof k.provider === "string" ? k.provider : undefined,
      budget: budgets[k.id] ?? null,
    }));
  }, [keysQuery.data, bulkBudgetQuery.data]);

  // Lazy load provider breakdown on row expand
  const fetchBreakdown = useCallback(async (keyId: string) => {
    if (breakdownCache[keyId]) return;
    const breakdown = await budgetApi.getProviderBreakdown(keyId);
    setBreakdownCache((prev) => ({ ...prev, [keyId]: breakdown }));
  }, [breakdownCache]);

  const handleExpand = useCallback(
    (expanded: boolean, record: KeyBudgetRow) => {
      if (expanded) {
        setExpandedRowKeys((prev) => [...prev, record.id]);
        void fetchBreakdown(record.id);
      } else {
        setExpandedRowKeys((prev) => prev.filter((id) => id !== record.id));
      }
    },
    [fetchBreakdown]
  );

  // Mutations
  const saveMutation = useMutation({
    mutationFn: (payload: {
      apiKeyId: string;
      dailyLimitUsd?: number;
      weeklyLimitUsd?: number;
      monthlyLimitUsd?: number;
      warningThreshold?: number;
      resetInterval?: "daily" | "weekly" | "monthly";
      resetTime?: string;
    }) => budgetApi.setBudget(payload),
    onSuccess: () => {
      message.success(tt("预算配置已保存并生效", "Budget settings saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["budget-bulk-summary"] });
    },
    onError: (err: any) => {
      message.error(err?.message || tt("保存失败，请稍后重试", "Failed to save budget settings"));
    },
  });

  const applyTemplateMutation = useMutation({
    mutationFn: async ({ template, keyIds }: { template: BudgetTemplate; keyIds: string[] }) => {
      await Promise.all(
        keyIds.map((id) =>
          budgetApi.setBudget({
            apiKeyId: id,
            dailyLimitUsd: template.dailyLimitUsd,
            weeklyLimitUsd: template.weeklyLimitUsd,
            monthlyLimitUsd: template.monthlyLimitUsd,
            warningThreshold: template.warningThreshold / 100,
            resetInterval: template.resetInterval,
            resetTime: template.resetTime,
          })
        )
      );
    },
    onSuccess: (_, variables) => {
      message.success(
        tt(
          `已将预设「${variables.template.name}」应用至 ${variables.keyIds.length} 个密钥`,
          `Applied template "${variables.template.name}" to ${variables.keyIds.length} key(s)`
        )
      );
      setSelectedRowKeys([]);
      void queryClient.invalidateQueries({ queryKey: ["budget-bulk-summary"] });
    },
    onError: () => {
      message.error(tt("批量应用预设失败", "Failed to apply template"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (apiKeyId: string) => budgetApi.deleteBudget(apiKeyId),
    onSuccess: () => {
      message.success(tt("预算限制已清除", "Budget limits removed"));
      void queryClient.invalidateQueries({ queryKey: ["budget-bulk-summary"] });
    },
    onError: () => {
      message.error(tt("清除预算失败", "Failed to clear budget"));
    },
  });

  // Filter & Sort
  const visibleRows = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    let result = rows.filter((r) => {
      const matchQuery =
        !q ||
        (r.name && r.name.toLowerCase().includes(q)) ||
        r.id.toLowerCase().includes(q) ||
        (r.provider && r.provider.toLowerCase().includes(q));
      const status = getRowStatus(r);
      const matchStatus = statusFilter === "all" || status === statusFilter;
      return matchQuery && matchStatus;
    });

    return result.sort((a, b) => {
      if (sortKey === "name") return (a.name || a.id).localeCompare(b.name || b.id);
      if (sortKey === "todayDesc")
        return (b.budget?.totalCostToday || 0) - (a.budget?.totalCostToday || 0);
      if (sortKey === "monthDesc")
        return (b.budget?.totalCostMonth || 0) - (a.budget?.totalCostMonth || 0);
      // usedDesc
      return getPctUsed(b) - getPctUsed(a);
    });
  }, [rows, searchQuery, statusFilter, sortKey]);

  // Aggregate Stats
  const stats = useMemo(() => {
    let today = 0;
    let month = 0;
    const counts = { blocked: 0, alerting: 0, warning: 0, safe: 0, noLimit: 0, active: 0 };
    for (const r of rows) {
      today += r.budget?.totalCostToday || 0;
      month += r.budget?.totalCostMonth || 0;
      const st = getRowStatus(r);
      if (st === "blocked") counts.blocked += 1;
      else if (st === "alerting") counts.alerting += 1;
      else if (st === "warning") counts.warning += 1;
      else if (st === "safe") counts.safe += 1;
      else counts.noLimit += 1;
      if ((r.budget?.totalCostMonth || 0) > 0) counts.active += 1;
    }
    return { today, month, projectionEom: projectEndOfMonth(month), counts };
  }, [rows]);

  // Check if any key projection is exceeding monthly limit
  const isProjectionOver = useMemo(() => {
    return rows.some((r) => {
      const m = r.budget?.monthlyLimitUsd || 0;
      if (m <= 0) return false;
      const keyProj = projectEndOfMonth(r.budget?.totalCostMonth || 0);
      return keyProj > m;
    });
  }, [rows]);

  const statusCounts = useMemo(() => {
    const map: Record<StatusKey, number> = {
      all: rows.length,
      blocked: 0,
      alerting: 0,
      warning: 0,
      safe: 0,
      "no-limit": 0,
    };
    for (const r of rows) {
      map[getRowStatus(r)] += 1;
    }
    return map;
  }, [rows]);

  if (keysQuery.isLoading && !keysQuery.data) {
    return <PageSkeleton />;
  }

  // Table Columns
  const columns: TableProps<KeyBudgetRow>["columns"] = [
    {
      title: tt("密钥名称与标识", "API Key & Provider"),
      key: "name",
      render: (_, record) => (
        <Flex vertical gap={2}>
          <Flex align="center" gap={6}>
            <MaterialIcon name="vpn_key" size={16} style={{ color: "var(--ant-color-text-secondary)" }} />
            <Text strong style={{ fontSize: 13 }}>
              {record.name || record.id}
            </Text>
          </Flex>
          <Text type="secondary" style={{ fontSize: 11, fontFamily: "monospace" }}>
            {record.provider ? `${record.provider} · ` : ""}
            {record.id}
          </Text>
        </Flex>
      ),
    },
    {
      title: tt("今日消耗", "Today Spend"),
      key: "today",
      align: "right",
      width: 120,
      render: (_, record) => (
        <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
          ${(record.budget?.totalCostToday || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: tt("本月消耗", "Month Spend"),
      key: "month",
      align: "right",
      width: 130,
      render: (_, record) => (
        <Text strong style={{ fontFamily: "monospace", fontSize: 13 }}>
          ${(record.budget?.totalCostMonth || 0).toFixed(2)}
        </Text>
      ),
    },
    {
      title: tt("日限额", "Daily Limit"),
      key: "dailyLimit",
      align: "right",
      width: 110,
      render: (_, record) => {
        const d = record.budget?.dailyLimitUsd || 0;
        return (
          <Text type={d > 0 ? undefined : "secondary"} style={{ fontFamily: "monospace", fontSize: 12 }}>
            {d > 0 ? `$${d}/d` : "—"}
          </Text>
        );
      },
    },
    {
      title: tt("月限额", "Monthly Limit"),
      key: "monthlyLimit",
      align: "right",
      width: 120,
      render: (_, record) => {
        const m = record.budget?.monthlyLimitUsd || 0;
        return (
          <Text type={m > 0 ? undefined : "secondary"} style={{ fontFamily: "monospace", fontSize: 12 }}>
            {m > 0 ? `$${m}/mo` : "—"}
          </Text>
        );
      },
    },
    {
      title: tt("消耗水位", "Budget Used"),
      key: "usedPct",
      width: 170,
      render: (_, record) => {
        const b = record.budget;
        const limit = b?.activeLimitUsd || b?.dailyLimitUsd || b?.monthlyLimitUsd || 0;
        if (limit <= 0) {
          return <Text type="secondary" style={{ fontSize: 12 }}>{tt("未配置限额", "No Limit")}</Text>;
        }
        const pct = Math.round(getPctUsed(record));
        const color = pct >= 100 ? "#ef4444" : pct >= 80 ? "#f59e0b" : pct >= 50 ? "#eab308" : "#10b981";
        return (
          <div style={{ width: "100%" }}>
            <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
              <span style={{ fontWeight: 600, color, fontFamily: "monospace" }}>{pct}%</span>
              <span style={{ color: "var(--ant-color-text-secondary)", fontSize: 10 }}>
                上限 ${limit.toFixed(0)}
              </span>
            </Flex>
            <Progress
              percent={Math.min(pct, 100)}
              showInfo={false}
              strokeColor={color}
              trailColor="rgba(0,0,0,0.06)"
            />
          </div>
        );
      },
    },
    {
      title: tt("预算状态", "Status"),
      key: "status",
      align: "center",
      width: 120,
      render: (_, record) => {
        const status = getRowStatus(record);
        const meta = STATUS_CONFIG[status];
        return (
          <Tag color={meta.tagColor} style={{ fontWeight: 600, margin: 0 }}>
            {tt(meta.labelZh, meta.labelEn)}
          </Tag>
        );
      },
    },
    {
      title: tt("操作", "Actions"),
      key: "actions",
      align: "right",
      width: 120,
      render: (_, record) => {
        const isExpanded = expandedRowKeys.includes(record.id);
        return (
          <Space>
            <Button
              type="link"
              style={{ padding: 0 }}
              onClick={() => handleExpand(!isExpanded, record)}
            >
              {isExpanded ? tt("收起配置", "Collapse") : tt("配置预算", "Configure")}
            </Button>
            {record.budget && (
              <Popconfirm
                title={tt("确定清除该密钥的全部预算限制？", "Clear all budget limits for this key?")}
                onConfirm={() => deleteMutation.mutate(record.id)}
                okText={tt("清除", "Clear")}
                cancelText={tt("取消", "Cancel")}
              >
                <Button type="link" danger style={{ padding: 0 }}>
                  {tt("清除", "Clear")}
                </Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
    },
  ];

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
                background: "rgba(234, 179, 8, 0.12)",
                color: "#eab308",
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
                  {tt("预算管理与成本硬顶", "Budget Management & Cost Safeguards")}
                </Title>
                <Tag color="gold">
                  {tt("多周期硬顶防护 · 自动拦截", "Multi-cycle Hard-caps & Auto-blocking")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "对各 API 密钥设置日、周、月度预算红线，超额自动触发预警熔断拦截，防止上游费用意外击穿。",
                  "Set daily, weekly, and monthly budget limits per API key with automatic threshold warnings and hard-cap blocks."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="default"
            icon={<MaterialIcon name="refresh" size={16} />}
            loading={bulkBudgetQuery.isFetching || keysQuery.isFetching}
            onClick={() => {
              void bulkBudgetQuery.refetch();
              void keysQuery.refetch();
            }}
          >
            {tt("刷新数据", "Refresh")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Spend Overview KPIs */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={8} lg={4}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("今日总支出 (Today)", "Today Total")}
            </Text>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
              ${stats.today.toFixed(2)}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("本月累计 (This Month)", "This Month")}
            </Text>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
              ${stats.month.toFixed(2)}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <div className={styles.kpiTile}>
            <Flex justify="space-between" align="center">
              <Text type="secondary" style={{ fontSize: 11 }}>
                {tt("月末推算 (Proj. EOM)", "Proj. EOM")}
              </Text>
              {isProjectionOver && (
                <Tag color="warning" style={{ fontSize: 10, margin: 0, padding: "0 4px" }}>
                  {tt("超限风险", "Over Budget")}
                </Tag>
              )}
            </Flex>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "monospace",
                color: isProjectionOver ? "#f59e0b" : "#10b981",
                marginTop: 2,
              }}
            >
              ${stats.projectionEom.toFixed(2)}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("已熔断阻断 (Blocked)", "Blocked Keys")}
            </Text>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "monospace",
                color: stats.counts.blocked > 0 ? "#ef4444" : undefined,
                marginTop: 2,
              }}
            >
              {stats.counts.blocked}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("临界预警 (Alerting)", "At-Risk Keys")}
            </Text>
            <div
              style={{
                fontSize: 20,
                fontWeight: 700,
                fontFamily: "monospace",
                color: stats.counts.alerting > 0 ? "#f59e0b" : undefined,
                marginTop: 2,
              }}
            >
              {stats.counts.alerting}
            </div>
          </div>
        </Col>

        <Col xs={24} sm={12} md={8} lg={4}>
          <div className={styles.kpiTile}>
            <Text type="secondary" style={{ fontSize: 11 }}>
              {tt("活跃消费密钥", "Active Keys")}
            </Text>
            <div style={{ fontSize: 20, fontWeight: 700, fontFamily: "monospace", marginTop: 2 }}>
              {stats.counts.active} / {rows.length}
            </div>
          </div>
        </Col>
      </Row>

      {/* 3. Toolbar: Search, Filters & Templates */}
      <Card className={styles.sectionCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex vertical gap={12}>
          <Flex justify="space-between" align="center" wrap gap={12}>
            <Space wrap>
              <Input
                placeholder={tt("搜索密钥名称、ID、提供商...", "Search key name, ID, provider...")}
                prefix={<MaterialIcon name="search" size={16} style={{ color: "var(--ant-color-text-tertiary)" }} />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                allowClear
                style={{ width: 260 }}
              />

              <Select
                value={sortKey}
                onChange={setSortKey}
                style={{ width: 170 }}
                options={[
                  { label: tt("消耗占比降序", "Sort: Used % Desc"), value: "usedDesc" },
                  { label: tt("今日花费降序", "Sort: Today $ Desc"), value: "todayDesc" },
                  { label: tt("本月花费降序", "Sort: Month $ Desc"), value: "monthDesc" },
                  { label: tt("密钥名称 A-Z", "Sort: Key Name A-Z"), value: "name" },
                ]}
              />
            </Space>

            {/* Batch Apply Templates */}
            <Flex align="center" gap={8} wrap>
              <Text type="secondary" style={{ fontSize: 12, fontWeight: 600 }}>
                {tt("预算模版快捷应用:", "Quick Templates:")}
              </Text>
              {templates.map((tpl) => {
                const isSelectedAny = selectedRowKeys.length > 0;
                return (
                  <Tooltip
                    key={tpl.id}
                    title={
                      isSelectedAny
                        ? tt(
                            `将「${tpl.name}」模版（${tpl.dailyLimitUsd ? `$${tpl.dailyLimitUsd}/日` : ""} ${tpl.monthlyLimitUsd ? `$${tpl.monthlyLimitUsd}/月` : ""} ${tpl.warningThreshold}% 告警）应用至选中的 ${selectedRowKeys.length} 个密钥`,
                            `Apply ${tpl.name} to ${selectedRowKeys.length} selected key(s)`
                          )
                        : tt("请先在下方勾选目标密钥", "Select keys first")
                    }
                  >
                    <Button
                      type="default"
                      disabled={!isSelectedAny}
                      loading={applyTemplateMutation.isPending}
                      onClick={() =>
                        applyTemplateMutation.mutate({
                          template: tpl,
                          keyIds: selectedRowKeys as string[],
                        })
                      }
                    >
                      <span>{tpl.emoji}</span>
                      <span>{tpl.name}</span>
                      <span style={{ color: "var(--ant-color-text-secondary)", fontSize: 11 }}>
                        {tpl.monthlyLimitUsd ? `$${tpl.monthlyLimitUsd}/mo` : `$${tpl.dailyLimitUsd}/d`}
                      </span>
                    </Button>
                  </Tooltip>
                );
              })}
            </Flex>
          </Flex>

          {/* Status Filter Chips */}
          <Flex align="center" gap={8} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("状态筛选:", "Status Filter:")}
            </Text>
            {(["all", "blocked", "alerting", "warning", "safe", "no-limit"] as StatusKey[]).map(
              (key) => {
                const count = statusCounts[key];
                const meta = STATUS_CONFIG[key];
                const active = statusFilter === key;
                if (key !== "all" && count === 0) return null;
                return (
                  <div
                    key={key}
                    onClick={() => setStatusFilter(key)}
                    className={`${styles.filterChip} ${active ? styles.filterChipActive : ""}`}
                  >
                    <Flex align="center" gap={6}>
                      {key !== "all" && (
                        <span
                          style={{
                            width: 6,
                            height: 6,
                            borderRadius: "50%",
                            background: meta.dot,
                            display: "inline-block",
                          }}
                        />
                      )}
                      <span>{tt(meta.labelZh, meta.labelEn)}</span>
                      <span style={{ opacity: 0.7, fontSize: 11 }}>({count})</span>
                    </Flex>
                  </div>
                );
              }
            )}
          </Flex>
        </Flex>
      </Card>

      {/* 4. Budget Table with Expandable Configuration */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <span>
              {tt(`API 密钥预算控制清单 (${visibleRows.length} 个密钥)`, `API Key Budget Inventory (${visibleRows.length})`)}
            </span>
            {selectedRowKeys.length > 0 && (
              <Tag color="blue">
                {tt(`已选中 ${selectedRowKeys.length} 个密钥`, `${selectedRowKeys.length} keys selected`)}
              </Tag>
            )}
          </Flex>
        }
        className={styles.sectionCard}
      >
        <Table<KeyBudgetRow>
          rowKey="id"
          pagination={false}
          dataSource={visibleRows}
          columns={columns}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
          }}
          expandable={{
            expandedRowKeys,
            onExpand: (exp, record) => handleExpand(exp, record),
            expandedRowRender: (record) => (
              <BudgetRowExpandedForm
                record={record}
                breakdown={breakdownCache[record.id]}
                onSave={(payload) => saveMutation.mutate({ apiKeyId: record.id, ...payload })}
                saving={saveMutation.isPending}
              />
            ),
          }}
        />
      </Card>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Expanded Row Form Component
// ────────────────────────────────────────────────────────────────────────────

function BudgetRowExpandedForm({
  record,
  breakdown,
  onSave,
  saving,
}: {
  record: KeyBudgetRow;
  breakdown?: ProviderCostBreakdown[];
  onSave: (payload: any) => void;
  saving: boolean;
}) {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const [form] = Form.useForm();
  const b = record.budget;
  const monthCost = b?.totalCostMonth || 0;
  const projection = projectEndOfMonth(monthCost);
  const monthlyLimit = b?.monthlyLimitUsd || 0;
  const isProjOver = monthlyLimit > 0 && projection > monthlyLimit;

  useEffect(() => {
    form.setFieldsValue({
      dailyLimitUsd: b?.dailyLimitUsd ?? undefined,
      weeklyLimitUsd: b?.weeklyLimitUsd ?? undefined,
      monthlyLimitUsd: b?.monthlyLimitUsd ?? undefined,
      warningThresholdPct: b?.warningThreshold ? Math.round(b.warningThreshold * 100) : 80,
      resetInterval: b?.resetInterval || "daily",
      resetTime: b?.resetTime || "00:00",
    });
  }, [b, form]);

  const handleFinish = (values: any) => {
    onSave({
      dailyLimitUsd: values.dailyLimitUsd ? Number(values.dailyLimitUsd) : undefined,
      weeklyLimitUsd: values.weeklyLimitUsd ? Number(values.weeklyLimitUsd) : undefined,
      monthlyLimitUsd: values.monthlyLimitUsd ? Number(values.monthlyLimitUsd) : undefined,
      warningThreshold: values.warningThresholdPct ? values.warningThresholdPct / 100 : 0.8,
      resetInterval: values.resetInterval,
      resetTime: values.resetTime,
    });
  };

  return (
    <div className={styles.expandedBox}>
      {/* Projection & Provider Breakdown Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* Spend Projection */}
        <Col xs={24} md={12}>
          <Card size="small" title={tt("支出预测与月末推算", "Spend Projection & Run-rate")}>
            <Flex vertical gap={6}>
              <Flex justify="space-between">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("本月已发生花费:", "Month-to-date Spend:")}
                </Text>
                <Text strong style={{ fontFamily: "monospace" }}>${monthCost.toFixed(2)}</Text>
              </Flex>
              <Flex justify="space-between">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("基于当前速率月末推算:", "Projected EOM Spend:")}
                </Text>
                <Text
                  strong
                  style={{
                    fontFamily: "monospace",
                    color: isProjOver ? "#f59e0b" : "#10b981",
                  }}
                >
                  ${projection.toFixed(2)}
                </Text>
              </Flex>
              {isProjOver && (
                <Tag color="warning" style={{ marginTop: 4 }}>
                  {tt(
                    `⚠️ 预估月末支出将超过月限额 $${monthlyLimit.toFixed(2)}，请及时关注`,
                    `⚠️ Run-rate exceeds monthly limit of $${monthlyLimit.toFixed(2)}`
                  )}
                </Tag>
              )}
            </Flex>
          </Card>
        </Col>

        {/* 30-Day Provider Breakdown */}
        <Col xs={24} md={12}>
          <Card size="small" title={tt("过去 30 天提供商消耗分布", "Top Provider Breakdown (30d)")}>
            {breakdown === undefined ? (
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("加载消耗分布中...", "Loading breakdown...")}</Text>
            ) : breakdown.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("过去 30 天暂无消耗记录", "No spend recorded in 30 days")}</Text>
            ) : (
              <Flex vertical gap={6}>
                {breakdown.slice(0, 4).map((p) => (
                  <div key={p.provider} className={styles.providerRow}>
                    <Text style={{ width: 90, fontSize: 12 }} ellipsis>
                      {p.provider}
                    </Text>
                    <div style={{ flex: 1 }}>
                      <Progress
                        percent={Math.round(p.pct)}
                        showInfo={false}
                        strokeColor="#6366f1"
                        trailColor="rgba(0,0,0,0.06)"
                      />
                    </div>
                    <Text strong style={{ width: 65, textAlign: "right", fontFamily: "monospace", fontSize: 12 }}>
                      ${p.cost.toFixed(2)}
                    </Text>
                    <Text type="secondary" style={{ width: 40, textAlign: "right", fontSize: 11 }}>
                      {Math.round(p.pct)}%
                    </Text>
                  </div>
                ))}
              </Flex>
            )}
          </Card>
        </Col>
      </Row>

      {/* Form Controls */}
      <Form form={form} layout="vertical" onFinish={handleFinish}>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="dailyLimitUsd"
              label={tt("日限额 (USD / 天)", "Daily Limit (USD / day)")}
              tooltip={tt("单日累计消耗达到此金额后将熔断拦截", "Hard-cap limit per day")}
            >
              <InputNumber
                placeholder={tt("未设置 (无限制)", "Unlimited")}
                min={0}
                step={0.5}
                prefix="$"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="weeklyLimitUsd"
              label={tt("周限额 (USD / 周)", "Weekly Limit (USD / week)")}
              tooltip={tt("单周累计消耗达到此金额后将熔断拦截", "Hard-cap limit per week")}
            >
              <InputNumber
                placeholder={tt("未设置 (无限制)", "Unlimited")}
                min={0}
                step={1}
                prefix="$"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="monthlyLimitUsd"
              label={tt("月限额 (USD / 月)", "Monthly Limit (USD / month)")}
              tooltip={tt("自然月累计消耗达到此金额后将熔断拦截", "Hard-cap limit per month")}
            >
              <InputNumber
                placeholder={tt("未设置 (无限制)", "Unlimited")}
                min={0}
                step={5}
                prefix="$"
                style={{ width: "100%" }}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="warningThresholdPct"
              label={tt("告警水位百分比 (%)", "Warning Threshold (%)")}
              tooltip={tt("消耗达到此比例时在监控与列表中提示告警", "Warning alert percentage")}
            >
              <InputNumber min={1} max={100} addonAfter="%" style={{ width: "100%" }} />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={[12, 12]} align="bottom">
          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="resetInterval"
              label={tt("配额自动重置周期", "Reset Interval")}
            >
              <Select
                options={[
                  { label: tt("每日重置 (Daily)", "Daily"), value: "daily" },
                  { label: tt("每周重置 (Weekly)", "Weekly"), value: "weekly" },
                  { label: tt("每月重置 (Monthly)", "Monthly"), value: "monthly" },
                ]}
              />
            </Form.Item>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <Form.Item
              name="resetTime"
              label={tt("重置时间点 (UTC)", "Reset Time (UTC)")}
            >
              <Input type="time" />
            </Form.Item>
          </Col>

          <Col xs={24} md={12}>
            <Form.Item>
              <Flex justify="space-between" align="center">
                <Button type="primary" htmlType="submit" loading={saving}>
                  {tt("保存限额规则", "Save Budget Limits")}
                </Button>
                <Text type="secondary" style={{ fontSize: 11 }}>
                  💡 {tt("硬顶熔断由后端统一拦截，超额请求将直接返回 429", "Hard caps enforced globally by backend")}
                </Text>
              </Flex>
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </div>
  );
}

export default BudgetPage;
