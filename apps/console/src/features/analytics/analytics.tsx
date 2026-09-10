import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Input,
  Progress,
  Row,
  Segmented,
  Select,
  Space,
  Table,
  Tag,
  Tooltip as AntTooltip,
  Typography,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import { MaterialIcon } from "@/app/nav";
import { useBreadcrumbTitle } from "@/shell/useBreadcrumbTitle";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";
import {
  usageApi,
  keysApi,
  type UsageAnalyticsPayload,
  type DiversityReport,
} from "@/entities/api";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as ReTooltip,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from "recharts";

const { Text, Title, Paragraph } = Typography;

export type CostRange = "7d" | "30d" | "90d" | "180d" | "365d" | "all";
export type CostExplorerGroupBy = "provider" | "model" | "apiKey" | "account" | "serviceTier";
export type CostExplorerSortKey =
  | "name"
  | "cost"
  | "requests"
  | "totalTokens"
  | "avgCostPerRequest"
  | "sharePct";
export type CostExplorerSortDirection = "asc" | "desc";

const RANGE_OPTIONS: Array<{ value: CostRange; label: string }> = [
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "180d", label: "近 180 天" },
  { value: "365d", label: "近 1 年" },
  { value: "all", label: "全部时间" },
];

const EXPLORER_GROUP_OPTIONS: Array<{ value: CostExplorerGroupBy; label: string }> = [
  { value: "provider", label: "按提供商" },
  { value: "model", label: "按模型" },
  { value: "apiKey", label: "按 API 密钥" },
  { value: "account", label: "按账户" },
  { value: "serviceTier", label: "按服务层级" },
];

const PALETTE = [
  "#10B981",
  "#06B6D4",
  "#F59E0B",
  "#8B5CF6",
  "#EF4444",
  "#14B8A6",
  "#6366F1",
  "#EC4899",
  "#3B82F6",
  "#84CC16",
];

const useStyles = createStyles(({ token }) => ({
  metricCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "box-shadow 0.2s, border-color 0.2s",
    height: "100%",
    flex: 1,
  },
  cardSection: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    height: "100%",
    flex: 1,
  },
  // Makes a Col flex so its Card child stretches to full row height
  stretchCol: {
    display: "flex",
    flexDirection: "column" as const,
  },
  chartContainer: {
    width: "100%",
    borderRadius: 8,
    background: token.colorFillQuaternary,
    padding: 12,
  },
  tableRowRank: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 20,
    height: 20,
    borderRadius: 4,
    fontSize: 11,
    fontWeight: 600,
  },
}));

