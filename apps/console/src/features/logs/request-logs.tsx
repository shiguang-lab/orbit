import { useState, useMemo, useCallback } from "react";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Flex,
  Input,
  InputNumber,
  Popconfirm,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { logsApi, type RequestCallLog } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { JsonTreeViewer } from "@/shared/components/JsonTreeViewer";
import { useI18n } from "@/i18n";

const { Text } = Typography;

const PROVIDER_THEMES: Record<string, { bg: string; text: string; label: string }> = {
  openai: { bg: "#10a37f", text: "#fff", label: "OpenAI" },
  anthropic: { bg: "#d97706", text: "#fff", label: "Anthropic" },
  gemini: { bg: "#4285f4", text: "#fff", label: "Google Gemini" },
  deepseek: { bg: "#0284c7", text: "#fff", label: "DeepSeek" },
  groq: { bg: "#f97316", text: "#fff", label: "Groq" },
  mistral: { bg: "#ea580c", text: "#fff", label: "Mistral" },
  cohere: { bg: "#6366f1", text: "#fff", label: "Cohere" },
  openrouter: { bg: "#6b21a8", text: "#fff", label: "OpenRouter" },
  together: { bg: "#059669", text: "#fff", label: "Together" },
  bedrock: { bg: "#ea580c", text: "#fff", label: "AWS Bedrock" },
  azure: { bg: "#0078d4", text: "#fff", label: "Azure OpenAI" },
};

function getLogTotalTokens(log: RequestCallLog): number {
  return (
    (log.inputTokens ?? log.tokens?.in ?? log.tokens?.prompt ?? 0) +
    (log.outputTokens ?? log.tokens?.out ?? log.tokens?.completion ?? 0)
  );
}

function getLogTps(log: RequestCallLog): number {
  const tokensOut = log.outputTokens ?? log.tokens?.out ?? log.tokens?.completion ?? 0;
  const durationMs = log.durationMs ?? log.latencyMs ?? 0;
  if (tokensOut <= 0 || durationMs <= 0) return 0;
  return tokensOut / (durationMs / 1000);
}

function formatTps(tps: number): string {
  if (tps <= 0) return "—";
  if (tps >= 100) return Math.round(tps).toLocaleString();
  return tps.toFixed(1);
}

const DEFAULT_COLUMNS = [
  { key: "status", label: "状态" },
  { key: "cacheSource", label: "缓存" },
  { key: "model", label: "模型" },
  { key: "requestedModel", label: "请求模型" },
  { key: "provider", label: "提供商" },
  { key: "account", label: "账号" },
  { key: "apiKey", label: "API Key" },
  { key: "combo", label: "套餐" },
  { key: "tokens", label: "Tokens (入/出)" },
  { key: "tps", label: "TPS" },
  { key: "duration", label: "耗时" },
  { key: "time", label: "时间" },
  { key: "conversation", label: "会话链路" },
];

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  controlCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
  },
  tableCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    flex: 1,
    overflow: "hidden",
  },
  jsonViewer: {
    background: "#09090b",
    color: "#f4f4f5",
    borderRadius: 8,
    padding: "12px 16px",
    fontFamily: "monospace",
    fontSize: 12,
    maxHeight: 320,
    overflowY: "auto",
    lineHeight: 1.5,
    margin: 0,
  },
  chatBubbleUser: {
    background: "rgba(99, 102, 241, 0.12)",
    border: "1px solid rgba(99, 102, 241, 0.3)",
    borderRadius: "12px 12px 2px 12px",
    padding: "8px 12px",
    alignSelf: "flex-end",
    maxWidth: "85%",
  },
  chatBubbleAssistant: {
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: "12px 12px 12px 2px",
    padding: "8px 12px",
    alignSelf: "flex-start",
    maxWidth: "85%",
  },
  chatBubbleSystem: {
    background: "rgba(234, 179, 8, 0.08)",
    border: "1px solid rgba(234, 179, 8, 0.25)",
    borderRadius: 8,
    padding: "6px 10px",
    fontSize: 12,
    width: "100%",
  },
}));