function formatUsd(amount: number, precision = 4): string {
  if (!Number.isFinite(amount) || amount === 0) return "$0.00";
  if (amount < 0.01) return `$${amount.toFixed(precision)}`;
  if (amount < 1) return `$${amount.toFixed(3)}`;
  return `$${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatTokens(count: number): string {
  if (!Number.isFinite(count) || count === 0) return "0";
  if (count >= 1_000_000_000) return `${(count / 1_000_000_000).toFixed(2)}B`;
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}k`;
  return count.toLocaleString();
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function exportCsvReport(data: UsageAnalyticsPayload, range: string) {
  const lines: string[] = [];
  lines.push("# 智枢 成本与消耗分析报告");
  lines.push(`# 导出时间: ${new Date().toISOString()}`);
  lines.push(`# 统计周期: ${range}`);
  if (data.includesFlatRateEstimates === true) {
    lines.push("# 金额包含包月订阅的按 token 折算估算值，非实际账单成本。");
  }
  lines.push("");

  lines.push("## 总体指标概览");
  lines.push("指标,数值");
  lines.push(
    `${data.includesFlatRateEstimates === true ? "总消耗支出（含包月估算） (USD)" : "总消耗支出 (USD)"},${data.summary.totalCost.toFixed(6)}`
  );
  lines.push(`总请求次数,${data.summary.totalRequests}`);
  lines.push(`总 Token 消耗,${data.summary.totalTokens}`);
  lines.push(`输入 Prompt Tokens,${data.summary.promptTokens}`);
  lines.push(`输出 Completion Tokens,${data.summary.completionTokens}`);
  lines.push(`独立模型数,${data.summary.uniqueModels}`);
  lines.push(`独立 API 密钥数,${data.summary.uniqueApiKeys}`);
  lines.push(`降级请求数,${data.summary.fallbackCount}`);
  lines.push("");

  lines.push("## 按模型消耗明细");
  lines.push("模型,请求数,总Tokens,消耗金额(USD)");
  for (const m of data.byModel || []) {
    lines.push(`"${m.model}",${m.requests},${m.totalTokens},${m.cost.toFixed(6)}`);
  }
  lines.push("");

  lines.push("## 按提供商消耗明细");
  lines.push("提供商,请求数,总Tokens,消耗金额(USD)");
  for (const p of data.byProvider || []) {
    lines.push(`"${p.provider}",${p.requests},${p.totalTokens},${p.cost.toFixed(6)}`);
  }
  lines.push("");

  lines.push("## 按 API 密钥消耗明细");
  lines.push("密钥名称,密钥标识,请求数,总Tokens,消耗金额(USD)");
  for (const k of data.byApiKey || []) {
    lines.push(`"${k.apiKeyName || k.apiKey}","${k.apiKeyId || ""}",${k.requests},${k.totalTokens},${k.cost.toFixed(6)}`);
  }

  const dateStr = dayjs().format("YYYYMMDD-HHmmss");
  downloadFile(lines.join("\n"), `orbit-costs-${range}-${dateStr}.csv`, "text/csv;charset=utf-8");
}

/* ───────────── Chart Components ───────────── */

const CHART_COLORS = [
  "#10B981", "#06B6D4", "#F59E0B", "#8B5CF6",
  "#EF4444", "#14B8A6", "#6366F1", "#EC4899",
];

function CostTrendChart({ rows }: { rows: Array<{ date: string; cost: number }> }) {
  const chartData = rows.map((r) => ({ date: r.date.slice(5), cost: r.cost || 0 }));
  return (
    <div style={{ height: 200 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 5, right: 12, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            interval={Math.max(Math.floor(chartData.length / 8), 0)}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `$${Number(v).toFixed(2)}`}
            width={52}
          />
          <ReTooltip
            formatter={(v) => [`$${Number(v ?? 0).toFixed(4)}`, "消耗"]}
            contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
            labelStyle={{ color: "#94A3B8", fontSize: 11 }}
          />
          <Line type="monotone" dataKey="cost" stroke="#10B981" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

function ProviderPieChart({
  rows,
}: {
  rows: Array<{ provider: string; cost: number; requests: number }>;
}) {
  const hasCost = rows.some((r) => r.cost > 0);
  const chartData = rows.slice(0, 6).map((r, i) => ({
    name: r.provider,
    value: hasCost ? r.cost : r.requests,
    fill: CHART_COLORS[i % CHART_COLORS.length],
  }));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
      <div style={{ width: 160, height: 160, flexShrink: 0 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={68} paddingAngle={2}>
              {chartData.map((entry) => (
                <Cell key={entry.name} fill={entry.fill} stroke="none" />
              ))}
            </Pie>
            <ReTooltip
              formatter={(v) => (hasCost ? [`$${Number(v ?? 0).toFixed(4)}`, "消耗"] : [Number(v ?? 0).toLocaleString(), "请求"])}
              contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
        {chartData.map((row) => (
          <div key={row.name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: row.fill, flexShrink: 0 }} />
              <span style={{ color: "#E2E8F0", maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.name}</span>
            </div>
            <span style={{ color: "#94A3B8", fontFamily: "monospace", fontSize: 11 }}>
              {hasCost ? `$${row.value.toFixed(3)}` : row.value.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

const DAY_NAME_CN: Record<string, string> = {
  Sun: "周日",
  Mon: "周一",
  Tue: "周二",
  Wed: "周三",
  Thu: "周四",
  Fri: "周五",
  Sat: "周六",
};

function WeeklyBarChart({ rows }: { rows: Array<{ day: string; avgTokens: number }> }) {
  const chartData = rows.map((r) => {
    const shortDay = r.day.slice(0, 3);
    return {
      day: shortDay,
      dayLabel: DAY_NAME_CN[shortDay] || shortDay,
      tokens: r.avgTokens || 0,
    };
  });

  return (
    <div style={{ height: 160 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
          <XAxis dataKey="dayLabel" tick={{ fontSize: 11, fill: "#94A3B8" }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fontSize: 10, fill: "#94A3B8" }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v))}
            width={38}
          />
          <ReTooltip
            cursor={{ fill: "rgba(139, 92, 246, 0.12)", radius: 4 }}
            formatter={(v) => [Number(v ?? 0).toLocaleString() + " tokens", "平均"]}
            contentStyle={{ background: "#1E293B", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 10 }}
            labelStyle={{ color: "#94A3B8", fontSize: 11 }}
          />
          <Bar dataKey="tokens" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

function ActivityHeatmapGrid({ activityMap }: { activityMap: Record<string, number> }) {
  const { weeks, monthLabels, stats } = useMemo(() => {
    const today = dayjs();
    const todayDate = today.toDate();
    const todayDayOfWeek = todayDate.getDay(); // 0 = Sun, 1 = Mon ... 6 = Sat
    const todayRowIndex = (todayDayOfWeek + 6) % 7; // Mon = 0 ... Sun = 6

    // 53 columns (weeks), ending on the current week's Sunday (up to today)
    const totalDays = 52 * 7 + (todayRowIndex + 1);
    const startDate = dayjs().subtract(totalDays - 1, "day");

    const allDays: Array<{
      dateStr: string;
      dayOfWeek: number;
      rowIndex: number;
      value: number;
      isFuture: boolean;
      formattedDate: string;
    }> = [];

    let totalTokens = 0;
    let activeDays = 0;
    let maxVal = 1;

    for (let i = 0; i < totalDays; i++) {
      const current = startDate.add(i, "day");
      const dateStr = current.format("YYYY-MM-DD");
      const isFuture = current.isAfter(today, "day");
      const val = !isFuture ? activityMap[dateStr] || 0 : 0;

      if (val > 0) {
        totalTokens += val;
        activeDays++;
        if (val > maxVal) maxVal = val;
      }

      const weekdaysCn = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
      const dOfWeek = current.toDate().getDay();
      const rIndex = (dOfWeek + 6) % 7; // Mon = 0 ... Sun = 6

      allDays.push({
        dateStr,
        dayOfWeek: dOfWeek,
        rowIndex: rIndex,
        value: val,
        isFuture,
        formattedDate: `${current.format("YYYY年M月D日")} (${weekdaysCn[dOfWeek]})`,
      });
    }

    // Group into weeks (columns of 7 items each: Mon to Sun)
    const weekCols: Array<Array<(typeof allDays)[0]>> = [];
    let currentWeek: Array<(typeof allDays)[0]> = [];

    for (const d of allDays) {
      currentWeek.push(d);
      if (d.rowIndex === 6) { // End of week on Sunday
        weekCols.push(currentWeek);
        currentWeek = [];
      }
    }
    if (currentWeek.length > 0) {
      weekCols.push(currentWeek);
    }

    // Calculate month labels position (ensuring no overlapping)
    const months: Array<{ label: string; x: number; textAnchor?: "start" | "end" }> = [];
    let lastMonth = -1;
    let lastX = -999;

    weekCols.forEach((week, idx) => {
      const firstValidDay = week.find((d) => !d.isFuture);
      if (firstValidDay) {
        const m = dayjs(firstValidDay.dateStr).toDate().getMonth();
        if (m !== lastMonth) {
          const currentX = 24 + idx * 14.5;
          // Ensure at least 34px distance between month labels to avoid overlap
          if (currentX - lastX >= 34 && idx <= 49) {
            months.push({
              label: `${m + 1}月`,
              x: currentX,
            });
            lastX = currentX;
          }
          lastMonth = m;
        }
      }
    });

    // Ensure the current (latest) month label is clearly shown at the right
    if (weekCols.length > 0) {
      const lastWeek = weekCols[weekCols.length - 1];
      const lastDay = lastWeek?.find((d) => !d.isFuture);
      if (lastDay) {
        const currentMonth = dayjs(lastDay.dateStr).toDate().getMonth();
        const finalX = 24 + (weekCols.length - 1) * 14.5;
        if (finalX - lastX >= 34) {
          months.push({
            label: `${currentMonth + 1}月`,
            x: finalX,
            textAnchor: "end",
          });
        }
      }
    }

    const dateRangeText = `${startDate.format("YYYY.MM")} - ${today.format("YYYY.MM")}`;

    return {
      weeks: weekCols,
      monthLabels: months,
      stats: { totalTokens, activeDays, maxVal, dateRangeText },
    };
  }, [activityMap]);

  const getColor = (v: number) => {
    if (v === 0) return "rgba(255,255,255,0.04)";
    const r = v / stats.maxVal;
    if (r < 0.2) return "rgba(16,185,129,0.25)";
    if (r < 0.45) return "rgba(16,185,129,0.48)";
    if (r < 0.75) return "rgba(16,185,129,0.72)";
    return "#10B981";
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%" }}>
      {/* SVG-based Full-Width Responsive Heatmap */}
      <div style={{ width: "100%", overflow: "hidden" }}>
        <svg
          viewBox="0 0 795 124"
          width="100%"
          style={{ display: "block", height: "auto", maxHeight: 155 }}
        >
          {/* Month Labels */}
          {monthLabels.map((m, idx) => (
            <text
              key={idx}
              x={m.x}
              y={12}
              fill="#94A3B8"
              fontSize={10}
              textAnchor={m.textAnchor || "start"}
              style={{ userSelect: "none" }}
            >
              {m.label}
            </text>
          ))}

          {/* Weekday Labels (一 到 日 全显) */}
          <text x={18} y={26.5} textAnchor="end" fill="#64748B" fontSize={8.5} style={{ userSelect: "none" }}>
            一
          </text>
          <text x={18} y={41.0} textAnchor="end" fill="#64748B" fontSize={8.5} style={{ userSelect: "none" }}>
            二
          </text>
          <text x={18} y={55.5} textAnchor="end" fill="#64748B" fontSize={8.5} style={{ userSelect: "none" }}>
            三
          </text>
          <text x={18} y={70.0} textAnchor="end" fill="#64748B" fontSize={8.5} style={{ userSelect: "none" }}>
            四
          </text>
          <text x={18} y={84.5} textAnchor="end" fill="#64748B" fontSize={8.5} style={{ userSelect: "none" }}>
            五
          </text>
          <text x={18} y={99.0} textAnchor="end" fill="#64748B" fontSize={8.5} style={{ userSelect: "none" }}>
            六
          </text>
          <text x={18} y={113.5} textAnchor="end" fill="#64748B" fontSize={8.5} style={{ userSelect: "none" }}>
            日
          </text>

          {/* Day Grid Cells */}
          {weeks.map((week, wIdx) =>
            week.map((day) => {
              if (day.isFuture) return null;
              return (
                <AntTooltip
                  key={day.dateStr}
                  title={
                    <div style={{ fontSize: 11, lineHeight: 1.4 }}>
                      <div style={{ color: "#E2E8F0", fontWeight: 600 }}>{day.formattedDate}</div>
                      <div
                        style={{
                          color: day.value > 0 ? "#10B981" : "#94A3B8",
                          marginTop: 2,
                          fontFamily: "monospace",
                        }}
                      >
                        {day.value > 0
                          ? `${day.value.toLocaleString()} Tokens 消耗`
                          : "当日无调用活动"}
                      </div>
                    </div>
                  }
                  mouseEnterDelay={0.02}
                  mouseLeaveDelay={0.02}
                  placement="top"
                >
                  <rect
                    x={24 + wIdx * 14.5}
                    y={18 + day.rowIndex * 14.5}
                    width={11}
                    height={11}
                    rx={2.5}
                    ry={2.5}
                    fill={getColor(day.value)}
                    stroke={day.value > 0 ? "rgba(16,185,129,0.4)" : "rgba(255,255,255,0.06)"}
                    strokeWidth={0.8}
                    style={{
                      cursor: "pointer",
                      transition: "all 0.12s ease",
                    }}
                  />
                </AntTooltip>
              );
            })
          )}
        </svg>
      </div>

      {/* Legend & Summary Info Footer */}
      <Flex align="center" justify="space-between" wrap gap={8} style={{ fontSize: 11, color: "#94A3B8" }}>
        <Text type="secondary" style={{ fontSize: 11 }}>
          活跃天数:{" "}
          <Text strong style={{ color: "#10B981" }}>
            {stats.activeDays}
          </Text>{" "}
          天 · 累计{" "}
          <Text strong style={{ color: "#E2E8F0", fontFamily: "monospace" }}>
            {formatTokens(stats.totalTokens)}
          </Text>{" "}
          Tokens
        </Text>

        <Flex align="center" gap={4} style={{ fontSize: 10 }}>
          <span>少</span>
          {["rgba(255,255,255,0.04)", "rgba(16,185,129,0.25)", "rgba(16,185,129,0.48)", "rgba(16,185,129,0.72)", "#10B981"].map((c, i) => (
            <div
              key={i}
              style={{
                width: 9,
                height: 9,
                borderRadius: 2,
                background: c,
                border: "1px solid rgba(255,255,255,0.05)",
              }}
            />
          ))}
          <span>多</span>
        </Flex>
      </Flex>
    </div>
  );
}

export default function AnalyticsPage() {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const { tt } = useI18n();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // URL Parameters
  const initialRange = (searchParams.get("range") as CostRange) || "30d";
  const apiKeyIdsParam = searchParams.get("apiKeyIds") || "";
  const initialGroupBy = (searchParams.get("groupBy") as CostExplorerGroupBy) || "provider";

  const [range, setRange] = useState<CostRange>(initialRange);
  const [selectedApiKeyIds, setSelectedApiKeyIds] = useState<string[]>(
    apiKeyIdsParam ? apiKeyIdsParam.split(",").filter(Boolean) : []
  );
  const [explorerGroupBy, setExplorerGroupBy] = useState<CostExplorerGroupBy>(initialGroupBy);
  const [explorerSearch, setExplorerSearch] = useState("");
  const [explorerSortKey, setExplorerSortKey] = useState<CostExplorerSortKey>("cost");
  const [explorerSortDirection, setExplorerSortDirection] = useState<CostExplorerSortDirection>("desc");

  // Fetch API Keys list for filtering
  const keysListQuery = useQuery({
    queryKey: ["keys-list-analytics"],
    queryFn: () => keysApi.list(),
    staleTime: 60_000,
  });

  const effectiveApiKeyIdsParam = selectedApiKeyIds.join(",");

  // Fetch Usage Analytics Data
  const analyticsQuery = useQuery({
    queryKey: ["costs-analytics", range, effectiveApiKeyIdsParam],
    queryFn: () =>
      usageApi.getAnalytics({
        range,
        presets: "1d,7d,30d",
        apiKeyIds: effectiveApiKeyIdsParam || undefined,
        // 本页将金额标注为估算值，因此对包月订阅 opt-in 按 token 折算口径。
        includeFlatRateEstimates: "true",
      }),
    staleTime: 15_000,
  });

  // Fetch Provider Diversity Report
  const diversityQuery = useQuery<DiversityReport>({
    queryKey: ["analytics-diversity"],
    queryFn: () => usageApi.getDiversity(),
    staleTime: 30_000,
  });

  const data = analyticsQuery.data;
  const summary = data?.summary || {
    totalCost: 0,
    totalRequests: 0,
    uniqueModels: 0,
    uniqueAccounts: 0,
    uniqueApiKeys: 0,
    totalTokens: 0,
    promptTokens: 0,
    completionTokens: 0,
    fallbackCount: 0,
    fallbackRatePct: 0,
    requestedModelCoveragePct: 0,
    streak: 0,
  };

  // 仅显式 true 表示估算口径；缺省/false/异常值保持账单口径，与 API 默认一致。
  const includesFlatRateEstimates = data?.includesFlatRateEstimates === true;

  const presetCosts = useMemo(() => {
    return {
      "1d": data?.presetSummaries?.["1d"]?.totalCost || 0,
      "7d": data?.presetSummaries?.["7d"]?.totalCost || 0,
      "30d": data?.presetSummaries?.["30d"]?.totalCost || 0,
    };
  }, [data]);

  // Fetch API Key Limits if filtered by a single Key
  const singleApiKeyId = selectedApiKeyIds.length === 1 ? selectedApiKeyIds[0] : null;
  const apiKeyLimitsQuery = useQuery({
    queryKey: ["api-key-usage-limits", singleApiKeyId],
    queryFn: () => usageApi.getApiKeyUsageLimits(singleApiKeyId!),
    enabled: Boolean(singleApiKeyId),
    staleTime: 30_000,
  });

  // Calculate trends & forecast
  const dailyTrend = data?.dailyTrend || [];
  const recentDays = dailyTrend.slice(-7);
  const avgDailyCost =
    recentDays.length > 0
      ? recentDays.reduce((sum, day) => sum + (day.cost || 0), 0) / recentDays.length
      : 0;
  const today = new Date();
  const daysRemainingInMonth =
    new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate() - today.getDate();
  const projectedMonthEnd =
    (presetCosts["30d"] || summary.totalCost) + avgDailyCost * daysRemainingInMonth;

  const trendLength = dailyTrend.length;
  const halfLength = Math.floor(trendLength / 2);
  const firstHalfCost = dailyTrend.slice(0, halfLength).reduce((sum, d) => sum + (d.cost || 0), 0);
  const secondHalfCost = dailyTrend.slice(halfLength).reduce((sum, d) => sum + (d.cost || 0), 0);
  const costChangePct =
    firstHalfCost > 0
      ? ((secondHalfCost - firstHalfCost) / firstHalfCost) * 100
      : secondHalfCost > 0
        ? 100
        : 0;

  // Build Cost Explorer Rows
  const explorerRows = useMemo(() => {
    if (!data) return [];
    let sourceList: Array<{
      id: string;
      name: string;
      detail: string;
      requests: number;
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      cost: number;
    }> = [];

    const totalCost = summary.totalCost || 0;
    const totalRequests = summary.totalRequests || 0;
    const shareBase = totalCost > 0 ? totalCost : totalRequests;

    if (explorerGroupBy === "provider") {
      sourceList = (data.byProvider || []).map((row, idx) => ({
        id: `p-${idx}`,
        name: row.provider,
        detail: "提供商",
        requests: row.requests,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: row.totalTokens,
        cost: row.cost,
      }));
    } else if (explorerGroupBy === "model") {
      sourceList = (data.byModel || []).map((row, idx) => ({
        id: `m-${idx}`,
        name: row.model,
        detail: "推理模型",
        requests: row.requests,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: row.totalTokens,
        cost: row.cost,
      }));
    } else if (explorerGroupBy === "apiKey") {
      sourceList = (data.byApiKey || []).map((row, idx) => ({
        id: `k-${idx}`,
        name: row.apiKeyName || row.apiKey,
        detail: row.apiKeyId ? `ID: ${row.apiKeyId}` : "API 密钥",
        requests: row.requests,
        promptTokens: row.promptTokens,
        completionTokens: row.completionTokens,
        totalTokens: row.totalTokens,
        cost: row.cost,
      }));
    } else if (explorerGroupBy === "account") {
      sourceList = (data.byAccount || []).map((row, idx) => ({
        id: `a-${idx}`,
        name: row.account,
        detail: "绑定账户",
        requests: row.requests,
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: row.totalTokens,
        cost: row.cost,
      }));
    } else if (explorerGroupBy === "serviceTier") {
      if (data.byServiceTier && data.byServiceTier.length > 0) {
        sourceList = data.byServiceTier.map((tier, idx) => ({
          id: `tier-${idx}`,
          name: tier.label || tier.serviceTier || "标准层级",
          detail: `服务层级标识: ${tier.serviceTier}`,
          requests: tier.requests,
          promptTokens: tier.promptTokens,
          completionTokens: tier.completionTokens,
          totalTokens: tier.totalTokens,
          cost: tier.cost,
        }));
      } else {
        sourceList = [
          {
            id: "tier-std",
            name: "标准推理 (Standard)",
            detail: "默认标准路由与推理服务",
            requests: summary.totalRequests,
            promptTokens: summary.promptTokens,
            completionTokens: summary.completionTokens,
            totalTokens: summary.totalTokens,
            cost: summary.totalCost,
          },
        ];
      }
    }

    const q = explorerSearch.trim().toLowerCase();
    const filtered = sourceList.filter(
      (item) => !q || item.name.toLowerCase().includes(q) || item.detail.toLowerCase().includes(q)
    );

    return filtered
      .map((item) => {
        const shareValue = totalCost > 0 ? item.cost : item.requests;
        const sharePct = shareBase > 0 ? (shareValue / shareBase) * 100 : 0;
        const avgCostPerRequest = item.requests > 0 ? item.cost / item.requests : 0;
        return {
          ...item,
          sharePct,
          avgCostPerRequest,
        };
      })
      .sort((a, b) => {
        const aVal = a[explorerSortKey];
        const bVal = b[explorerSortKey];
        if (typeof aVal === "string" && typeof bVal === "string") {
          return explorerSortDirection === "asc"
            ? aVal.localeCompare(bVal)
            : bVal.localeCompare(aVal);
        }
        const diff = Number(aVal || 0) - Number(bVal || 0);
        return explorerSortDirection === "asc" ? diff : -diff;
      });
  }, [data, explorerGroupBy, explorerSearch, explorerSortKey, explorerSortDirection, summary]);

  // Explorer Table Columns
  const explorerColumns = [
    {
      title: tt("维度名称", "Dimension"),
      dataIndex: "name",
      key: "name",
      sorter: true,
      render: (name: string, record: (typeof explorerRows)[number]) => (
        <Flex vertical gap={2}>
          <Text strong style={{ fontSize: 13 }}>
            {name}
          </Text>
          {record.detail && (
            <Text type="secondary" style={{ fontSize: 11 }}>
              {record.detail}
            </Text>
          )}
        </Flex>
      ),
    },
    {
      title: tt("消耗金额", "Cost"),
      dataIndex: "cost",
      key: "cost",
      sorter: true,
      align: "right" as const,
      render: (cost: number) => (
        <Text
          strong
          style={{
            fontFamily: "monospace",
            fontSize: 13,
            color: cost > 0 ? "#10B981" : token.colorTextSecondary,
          }}
        >
          {formatUsd(cost)}
        </Text>
      ),
    },
    {
      title: "请求次数",
      dataIndex: "requests",
      key: "requests",
      sorter: true,
      align: "right" as const,
      render: (reqs: number) => (
        <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
          {reqs.toLocaleString()} 次
        </Text>
      ),
    },
    {
      title: "Token 吞吐量",
      dataIndex: "totalTokens",
      key: "totalTokens",
      sorter: true,
      align: "right" as const,
      render: (tokens: number) => (
        <Text style={{ fontFamily: "monospace", fontSize: 12 }}>
          {formatTokens(tokens)}
        </Text>
      ),
    },
    {
      title: "单次均价",
      dataIndex: "avgCostPerRequest",
      key: "avgCostPerRequest",
      sorter: true,
      align: "right" as const,
      render: (avg: number) => (
        <Text type="secondary" style={{ fontFamily: "monospace", fontSize: 11 }}>
          {avg > 0 ? formatUsd(avg, 6) : "—"}
        </Text>
      ),
    },
    {
      title: "占比份额",
      dataIndex: "sharePct",
      key: "sharePct",
      sorter: true,
      width: 160,
      render: (sharePct: number) => (
        <Flex align="center" gap={8} justify="flex-end">
          <Progress
            percent={Math.min(Math.round(sharePct), 100)}
            size="small"
            strokeColor="#10B981"
            showInfo={false}
            style={{ width: 80, margin: 0 }}
          />
          <Text style={{ fontFamily: "monospace", fontSize: 11, width: 45, textAlign: "right" }}>
            {sharePct.toFixed(1)}%
          </Text>
        </Flex>
      ),
    },
  ];

  // Breadcrumb integration
  const setCustomTitle = useBreadcrumbTitle((s) => s.setCustomTitle);
  const matchedKey = useMemo(() => {
    if (!singleApiKeyId || !data?.byApiKey) return null;
    return data.byApiKey.find((k) => k.apiKeyId === singleApiKeyId || k.apiKey === singleApiKeyId);
  }, [singleApiKeyId, data?.byApiKey]);

  useEffect(() => {
    if (singleApiKeyId) {
      const truncatedId = singleApiKeyId.length > 18
        ? `${singleApiKeyId.slice(0, 8)}...${singleApiKeyId.slice(-6)}`
        : singleApiKeyId;
      const label = matchedKey?.apiKeyName
        ? `密钥: ${matchedKey.apiKeyName}`
        : `密钥: ${truncatedId}`;
      setCustomTitle(label);
    } else {
      setCustomTitle(null);
    }
    return () => setCustomTitle(null);
  }, [singleApiKeyId, matchedKey, setCustomTitle]);

  const apiKeySelectOptions = useMemo(() => {
    const rawKeys = keysListQuery.data?.keys || [];
    if (rawKeys.length > 0) {
      return rawKeys.map((k) => ({
        label: `${k.name || "未命名"} (${k.id.slice(0, 8)}...)`,
        value: k.id,
      }));
    }
    return (data?.byApiKey || []).map((k) => ({
      label: `${k.apiKeyName || k.apiKey} ${k.apiKeyId ? `(${k.apiKeyId.slice(0, 8)}...)` : ""}`,
      value: k.apiKeyId || k.apiKey,
    }));
  }, [keysListQuery.data?.keys, data?.byApiKey]);

  if (analyticsQuery.isLoading && !data) {
    return <PageSkeleton />;
  }

  const diversityScore = diversityQuery.data?.score ?? null;

  return (
    <Flex vertical gap={16}>
      {/* Header Banner */}
      <Card className={styles.cardSection}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <div>
            <Flex align="center" gap={8} wrap>
              <MaterialIcon name="analytics" size={24} style={{ color: "#06B6D4" }} />
              <Title level={2} style={{ margin: 0, fontSize: 20 }}>
                用量分析
              </Title>
              {summary.streak > 0 && (
                <Tag color="gold" icon={<MaterialIcon name="local_fire_department" size={14} />}>
                  已连续活跃 {summary.streak} 天
                </Tag>
              )}
              {diversityScore !== null && (
                <AntTooltip title="Shannon Entropy 供应商多样性评分，满分 100 分。分值越高代表模型与供应商调用越均衡，容灾容错能力越强。">
                  <Tag
                    color={diversityScore >= 70 ? "green" : diversityScore >= 40 ? "blue" : "orange"}
                    icon={<MaterialIcon name="hub" size={14} />}
                  >
                    供应商多样性: {diversityScore.toFixed(0)} 分
                  </Tag>
                </AntTooltip>
              )}
            </Flex>
            <Paragraph type="secondary" style={{ margin: "4px 0 0", fontSize: 13 }}>
              实时追踪全路由网关的 API 调用开销、Token 吞吐、模型级消费分布与多维探索。
            </Paragraph>
          </div>

          <Flex align="center" gap={10} wrap>
            <Select
              mode="multiple"
              allowClear
              placeholder="按 API 密钥筛选..."
              value={selectedApiKeyIds}
              onChange={(vals) => {
                setSelectedApiKeyIds(vals);
                if (vals.length > 0) {
                  searchParams.set("apiKeyIds", vals.join(","));
                } else {
                  searchParams.delete("apiKeyIds");
                }
                setSearchParams(searchParams);
              }}
              options={apiKeySelectOptions}
              maxTagCount={1}
              style={{ minWidth: 200, maxWidth: 280 }}
            />

            {data && summary.totalCost > 0 && (
              <Space size={8}>
                <Button
                  icon={<MaterialIcon name="download" size={16} />}
                  onClick={() => exportCsvReport(data, range)}
                >
                  导出 CSV
                </Button>
                <Button
                  icon={<MaterialIcon name="code" size={16} />}
                  onClick={() => {
                    const jsonStr = JSON.stringify(data, null, 2);
                    downloadFile(jsonStr, `orbit-costs-${range}-${dayjs().format("YYYYMMDD")}.json`, "application/json");
                  }}
                >
                  导出 JSON
                </Button>
              </Space>
            )}

            <Segmented
              value={range}
              onChange={(val) => {
                const nextRange = val as CostRange;
                setRange(nextRange);
                searchParams.set("range", nextRange);
                setSearchParams(searchParams);
              }}
              options={RANGE_OPTIONS}
            />
          </Flex>
        </Flex>
      </Card>

      {/* Single Key Quota Limit Banner (When accessed via specific apiKeyIds) */}
      {singleApiKeyId && apiKeyLimitsQuery.data && (
        <Card
          style={{
            borderRadius: 8,
            border: "1px solid #38BDF8",
            background: "rgba(56, 189, 248, 0.06)",
          }}
        >
          <Flex align="center" justify="space-between" wrap gap={12}>
            <div>
              <Flex align="center" gap={6}>
                <MaterialIcon name="tune" size={18} style={{ color: "#0284C7" }} />
                <Text strong style={{ fontSize: 14 }}>
                  API 密钥独立限额监控 · ID: {singleApiKeyId}
                </Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
                今日已消耗:{" "}
                <Text strong style={{ color: "#10B981" }}>
                  {formatUsd(apiKeyLimitsQuery.data.dailyCostUsd || 0)}
                </Text>
                {apiKeyLimitsQuery.data.dailyUsageLimitUsd
                  ? ` / 上限 ${formatUsd(apiKeyLimitsQuery.data.dailyUsageLimitUsd)}`
                  : " (无限制)"}
                {" · "}
                本周已消耗:{" "}
                <Text strong style={{ color: "#10B981" }}>
                  {formatUsd(apiKeyLimitsQuery.data.weeklyCostUsd || 0)}
                </Text>
                {apiKeyLimitsQuery.data.weeklyUsageLimitUsd
                  ? ` / 上限 ${formatUsd(apiKeyLimitsQuery.data.weeklyUsageLimitUsd)}`
                  : " (无限制)"}
              </Text>
            </div>

            <Button
              type="primary"
              onClick={() => navigate("/dashboard/api-manager")}
            >
              返回密钥管理
            </Button>
          </Flex>
        </Card>
      )}

      {/* Primary KPI Metrics */}
      <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
        <Col xs={12} sm={6} className={styles.stretchCol}>
          <Card className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>
              今日支出
            </Text>
            <Title level={3} style={{ margin: "6px 0 2px", color: "#10B981" }}>
              {formatUsd(presetCosts["1d"])}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              当天实时计费消耗
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} className={styles.stretchCol}>
          <Card className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>
              近 7 天支出
            </Text>
            <Title level={3} style={{ margin: "6px 0 2px", color: "#0EA5E9" }}>
              {formatUsd(presetCosts["7d"])}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              周维度累计支出
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} className={styles.stretchCol}>
          <Card className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>
              近 30 天支出
            </Text>
            <Title level={3} style={{ margin: "6px 0 2px", color: "#8B5CF6" }}>
              {formatUsd(presetCosts["30d"])}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              月度消耗总览
            </Text>
          </Card>
        </Col>

        <Col xs={12} sm={6} className={styles.stretchCol}>
          <Card className={styles.metricCard}>
            <Text type="secondary" style={{ fontSize: 12, textTransform: "uppercase" }}>
              选定窗口总支出
            </Text>
            <Title level={3} style={{ margin: "6px 0 2px", color: "#F59E0B" }}>
              {formatUsd(summary.totalCost)}
            </Title>
            <Text type="secondary" style={{ fontSize: 11 }}>
              当前选择: {RANGE_OPTIONS.find((r) => r.value === range)?.label}
            </Text>
          </Card>
        </Col>
      </Row>

      {includesFlatRateEstimates && (
        <Alert
          type="warning"
          showIcon
          message="金额包含包月订阅（如 Claude Code 等订阅制提供商）的按 token 折算估算值，并非实际账单成本。"
          style={{ marginBottom: 12 }}
        />
      )}

      {/* Secondary Metrics Bar */}
      <Card className={styles.cardSection}>
        <Row gutter={[16, 12]}>
          <Col xs={12} sm={6}>
            <Flex vertical gap={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                窗口内总请求数
              </Text>
              <Text strong style={{ fontSize: 18, fontFamily: "monospace" }}>
                {summary.totalRequests.toLocaleString()} 次
              </Text>
            </Flex>
          </Col>
          <Col xs={12} sm={6}>
            <Flex vertical gap={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                活跃提供商数
              </Text>
              <Text strong style={{ fontSize: 18, fontFamily: "monospace" }}>
                {(data?.byProvider || []).length} 个
              </Text>
            </Flex>
          </Col>
          <Col xs={12} sm={6}>
            <Flex vertical gap={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                活跃推理模型数
              </Text>
              <Text strong style={{ fontSize: 18, fontFamily: "monospace" }}>
                {summary.uniqueModels || (data?.byModel || []).length} 个
              </Text>
            </Flex>
          </Col>
          <Col xs={12} sm={6}>
            <Flex vertical gap={2}>
              <Text type="secondary" style={{ fontSize: 12 }}>
                单次请求平均成本
              </Text>
              <Text strong style={{ fontSize: 18, fontFamily: "monospace", color: "#10B981" }}>
                {summary.totalRequests > 0
                  ? formatUsd(summary.totalCost / summary.totalRequests, 6)
                  : "$0.00"}
              </Text>
            </Flex>
          </Col>
        </Row>
      </Card>

      {/* Daily Cost Trend + Provider Spend Pie — only when cost data exists */}
      {summary.totalCost > 0 && (
        <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
          <Col xs={24} lg={14} className={styles.stretchCol}>
            <Card className={styles.cardSection}>
              <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
                <MaterialIcon name="show_chart" size={18} style={{ color: "#10B981" }} />
                <Text strong style={{ fontSize: 14 }}>每日消耗趋势 (Daily Trend)</Text>
              </Flex>
              <CostTrendChart rows={data?.dailyTrend || []} />
            </Card>
          </Col>
          <Col xs={24} lg={10} className={styles.stretchCol}>
            <Card className={styles.cardSection}>
              <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
                <MaterialIcon name="donut_large" size={18} style={{ color: "#06B6D4" }} />
                <Text strong style={{ fontSize: 14 }}>提供商消费占比 (Provider Share)</Text>
              </Flex>
              <ProviderPieChart rows={data?.byProvider || []} />
            </Card>
          </Col>
        </Row>
      )}

      {/* Cost Explorer Card */}
      <Card className={styles.cardSection}>
        <Flex vertical gap={12}>
          <Flex align="center" justify="space-between" wrap gap={12}>
            <div>
              <Flex align="center" gap={6}>
                <MaterialIcon name="travel_explore" size={20} style={{ color: "#10B981" }} />
                <Title level={4} style={{ margin: 0, fontSize: 16 }}>
                  成本与多维探索器 (Cost Explorer)
                </Title>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                灵活按提供商、模型、API 密钥与服务层级交叉探索费用与请求明细。
              </Text>
            </div>

            <Flex align="center" gap={10} wrap>
              <Segmented
                value={explorerGroupBy}
                onChange={(val) => {
                  const nextGroup = val as CostExplorerGroupBy;
                  setExplorerGroupBy(nextGroup);
                  searchParams.set("groupBy", nextGroup);
                  setSearchParams(searchParams);
                }}
                options={EXPLORER_GROUP_OPTIONS}
              />
              <Input
                placeholder="搜索维度名称或 ID..."
                prefix={<MaterialIcon name="search" size={16} />}
                allowClear
                value={explorerSearch}
                onChange={(e) => setExplorerSearch(e.target.value)}
                style={{ width: 220 }}
              />
            </Flex>
          </Flex>

          <Table
            dataSource={explorerRows}
            columns={explorerColumns}
            rowKey="id"
            pagination={{ pageSize: 10, showTotal: (total) => `共 ${total} 条明细` }}
            loading={analyticsQuery.isLoading}
            size="middle"
            locale={{ emptyText: "当前维度暂无消耗数据" }}
            onChange={(_, __, sorter) => {
              if (!Array.isArray(sorter) && sorter.field) {
                setExplorerSortKey(sorter.field as CostExplorerSortKey);
                setExplorerSortDirection(sorter.order === "ascend" ? "asc" : "desc");
              }
            }}
          />
        </Flex>
      </Card>

      {/* Token Usage & Routing Efficiency */}
      <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
        <Col xs={24} md={12} className={styles.stretchCol}>
          <Card className={styles.cardSection}>
            <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
              <MaterialIcon name="data_usage" size={18} style={{ color: "#3B82F6" }} />
              <Text strong style={{ fontSize: 14 }}>
                Token 吞吐与输入输出比 (Token Usage)
              </Text>
            </Flex>
            <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
              <Col span={12}>
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>总 Token 消耗</Text>
                  <Text strong style={{ fontSize: 20, fontFamily: "monospace" }}>
                    {formatTokens(summary.totalTokens)}
                  </Text>
                </Flex>
              </Col>
              <Col span={12}>
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>输入 / 输出比</Text>
                  <Text strong style={{ fontSize: 20, fontFamily: "monospace", color: "#8B5CF6" }}>
                    {summary.completionTokens > 0
                      ? `${(summary.promptTokens / summary.completionTokens).toFixed(1)}:1`
                      : "—"}
                  </Text>
                </Flex>
              </Col>
              <Col span={12}>
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>输入 Prompt Tokens</Text>
                  <Text strong style={{ fontSize: 15, fontFamily: "monospace", color: "#0EA5E9" }}>
                    {formatTokens(summary.promptTokens)}
                  </Text>
                </Flex>
              </Col>
              <Col span={12}>
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>输出 Completion Tokens</Text>
                  <Text strong style={{ fontSize: 15, fontFamily: "monospace", color: "#10B981" }}>
                    {formatTokens(summary.completionTokens)}
                  </Text>
                </Flex>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col xs={24} md={12} className={styles.stretchCol}>
          <Card className={styles.cardSection}>
            <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
              <MaterialIcon name="speed" size={18} style={{ color: "#F59E0B" }} />
              <Text strong style={{ fontSize: 14 }}>
                路由与容灾效率 (Routing Efficiency)
              </Text>
            </Flex>
            <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
              <Col span={8}>
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>降级发生次数</Text>
                  <Text strong style={{ fontSize: 20, fontFamily: "monospace" }}>
                    {summary.fallbackCount.toLocaleString()}
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>次自动故障转移</Text>
                </Flex>
              </Col>
              <Col span={8}>
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>降级请求率</Text>
                  <Text
                    strong
                    style={{
                      fontSize: 20,
                      fontFamily: "monospace",
                      color: summary.fallbackRatePct > 5 ? "#EF4444" : "#10B981",
                    }}
                  >
                    {(summary.fallbackRatePct || 0).toFixed(1)}%
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {summary.fallbackRatePct <= 5 ? "健康稳定" : "存在重试波动"}
                  </Text>
                </Flex>
              </Col>
              <Col span={8}>
                <Flex vertical gap={2}>
                  <Text type="secondary" style={{ fontSize: 12 }}>模型覆盖度</Text>
                  <Text strong style={{ fontSize: 20, fontFamily: "monospace", color: "#3B82F6" }}>
                    {(summary.requestedModelCoveragePct || 100).toFixed(1)}%
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>请求按预期命中</Text>
                </Flex>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Forecast & Period Comparison */}
      {summary.totalCost > 0 && (
        <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
          <Col xs={24} md={12} className={styles.stretchCol}>
            <Card className={styles.cardSection}>
              <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                <MaterialIcon name="trending_up" size={18} style={{ color: "#0EA5E9" }} />
                <Text strong style={{ fontSize: 14 }}>
                  月末支出智能预测 (Monthly Forecast)
                </Text>
              </Flex>
              <Flex align="baseline" gap={10}>
                <Title level={2} style={{ margin: 0, color: "#0EA5E9", fontFamily: "monospace" }}>
                  {formatUsd(projectedMonthEnd, 2)}
                </Title>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  基于近 {recentDays.length} 天日均消耗推算
                </Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                日均支出: {formatUsd(avgDailyCost)} · 本月剩余: {daysRemainingInMonth} 天
              </Text>
              {includesFlatRateEstimates && (
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
                  预测金额已包含包月订阅估算值。
                </Text>
              )}
            </Card>
          </Col>

          <Col xs={24} md={12} className={styles.stretchCol}>
            <Card className={styles.cardSection}>
              <Flex align="center" gap={6} style={{ marginBottom: 8 }}>
                <MaterialIcon name="compare_arrows" size={18} style={{ color: "#8B5CF6" }} />
                <Text strong style={{ fontSize: 14 }}>
                  同期环比分析 (Period Comparison)
                </Text>
              </Flex>
              <Flex align="baseline" gap={10}>
                <Title
                  level={2}
                  style={{
                    margin: 0,
                    fontFamily: "monospace",
                    color: costChangePct > 0 ? "#EF4444" : "#10B981",
                  }}
                >
                  {costChangePct > 0 ? `+${costChangePct.toFixed(1)}%` : `${costChangePct.toFixed(1)}%`}
                </Title>
                <Tag color={costChangePct > 0 ? "error" : "success"}>
                  {costChangePct > 0 ? "支出上升" : "支出下降或平稳"}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 6 }}>
                前周期支出: {formatUsd(firstHalfCost)} · 当前周期: {formatUsd(secondHalfCost)}
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* Top Providers & Top Models Rankings */}
      <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
        <Col xs={24} md={12} className={styles.stretchCol}>
          <Card className={styles.cardSection}>
            <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="corporate_fare" size={18} style={{ color: "#10B981" }} />
                <Text strong style={{ fontSize: 14 }}>
                  Top 提供商消耗排行
                </Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                前 6 位提供商
              </Text>
            </Flex>
            <Flex vertical gap={8}>
              {(data?.byProvider || []).slice(0, 6).map((item, idx) => {
                const maxCost = (data?.byProvider || [])[0]?.cost || 1;
                const pct = maxCost > 0 ? Math.min((item.cost / maxCost) * 100, 100) : 0;
                return (
                  <Flex key={item.provider} align="center" justify="space-between" gap={8}>
                    <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className={styles.tableRowRank}
                        style={{
                          background: idx === 0 ? "#F59E0B" : idx === 1 ? "#94A3B8" : idx === 2 ? "#B45309" : token.colorFillSecondary,
                          color: idx < 3 ? "#FFF" : token.colorTextSecondary,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <Text strong style={{ fontSize: 13, minWidth: 100 }} ellipsis>
                        {item.provider}
                      </Text>
                      <Progress
                        percent={pct}
                        strokeColor={PALETTE[idx % PALETTE.length]}
                        showInfo={false}
                        style={{ flex: 1, margin: 0 }}
                      />
                    </Flex>
                    <Text strong style={{ fontFamily: "monospace", fontSize: 13, color: "#10B981" }}>
                      {formatUsd(item.cost)}
                    </Text>
                  </Flex>
                );
              })}
              {!(data?.byProvider || []).length && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无提供商消耗数据" />
              )}
            </Flex>
          </Card>
        </Col>

        <Col xs={24} md={12} className={styles.stretchCol}>
          <Card className={styles.cardSection}>
            <Flex align="center" justify="space-between" style={{ marginBottom: 12 }}>
              <Flex align="center" gap={6}>
                <MaterialIcon name="neurology" size={18} style={{ color: "#8B5CF6" }} />
                <Text strong style={{ fontSize: 14 }}>
                  Top 模型消耗排行
                </Text>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                前 6 位模型
              </Text>
            </Flex>
            <Flex vertical gap={8}>
              {(data?.byModel || []).slice(0, 6).map((item, idx) => {
                const maxCost = (data?.byModel || [])[0]?.cost || 1;
                const pct = maxCost > 0 ? Math.min((item.cost / maxCost) * 100, 100) : 0;
                return (
                  <Flex key={item.model} align="center" justify="space-between" gap={8}>
                    <Flex align="center" gap={8} style={{ flex: 1, minWidth: 0 }}>
                      <span
                        className={styles.tableRowRank}
                        style={{
                          background: idx === 0 ? "#F59E0B" : idx === 1 ? "#94A3B8" : idx === 2 ? "#B45309" : token.colorFillSecondary,
                          color: idx < 3 ? "#FFF" : token.colorTextSecondary,
                        }}
                      >
                        {idx + 1}
                      </span>
                      <Text strong style={{ fontSize: 13, minWidth: 120 }} ellipsis>
                        {item.model}
                      </Text>
                      <Progress
                        percent={pct}
                        strokeColor={PALETTE[idx % PALETTE.length]}
                        showInfo={false}
                        style={{ flex: 1, margin: 0 }}
                      />
                    </Flex>
                    <Text strong style={{ fontFamily: "monospace", fontSize: 13, color: "#10B981" }}>
                      {formatUsd(item.cost)}
                    </Text>
                  </Flex>
                );
              })}
              {!(data?.byModel || []).length && (
                <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无模型消耗数据" />
              )}
            </Flex>
          </Card>
        </Col>
      </Row>

      {/* API Key & Account Quick Breakdown Tables */}
      {((data?.byApiKey || []).length > 0 || (data?.byAccount || []).length > 0) && (
        <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
          {(data?.byApiKey || []).length > 0 && (
            <Col xs={24} md={12} className={styles.stretchCol}>
              <Card className={styles.cardSection}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 10 }}>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="key" size={18} style={{ color: "#F59E0B" }} />
                    <Text strong style={{ fontSize: 14 }}>API 密钥消耗明细</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    共 {(data?.byApiKey || []).length} 条明细
                  </Text>
                </Flex>
                <div style={{ maxHeight: 240, overflowY: "auto", width: "100%", scrollbarWidth: "thin" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead style={{ position: "sticky", top: 0, background: token.colorBgContainer, zIndex: 1 }}>
                      <tr style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                        {["密钥名称", "请求", "Token", "消耗"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "6px 8px 8px 0",
                              textAlign: h === "密钥名称" ? "left" : "right",
                              color: "#94A3B8",
                              fontWeight: 600,
                              fontSize: 12,
                              textTransform: "uppercase",
                              background: token.colorBgContainer,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.byApiKey || []).map((row, idx) => (
                        <tr
                          key={`${row.apiKey}-${row.apiKeyId || idx}`}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "8px 8px 8px 0", color: "#E2E8F0", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.apiKeyName || row.apiKey}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#94A3B8" }}>
                            {row.requests.toLocaleString()}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#94A3B8" }}>
                            {formatTokens(row.totalTokens)}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: row.cost > 0 ? "#10B981" : "#94A3B8" }}>
                            {formatUsd(row.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Col>
          )}
          {(data?.byAccount || []).length > 0 && (
            <Col xs={24} md={12} className={styles.stretchCol}>
              <Card className={styles.cardSection}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 10 }}>
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="manage_accounts" size={18} style={{ color: "#8B5CF6" }} />
                    <Text strong style={{ fontSize: 14 }}>账户消耗明细</Text>
                  </Flex>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    共 {(data?.byAccount || []).length} 条明细
                  </Text>
                </Flex>
                <div style={{ maxHeight: 240, overflowY: "auto", width: "100%", scrollbarWidth: "thin" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                    <thead style={{ position: "sticky", top: 0, background: token.colorBgContainer, zIndex: 1 }}>
                      <tr style={{ borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
                        {["账户", "请求", "Token", "消耗"].map((h) => (
                          <th
                            key={h}
                            style={{
                              padding: "6px 8px 8px 0",
                              textAlign: h === "账户" ? "left" : "right",
                              color: "#94A3B8",
                              fontWeight: 600,
                              fontSize: 12,
                              textTransform: "uppercase",
                              background: token.colorBgContainer,
                            }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {(data?.byAccount || []).map((row, idx) => (
                        <tr
                          key={`${row.account}-${idx}`}
                          style={{
                            borderBottom: "1px solid rgba(255,255,255,0.04)",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = "transparent";
                          }}
                        >
                          <td style={{ padding: "8px 8px 8px 0", color: "#E2E8F0", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {row.account}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#94A3B8" }}>
                            {row.requests.toLocaleString()}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: "#94A3B8" }}>
                            {formatTokens(row.totalTokens)}
                          </td>
                          <td style={{ padding: "8px 0", textAlign: "right", fontFamily: "monospace", color: row.cost > 0 ? "#10B981" : "#94A3B8" }}>
                            {formatUsd(row.cost)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </Col>
          )}
        </Row>
      )}

      {/* Weekly Usage Pattern + Activity Heatmap */}
      {summary.totalRequests > 0 && (
        <Row gutter={[12, 12]} style={{ alignItems: "stretch" }}>
          <Col xs={24} md={12} className={styles.stretchCol}>
            <Card className={styles.cardSection}>
              <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
                <MaterialIcon name="calendar_view_week" size={18} style={{ color: "#8B5CF6" }} />
                <Text strong style={{ fontSize: 14 }}>周使用模式 (Weekly Pattern)</Text>
              </Flex>
              <WeeklyBarChart rows={data?.weeklyPattern || []} />
            </Card>
          </Col>
          <Col xs={24} md={12} className={styles.stretchCol}>
            <Card className={styles.cardSection}>
              <Flex align="center" gap={6} style={{ marginBottom: 12 }}>
                <MaterialIcon name="grid_on" size={18} style={{ color: "#10B981" }} />
                <Text strong style={{ fontSize: 14 }}>活动热力图 (Activity Heatmap · 近 365 天)</Text>
              </Flex>
              <ActivityHeatmapGrid activityMap={data?.activityMap || {}} />
            </Card>
          </Col>
        </Row>
      )}
    </Flex>
  );
}