export function RequestLogsPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  // Control State
  const [recording, setRecording] = useState<boolean>(true);
  const [detailLoggingEnabled, setDetailLoggingEnabled] = useState<boolean>(false);
  const [search, setSearch] = useState<string>("");
  const [correlationIdFilter, setCorrelationIdFilter] = useState<string>("");
  const [groupedView, setGroupedView] = useState<boolean>(false);
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedAccount, setSelectedAccount] = useState<string>("");
  const [selectedApiKey, setSelectedApiKey] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [refreshIntervalSec, setRefreshIntervalSec] = useState<number>(2);
  const [selectedLog, setSelectedLog] = useState<RequestCallLog | null>(null);
  const [hoveredCid, setHoveredCid] = useState<string | null>(null);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    return Object.fromEntries(DEFAULT_COLUMNS.map((c) => [c.key, true]));
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Queries
  const logsQuery = useQuery({
    queryKey: ["request-call-logs", search, activeStatusFilter, selectedProvider, selectedModel],
    queryFn: () => logsApi.listCallLogs({ limit: 150 }),
    refetchInterval: recording ? refreshIntervalSec * 1000 : false,
  });

  const purgeMutation = useMutation({
    mutationFn: () => logsApi.purgeHistory(),
    onSuccess: () => {
      messageApi.success("已成功清空全部请求历史记录");
      void queryClient.invalidateQueries({ queryKey: ["request-call-logs"] });
    },
    onError: (err: Error) => {
      messageApi.error(`清空失败: ${err.message}`);
    },
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  // Extract unique filter dropdown options
  const uniqueProviders = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.provider).filter(Boolean))).sort();
  }, [logs]);

  const uniqueModels = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.model).filter(Boolean))).sort();
  }, [logs]);

  const uniqueAccounts = useMemo(() => {
    return Array.from(new Set(logs.map((l) => (l as unknown as { account?: string }).account).filter(Boolean))) as string[];
  }, [logs]);

  const uniqueApiKeys = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.apiKeyName || l.apiKeyId).filter(Boolean))) as string[];
  }, [logs]);

  // Filter logs
  const filteredLogs = useMemo(() => {
    let list = [...logs];

    // Status filter
    if (activeStatusFilter === "error") {
      list = list.filter((l) => (l.status ?? 200) >= 400);
    } else if (activeStatusFilter === "ok") {
      list = list.filter((l) => (l.status ?? 200) >= 200 && (l.status ?? 200) < 300);
    } else if (activeStatusFilter === "combo") {
      list = list.filter((l) => Boolean((l as unknown as { comboName?: string }).comboName));
    }

    // Provider filter
    if (selectedProvider) {
      list = list.filter((l) => l.provider === selectedProvider);
    }

    // Model filter
    if (selectedModel) {
      list = list.filter((l) => l.model === selectedModel || l.requestedModel === selectedModel);
    }

    // Account filter
    if (selectedAccount) {
      list = list.filter((l) => (l as unknown as { account?: string }).account === selectedAccount);
    }

    // API Key filter
    if (selectedApiKey) {
      list = list.filter((l) => l.apiKeyName === selectedApiKey || l.apiKeyId === selectedApiKey);
    }

    // Correlation ID filter
    if (correlationIdFilter.trim()) {
      const cid = correlationIdFilter.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.sessionTag?.toLowerCase().includes(cid) ||
          ((l as unknown as { correlationId?: string }).correlationId?.toLowerCase().includes(cid))
      );
    }

    // Keyword search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.model?.toLowerCase().includes(q) ||
          l.requestedModel?.toLowerCase().includes(q) ||
          l.provider?.toLowerCase().includes(q) ||
          l.id?.toLowerCase().includes(q) ||
          l.apiKeyName?.toLowerCase().includes(q) ||
          l.apiKeyId?.toLowerCase().includes(q) ||
          l.ip?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [logs, activeStatusFilter, selectedProvider, selectedModel, selectedAccount, selectedApiKey, correlationIdFilter, search]);

  // Grouped / Deduplicated view by correlationId
  const dedupedLogs = useMemo(() => {
    if (!groupedView) return filteredLogs;
    const byCid = new Map<string, RequestCallLog>();
    const noCid: RequestCallLog[] = [];
    for (const log of filteredLogs) {
      const cid = (log as unknown as { correlationId?: string }).correlationId || log.sessionTag;
      if (!cid) {
        noCid.push(log);
        continue;
      }
      const existing = byCid.get(cid);
      if (!existing || new Date(log.timestamp).getTime() > new Date(existing.timestamp).getTime()) {
        byCid.set(cid, log);
      }
    }
    return [...noCid, ...byCid.values()];
  }, [filteredLogs, groupedView]);

  // Sorted logs
  const sortedLogs = useMemo(() => {
    const arr = [...dedupedLogs];
    arr.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case "tokens_desc":
          return getLogTotalTokens(b) - getLogTotalTokens(a);
        case "tokens_asc":
          return getLogTotalTokens(a) - getLogTotalTokens(b);
        case "duration_desc":
          return (b.durationMs ?? b.latencyMs ?? 0) - (a.durationMs ?? a.latencyMs ?? 0);
        case "duration_asc":
          return (a.durationMs ?? a.latencyMs ?? 0) - (b.durationMs ?? b.latencyMs ?? 0);
        case "tps_desc":
          return getLogTps(b) - getLogTps(a);
        case "tps_asc":
          return getLogTps(a) - getLogTps(b);
        case "status_desc":
          return (b.status ?? 0) - (a.status ?? 0);
        case "status_asc":
          return (a.status ?? 0) - (b.status ?? 0);
        case "model_asc":
          return (a.model || "").localeCompare(b.model || "");
        case "model_desc":
          return (b.model || "").localeCompare(a.model || "");
        case "newest":
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });
    return arr;
  }, [dedupedLogs, sortBy]);

  // Grouped with retry context
  const displayLogs = useMemo(() => {
    const cidGroups = new Map<string, RequestCallLog[]>();
    for (const log of sortedLogs) {
      const cid = (log as unknown as { correlationId?: string }).correlationId || log.sessionTag;
      if (cid) {
        if (!cidGroups.has(cid)) cidGroups.set(cid, []);
        cidGroups.get(cid)!.push(log);
      }
    }

    return sortedLogs.map((log) => {
      const cid = (log as unknown as { correlationId?: string }).correlationId || log.sessionTag;
      if (!cid) return { ...log, isRetry: false, groupSize: 1, groupStatus: null };
      const group = cidGroups.get(cid);
      if (!group || group.length <= 1) {
        return { ...log, isRetry: false, groupSize: 1, groupStatus: null };
      }
      const isFirst = group[0].id === log.id;
      const hasFailure = group.some((g) => (g.status ?? 200) >= 400 || g.active);
      const hasSuccess = group.some((g) => (g.status ?? 200) >= 200 && (g.status ?? 200) < 300);
      const groupStatus = hasFailure && hasSuccess ? "healed" : hasFailure ? "failed" : null;
      return { ...log, isRetry: !isFirst, groupSize: group.length, groupStatus };
    });
  }, [sortedLogs]);

  // Navigation inside detail drawer
  const currentLogIndex = useMemo(() => {
    if (!selectedLog) return -1;
    return displayLogs.findIndex((l) => l.id === selectedLog.id);
  }, [selectedLog, displayLogs]);

  const handlePrev = useCallback(() => {
    if (currentLogIndex > 0) {
      setSelectedLog(displayLogs[currentLogIndex - 1]);
    }
  }, [currentLogIndex, displayLogs]);

  const handleNext = useCallback(() => {
    if (currentLogIndex >= 0 && currentLogIndex < displayLogs.length - 1) {
      setSelectedLog(displayLogs[currentLogIndex + 1]);
    }
  }, [currentLogIndex, displayLogs]);

  // Stats Counters
  const { totalCount, okCount, errorCount, comboCount, apiKeyCount, runningCount } = useMemo(() => {
    return {
      totalCount: logs.length,
      okCount: logs.filter((l) => (l.status ?? 200) >= 200 && (l.status ?? 200) < 300).length,
      errorCount: logs.filter((l) => (l.status ?? 200) >= 400).length,
      comboCount: logs.filter((l) => Boolean((l as unknown as { comboName?: string }).comboName)).length,
      apiKeyCount: uniqueApiKeys.length,
      runningCount: logs.filter((l) => l.active === true).length,
    };
  }, [logs, uniqueApiKeys]);

  // Table Columns Definition
  const columns: TableColumnsType<RequestCallLog & { isRetry?: boolean; groupSize?: number; groupStatus?: string | null }> = [
    ...(visibleColumns.status
      ? [
          {
            title: (
              <span
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortBy(sortBy === "status_desc" ? "status_asc" : "status_desc")}
              >
                状态 {sortBy.startsWith("status") ? (sortBy === "status_desc" ? "↓" : "↑") : ""}
              </span>
            ),
            dataIndex: "status",
            key: "status",
            width: 95,
            render: (status: number, record: RequestCallLog & { isRetry?: boolean; groupSize?: number; groupStatus?: string | null }) => {
              if (record.active) {
                return (
                  <Tag color="processing" icon={<MaterialIcon name="sync" size={12} className="spin" />}>
                    进行中
                  </Tag>
                );
              }
              const st = status ?? 200;
              const isOk = st >= 200 && st < 300;
              const color = isOk ? "#059669" : st >= 500 ? "#dc2626" : "#d97706";
              return (
                <Flex align="center" gap={4}>
                  <Tag
                    style={{
                      backgroundColor: `${color}18`,
                      borderColor: `${color}40`,
                      color,
                      fontWeight: 700,
                      fontFamily: "monospace",
                      margin: 0,
                    }}
                  >
                    {st}
                  </Tag>
                  {record.groupStatus === "healed" && !record.isRetry && (
                    <Tooltip title="故障自愈：该请求初次失败后通过上游重试成功恢复">
                      <span style={{ color: "#059669", fontSize: 11, fontWeight: "bold" }}>✓</span>
                    </Tooltip>
                  )}
                  {record.isRetry && (
                    <span style={{ color: "#f59e0b", fontSize: 11, fontWeight: "bold" }}>↳</span>
                  )}
                </Flex>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.cacheSource
      ? [
          {
            title: tt("缓存", "Cache"),
            key: "cacheSource",
            width: 80,
            render: (_: unknown, record: RequestCallLog) => {
              const isSemantic = (record as unknown as { cacheSource?: string }).cacheSource === "semantic";
              const isHit = Boolean((record as unknown as { cacheHit?: boolean }).cacheHit || isSemantic);
              if (!isHit) {
                return <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>—</span>;
              }
              return (
                <Tag color={isSemantic ? "emerald" : "blue"} style={{ margin: 0, fontSize: 10, fontWeight: 700 }}>
                  {isSemantic ? tt("语义缓存", "Semantic") : tt("上游缓存", "Upstream")}
                </Tag>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.model
      ? [
          {
            title: (
              <span
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortBy(sortBy === "model_desc" ? "model_asc" : "model_desc")}
              >
                {tt("模型", "Model")} {sortBy.startsWith("model") ? (sortBy === "model_desc" ? "↓" : "↑") : ""}
              </span>
            ),
            dataIndex: "model",
            key: "model",
            minWidth: 170,
            render: (model: string, record: RequestCallLog & { isRetry?: boolean; groupSize?: number; groupStatus?: string | null }) => {
              const cid = (record as unknown as { correlationId?: string }).correlationId || record.sessionTag;
              return (
                <Flex vertical gap={2}>
                  <Flex align="center" gap={6}>
                    <Text strong style={{ fontFamily: "monospace", color: "#818cf8" }}>
                      {model || "-"}
                    </Text>
                    {record.groupStatus === "healed" && !record.isRetry && (
                      <Tag color="success" style={{ margin: 0, fontSize: 9, padding: "0 4px" }}>
                        {tt("已自愈", "Healed")}
                      </Tag>
                    )}
                  </Flex>
                  {cid && (
                    <Text type="secondary" style={{ fontSize: 10, fontFamily: "monospace" }}>
                      CID: {cid.slice(0, 10)}… {record.groupSize && record.groupSize > 1 ? `(${record.groupSize}${tt("次尝试", " attempts")})` : ""}
                    </Text>
                  )}
                </Flex>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.requestedModel
      ? [
          {
            title: tt("请求模型", "Requested Model"),
            dataIndex: "requestedModel",
            key: "requestedModel",
            width: 140,
            render: (requestedModel: string, record: RequestCallLog) => {
              if (!requestedModel) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
              const isRewritten = requestedModel !== record.model;
              return (
                <Text
                  style={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: isRewritten ? "#f59e0b" : "var(--ant-color-text-secondary)",
                  }}
                  title={isRewritten ? `${tt("重写路由：请求", "Rewritten: Req")} ${requestedModel} → ${tt("分发", "Route")} ${record.model}` : requestedModel}
                >
                  {requestedModel}
                </Text>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.provider
      ? [
          {
            title: tt("提供商", "Provider"),
            dataIndex: "provider",
            key: "provider",
            width: 110,
            render: (provider: string) => {
              const theme = PROVIDER_THEMES[provider?.toLowerCase()] || {
                bg: "#374151",
                text: "#ffffff",
                label: (provider || "-").toUpperCase(),
              };
              return (
                <Tag
                  style={{
                    backgroundColor: `${theme.bg}22`,
                    borderColor: `${theme.bg}50`,
                    color: theme.bg,
                    fontWeight: 700,
                    margin: 0,
                    fontSize: 11,
                  }}
                >
                  {theme.label}
                </Tag>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.account
      ? [
          {
            title: tt("账号", "Account"),
            key: "account",
            width: 110,
            render: (_: unknown, record: RequestCallLog) => {
              const acc = (record as unknown as { account?: string }).account;
              if (!acc) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
              return (
                <Text ellipsis style={{ fontSize: 11, maxWidth: 110 }} title={acc}>
                  {acc}
                </Text>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.apiKey
      ? [
          {
            title: "API Key",
            key: "apiKey",
            width: 130,
            render: (_: unknown, record: RequestCallLog) => {
              const name = record.apiKeyName || record.apiKeyId;
              if (!name) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
              return (
                <Text code style={{ fontSize: 11 }} ellipsis title={name}>
                  {record.apiKeyName ? record.apiKeyName : `Key:${name.slice(0, 8)}`}
                </Text>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.combo
      ? [
          {
            title: tt("套餐", "Combo"),
            key: "combo",
            width: 90,
            render: (_: unknown, record: RequestCallLog) => {
              const combo = (record as unknown as { comboName?: string }).comboName;
              if (!combo) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
              return (
                <Tag color="purple" style={{ margin: 0, fontSize: 10, fontWeight: 700 }}>
                  {combo}
                </Tag>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.tokens
      ? [
          {
            title: (
              <span
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortBy(sortBy === "tokens_desc" ? "tokens_asc" : "tokens_desc")}
              >
                Tokens {sortBy.startsWith("tokens") ? (sortBy === "tokens_desc" ? "↓" : "↑") : ""}
              </span>
            ),
            key: "tokens",
            width: 150,
            align: "right" as const,
            render: (_: unknown, record: RequestCallLog) => {
              const inTok = record.inputTokens ?? record.tokens?.in ?? record.tokens?.prompt ?? 0;
              const outTok = record.outputTokens ?? record.tokens?.out ?? record.tokens?.completion ?? 0;
              const tokExtended = record.tokens as { cacheRead?: number; cacheWrite?: number } | undefined;
              const cr = tokExtended?.cacheRead;
              const cw = tokExtended?.cacheWrite;
              return (
                <div style={{ fontFamily: "monospace", fontSize: 11 }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>TI: </span>
                  <span style={{ color: "#818cf8", fontWeight: 600 }}>{inTok.toLocaleString()}</span>
                  <span style={{ margin: "0 3px", color: "rgba(255,255,255,0.2)" }}>|</span>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>TO: </span>
                  <span style={{ color: "#34d399", fontWeight: 600 }}>{outTok.toLocaleString()}</span>
                  {Boolean(cr && cr > 0) && (
                    <span style={{ color: "#38bdf8", marginLeft: 4 }} title="Prompt Cache Read">
                      (CR:{cr})
                    </span>
                  )}
                  {Boolean(cw && cw > 0) && (
                    <span style={{ color: "#f59e0b", marginLeft: 4 }} title="Prompt Cache Write">
                      (CW:{cw})
                    </span>
                  )}
                </div>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.tps
      ? [
          {
            title: (
              <span
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortBy(sortBy === "tps_desc" ? "tps_asc" : "tps_desc")}
              >
                TPS {sortBy.startsWith("tps") ? (sortBy === "tps_desc" ? "↓" : "↑") : ""}
              </span>
            ),
            key: "tps",
            width: 80,
            align: "right" as const,
            render: (_: unknown, record: RequestCallLog) => {
              const tps = getLogTps(record);
              const color = tps <= 0 ? "rgba(255,255,255,0.3)" : tps >= 80 ? "#10b981" : tps >= 30 ? "#38bdf8" : "#f59e0b";
              return (
                <span style={{ fontFamily: "monospace", color, fontWeight: 700, fontSize: 11 }}>
                  {formatTps(tps)}
                </span>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.duration
      ? [
          {
            title: (
              <span
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortBy(sortBy === "duration_desc" ? "duration_asc" : "duration_desc")}
              >
                {tt("耗时", "Latency")} {sortBy.startsWith("duration") ? (sortBy === "duration_desc" ? "↓" : "↑") : ""}
              </span>
            ),
            key: "duration",
            width: 110,
            align: "right" as const,
            render: (_: unknown, record: RequestCallLog) => {
              const dur = record.durationMs ?? record.latencyMs ?? 0;
              return (
                <Flex vertical align="flex-end" gap={1}>
                  <span style={{ fontFamily: "monospace", fontWeight: 600, fontSize: 11 }}>
                    {dur.toLocaleString()} ms
                  </span>
                  {record.ttftMs != null && (
                    <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}>
                      TTFT: {record.ttftMs}ms
                    </span>
                  )}
                </Flex>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.time
      ? [
          {
            title: (
              <span
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
              >
                {tt("时间", "Time")} {sortBy === "newest" ? "↓" : sortBy === "oldest" ? "↑" : ""}
              </span>
            ),
            dataIndex: "timestamp",
            key: "time",
            width: 95,
            align: "right" as const,
            render: (ts: string) => {
              return (
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                  {ts ? new Date(ts).toLocaleTimeString() : "--:--:--"}
                </span>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.conversation
      ? [
          {
            title: tt("会话链路", "Session"),
            key: "conversation",
            width: 100,
            render: (_: unknown, record: RequestCallLog) => {
              const tag = record.sessionTag || (record as unknown as { conversationId?: string }).conversationId;
              if (!tag) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
              return (
                <Tag color="default" style={{ margin: 0, fontFamily: "monospace", fontSize: 10 }} title={tag}>
                  {tag.slice(0, 8)}…
                </Tag>
              );
            },
          },
        ]
      : []),
  ];

  if (logsQuery.isLoading && !logsQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Top Header Control Bar */}
      <Card className={styles.controlCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <Flex align="center" gap={10} wrap style={{ flex: 1 }}>
            {/* Recording Switch Button */}
            <Button
              shape="round"
              onClick={() => setRecording(!recording)}
              style={{
                borderColor: recording ? "#ef4444" : undefined,
                color: recording ? "#ef4444" : undefined,
                fontWeight: 600,
              }}
              icon={
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: recording ? "#ef4444" : "rgba(255,255,255,0.3)",
                  }}
                />
              }
            >
              {recording ? tt("录制中", "Live") : tt("已暂停", "Paused")}
            </Button>

            {/* Pipeline Logs Toggle */}
            <Button
              shape="round"
              onClick={() => setDetailLoggingEnabled(!detailLoggingEnabled)}
              style={{
                borderColor: detailLoggingEnabled ? "#f59e0b" : undefined,
                color: detailLoggingEnabled ? "#f59e0b" : undefined,
                fontWeight: 600,
              }}
              icon={
                <span
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    backgroundColor: detailLoggingEnabled ? "#f59e0b" : "rgba(255,255,255,0.3)",
                  }}
                />
              }
            >
              {detailLoggingEnabled ? tt("管道日志 (开)", "Pipeline (On)") : tt("管道日志 (关)", "Pipeline (Off)")}
            </Button>

            {/* Search Input */}
            <Input.Search
              placeholder={tt("搜索路径、模型、Key、IP 或请求 ID...", "Search path, model, key, IP or ID...")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 200px", minWidth: 180, maxWidth: 320 }}
              allowClear
            />

            {/* Correlation ID Input */}
            <Input
              prefix={<MaterialIcon name="tag" size={14} />}
              placeholder={tt("关联 ID (CID)...", "Correlation ID...")}
              value={correlationIdFilter}
              onChange={(e) => setCorrelationIdFilter(e.target.value)}
              style={{ width: 150, fontFamily: "monospace" }}
              allowClear
            />

            {/* Group by CID toggle */}
            <Button
              type={groupedView ? "primary" : "default"}
              icon={<MaterialIcon name={groupedView ? "unfold_less" : "unfold_more"} size={16} />}
              onClick={() => setGroupedView(!groupedView)}
            >
              {groupedView ? tt("聚合视图", "Grouped") : tt("平铺视图", "Flat")}
            </Button>

            {/* Provider Filter */}
            <Select
              value={selectedProvider}
              onChange={setSelectedProvider}
              style={{ minWidth: 140 }}
              options={[
                { label: tt("全部提供商", "All Providers"), value: "" },
                ...uniqueProviders.map((p) => ({ label: p.toUpperCase(), value: p })),
              ]}
            />

            {/* Model Filter */}
            <Select
              value={selectedModel}
              onChange={setSelectedModel}
              style={{ minWidth: 160 }}
              options={[
                { label: tt("全部模型", "All Models"), value: "" },
                ...uniqueModels.map((m) => ({ label: m, value: m })),
              ]}
            />
            {/* Account Filter */}
            {uniqueAccounts.length > 0 && (
              <Select
                value={selectedAccount}
                onChange={setSelectedAccount}
                style={{ minWidth: 140 }}
                options={[
                  { label: tt("全部账号", "All Accounts"), value: "" },
                  ...uniqueAccounts.map((a) => ({ label: a, value: a })),
                ]}
              />
            )}

            {/* API Key Filter */}
            {uniqueApiKeys.length > 0 && (
              <Select
                value={selectedApiKey}
                onChange={setSelectedApiKey}
                style={{ minWidth: 150 }}
                options={[
                  { label: tt("全部 API Key", "All API Keys"), value: "" },
                  ...uniqueApiKeys.map((k) => ({ label: k, value: k })),
                ]}
              />
            )}
          </Flex>

          <Space size={10} wrap>
            {/* Sort Dropdown */}
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ minWidth: 135 }}
              options={[
                { label: tt("最新优先", "Newest First"), value: "newest" },
                { label: tt("最早优先", "Oldest First"), value: "oldest" },
                { label: tt("Tokens 降序", "Tokens High-to-Low"), value: "tokens_desc" },
                { label: tt("Tokens 升序", "Tokens Low-to-High"), value: "tokens_asc" },
                { label: tt("耗时 降序", "Duration High-to-Low"), value: "duration_desc" },
                { label: tt("耗时 升序", "Duration Low-to-High"), value: "duration_asc" },
                { label: tt("TPS 降序", "TPS High-to-Low"), value: "tps_desc" },
                { label: tt("TPS 升序", "TPS Low-to-High"), value: "tps_asc" },
                { label: tt("状态码 降序", "Status High-to-Low"), value: "status_desc" },
                { label: tt("状态码 升序", "Status Low-to-High"), value: "status_asc" },
                { label: tt("模型名称 A-Z", "Model A-Z"), value: "model_asc" },
                { label: tt("模型名称 Z-A", "Model Z-A"), value: "model_desc" },
              ]}
            />

            {/* Poll Interval */}
            <Flex align="center" gap={4} style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
              <InputNumber
                size="middle"
                min={1}
                max={300}
                value={refreshIntervalSec}
                onChange={(val) => setRefreshIntervalSec(val ?? 2)}
                style={{ width: 60 }}
              />
              <span>s</span>
            </Flex>

            {/* Manual Refresh */}
            <Button
              icon={<MaterialIcon name="refresh" size={16} className={logsQuery.isFetching ? "spin" : ""} />}
              onClick={() => void logsQuery.refetch()}
            />

            {/* Purge Popconfirm */}
            <Popconfirm
              title="清空请求日志"
              description="确定要彻底清除当前全部请求日志历史记录吗？此操作不可逆。"
              okText="确认清空"
              cancelText="取消"
              okButtonProps={{ danger: true, loading: purgeMutation.isPending }}
              onConfirm={() => purgeMutation.mutate()}
            >
              <Button danger icon={<MaterialIcon name="delete_sweep" size={16} />}>
                清空历史
              </Button>
            </Popconfirm>
          </Space>
        </Flex>

        {/* Status Quick Filters + Stats Pill Bar */}
        <Flex align="center" justify="space-between" wrap gap={12} style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid var(--ant-color-border-secondary)" }}>
          {/* Quick Filter Buttons */}
          <Space size={8} wrap>
            <Button
              size="small"
              type={activeStatusFilter === "all" ? "primary" : "default"}
              shape="round"
              onClick={() => setActiveStatusFilter("all")}
            >
              全部
            </Button>
            <Button
              size="small"
              type={activeStatusFilter === "ok" ? "primary" : "default"}
              shape="round"
              onClick={() => setActiveStatusFilter("ok")}
              icon={<span style={{ color: "#10b981", fontWeight: "bold" }}>●</span>}
            >
              成功 (2xx)
            </Button>
            <Button
              size="small"
              type={activeStatusFilter === "error" ? "primary" : "default"}
              shape="round"
              onClick={() => setActiveStatusFilter("error")}
              icon={<span style={{ color: "#ef4444", fontWeight: "bold" }}>●</span>}
            >
              错误 (4xx/5xx)
            </Button>
            <Button
              size="small"
              type={activeStatusFilter === "combo" ? "primary" : "default"}
              shape="round"
              onClick={() => setActiveStatusFilter("combo")}
              icon={<MaterialIcon name="hub" size={12} />}
            >
              套餐组合
            </Button>

            {/* Dynamic Provider Badges */}
            {uniqueProviders.map((p) => {
              const theme = PROVIDER_THEMES[p.toLowerCase()] || { bg: "#374151", text: "#fff", label: p.toUpperCase() };
              const isSelected = selectedProvider === p;
              return (
                <Button
                  key={p}
                  size="small"
                  shape="round"
                  onClick={() => setSelectedProvider(isSelected ? "" : p)}
                  style={{
                    backgroundColor: isSelected ? theme.bg : `${theme.bg}20`,
                    color: isSelected ? theme.text : theme.bg,
                    borderColor: isSelected ? theme.bg : `${theme.bg}40`,
                    fontWeight: 700,
                  }}
                >
                  {theme.label}
                </Button>
              );
            })}
          </Space>

          {/* Stats Badges */}
          <Space size={6} wrap>
            <Tag style={{ margin: 0, fontFamily: "monospace" }}>总计: {totalCount}</Tag>
            {runningCount > 0 && <Tag color="warning" style={{ margin: 0, fontFamily: "monospace" }}>运行中: {runningCount}</Tag>}
            <Tag color="success" style={{ margin: 0, fontFamily: "monospace" }}>成功: {okCount}</Tag>
            {errorCount > 0 && <Tag color="error" style={{ margin: 0, fontFamily: "monospace" }}>错误: {errorCount}</Tag>}
            {comboCount > 0 && <Tag color="purple" style={{ margin: 0, fontFamily: "monospace" }}>套餐: {comboCount}</Tag>}
            {apiKeyCount > 0 && <Tag color="cyan" style={{ margin: 0, fontFamily: "monospace" }}>密钥: {apiKeyCount}</Tag>}
            <Tag color="blue" style={{ margin: 0, fontFamily: "monospace" }}>已展示: {displayLogs.length}</Tag>
          </Space>
        </Flex>

        {/* Column Visibility Toggles */}
        <Flex align="center" gap={6} wrap style={{ marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "var(--ant-color-text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
            显示列:
          </span>
          {DEFAULT_COLUMNS.map((col) => {
            const isVisible = visibleColumns[col.key];
            return (
              <Tag.CheckableTag
                key={col.key}
                checked={isVisible}
                onChange={() => toggleColumn(col.key)}
                style={{
                  fontSize: 11,
                  borderRadius: 4,
                  padding: "0 6px",
                  lineHeight: "20px",
                }}
              >
                {col.label}
              </Tag.CheckableTag>
            );
          })}
        </Flex>
      </Card>

      {/* Main Request Logs Table */}
      <Card className={styles.tableCard} styles={{ body: { padding: 0 } }}>
        <Table<RequestCallLog & { isRetry?: boolean; groupSize?: number; groupStatus?: string | null }>
          rowKey="id"
          dataSource={displayLogs}
          columns={columns}
          loading={logsQuery.isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100"],
            showTotal: (total) => `共 ${total} 条调用记录`,
          }}
          size="small"
          onRow={(record) => ({
            onClick: () => setSelectedLog(record),
            onMouseEnter: () => record.sessionTag && setHoveredCid(record.sessionTag),
            onMouseLeave: () => setHoveredCid(null),
            style: {
              cursor: "pointer",
              background:
                hoveredCid && record.sessionTag === hoveredCid
                  ? "rgba(99, 102, 241, 0.08)"
                  : record.isRetry
                  ? "rgba(245, 158, 11, 0.03)"
                  : undefined,
            },
          })}
          locale={{
            emptyText: <Empty description="暂无符合条件的请求日志" style={{ padding: "48px 0" }} />,
          }}
        />
      </Card>

      {/* Audit Detail Drawer */}
      <Drawer
        title={
          <Flex align="center" justify="space-between" style={{ width: "100%", paddingRight: 24 }}>
            <Flex align="center" gap={8}>
              <MaterialIcon name="receipt_long" size={20} />
              <span style={{ fontSize: 16, fontWeight: 700 }}>请求调用全景审计</span>
              {selectedLog && (
                <Tag color={(selectedLog.status ?? 200) < 400 ? "success" : "error"}>
                  {selectedLog.status ?? 200}
                </Tag>
              )}
            </Flex>

            {/* Pagination between adjacent logs */}
            <Space size={6}>
              <Button
                size="small"
                icon={<MaterialIcon name="chevron_left" size={16} />}
                disabled={currentLogIndex <= 0}
                onClick={handlePrev}
                title="上一条日志"
              />
              <span style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", fontFamily: "monospace" }}>
                {currentLogIndex + 1} / {displayLogs.length}
              </span>
              <Button
                size="small"
                icon={<MaterialIcon name="chevron_right" size={16} />}
                disabled={currentLogIndex >= displayLogs.length - 1}
                onClick={handleNext}
                title="下一条日志"
              />
            </Space>
          </Flex>
        }
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        width={720}
      >
        {selectedLog && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* Meta Summary Grid */}
            <Card size="small" title="基础元数据">
              <Space direction="vertical" size={8} style={{ width: "100%", fontSize: 13 }}>
                <Flex justify="space-between">
                  <Text type="secondary">请求 ID:</Text>
                  <Text code copyable>{selectedLog.id}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">分发模型:</Text>
                  <Text strong style={{ color: "#818cf8" }}>{selectedLog.model}</Text>
                </Flex>
                {selectedLog.requestedModel && selectedLog.requestedModel !== selectedLog.model && (
                  <Flex justify="space-between">
                    <Text type="secondary">原始请求模型:</Text>
                    <Text strong style={{ color: "#f59e0b" }}>{selectedLog.requestedModel}</Text>
                  </Flex>
                )}
                <Flex justify="space-between">
                  <Text type="secondary">上游提供商:</Text>
                  <Tag color="cyan">{selectedLog.provider}</Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">状态码 / 结果:</Text>
                  <Tag color={(selectedLog.status ?? 200) < 400 ? "success" : "error"}>
                    {selectedLog.status ?? 200}
                  </Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">总耗时 / 首字时间 (TTFT):</Text>
                  <span style={{ fontFamily: "monospace" }}>
                    {selectedLog.durationMs ?? selectedLog.latencyMs ?? 0} ms
                    {selectedLog.ttftMs != null ? ` (TTFT: ${selectedLog.ttftMs}ms)` : ""}
                  </span>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">Token 消耗 (输入 / 输出):</Text>
                  <span style={{ fontFamily: "monospace" }}>
                    {selectedLog.inputTokens ?? selectedLog.tokens?.in ?? 0} / {selectedLog.outputTokens ?? selectedLog.tokens?.out ?? 0}
                  </span>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">生成速率 (TPS):</Text>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#10b981" }}>
                    {formatTps(getLogTps(selectedLog))} tokens/s
                  </span>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">调用方 API Key / IP:</Text>
                  <span>{selectedLog.apiKeyName || selectedLog.apiKeyId || "公共"} · {selectedLog.ip || "127.0.0.1"}</span>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">发起时间:</Text>
                  <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </Flex>
              </Space>
            </Card>

            {/* Error diagnostic if any */}
            {selectedLog.error && (
              <Card size="small" title="异常诊断 / 错误堆栈">
                <div style={{ color: "#ef4444", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
                  {selectedLog.error}
                </div>
              </Card>
            )}

            {/* Prompt Messages Inspector */}
            {Array.isArray(selectedLog.messages) && selectedLog.messages.length > 0 && (
              <Card size="small" title={`对话消息流 (${selectedLog.messages.length} 轮)`}>
                <Flex vertical gap={10}>
                  {selectedLog.messages.map((msg, idx) => {
                    const isUser = msg.role === "user";
                    const isAssistant = msg.role === "assistant";
                    const bubbleClass = isUser
                      ? styles.chatBubbleUser
                      : isAssistant
                      ? styles.chatBubbleAssistant
                      : styles.chatBubbleSystem;

                    return (
                      <div key={idx} className={bubbleClass}>
                        <div style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", marginBottom: 4, opacity: 0.6 }}>
                          {msg.role}
                        </div>
                        <div style={{ fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                          {typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content, null, 2)}
                        </div>
                      </div>
                    );
                  })}
                </Flex>
              </Card>
            )}

            {/* JSON Raw Tabs */}
            <Tabs
              defaultActiveKey="raw"
              size="small"
              items={[
                {
                  key: "raw",
                  label: "调用明细 JSON",
                  children: (
                    <JsonTreeViewer value={selectedLog} />
                  ),
                },
                ...(selectedLog.requestBody
                  ? [
                      {
                        key: "req",
                        label: "请求载荷 (Request Body)",
                        children: (
                          <JsonTreeViewer value={selectedLog.requestBody} />
                        ),
                      },
                    ]
                  : []),
                ...(selectedLog.responseBody
                  ? [
                      {
                        key: "resp",
                        label: "响应载荷 (Response Body)",
                        children: (
                          <JsonTreeViewer value={selectedLog.responseBody} />
                        ),
                      },
                    ]
                  : []),
              ]}
            />
          </Space>
        )}
      </Drawer>
    </div>
  );
}

export default RequestLogsPage;
