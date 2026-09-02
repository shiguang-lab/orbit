import { useState, useMemo } from "react";
import {
  Button,
  Card,
  Drawer,
  Empty,
  Flex,
  Input,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { TableColumnsType } from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { logsApi, type ProxyLogItem } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

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

const TYPE_THEMES: Record<string, { bg: string; color: string; label: string }> = {
  socks5: { bg: "rgba(168, 85, 247, 0.15)", color: "#c084fc", label: "SOCKS5" },
  http: { bg: "rgba(59, 130, 246, 0.15)", color: "#60a5fa", label: "HTTP" },
  https: { bg: "rgba(16, 185, 129, 0.15)", color: "#34d399", label: "HTTPS" },
  direct: { bg: "rgba(107, 114, 128, 0.15)", color: "#9ca3af", label: "DIRECT" },
};

function formatProxyNode(proxy: unknown): string {
  if (!proxy) return "";
  if (typeof proxy === "string") return proxy;
  if (typeof proxy === "object" && proxy !== null) {
    const p = proxy as { type?: string; host?: string; port?: number; username?: string; name?: string };
    if (p.name) return p.name;
    const proto = p.type ? `${p.type}://` : "";
    const auth = p.username ? `${p.username}@` : "";
    const hostPort = p.host ? (p.port ? `${p.host}:${p.port}` : p.host) : "";
    return hostPort ? `${proto}${auth}${hostPort}` : "";
  }
  return String(proxy);
}

function getProxyType(record: ProxyLogItem): string {
  if (typeof record.proxy === "object" && record.proxy !== null) {
    const p = record.proxy as { type?: string };
    if (p.type) return p.type;
  }
  return record.type || "direct";
}

const LEVEL_THEMES: Record<string, { bg: string; color: string; label: string }> = {
  provider: { bg: "rgba(99, 102, 241, 0.15)", color: "#818cf8", label: "提供商级" },
  direct: { bg: "rgba(107, 114, 128, 0.15)", color: "#9ca3af", label: "直连回退" },
  system: { bg: "rgba(245, 158, 11, 0.15)", color: "#fbbf24", label: "系统默认" },
  pool: { bg: "rgba(20, 184, 166, 0.15)", color: "#2dd4bf", label: "代理池" },
};

const PROXY_COLUMNS = [
  { key: "status", label: "状态" },
  { key: "proxy", label: "代理节点" },
  { key: "tls", label: "TLS 指纹" },
  { key: "type", label: "类型" },
  { key: "level", label: "层级" },
  { key: "provider", label: "提供商" },
  { key: "target", label: "目标地址" },
  { key: "latency", label: "延迟" },
  { key: "ip", label: "客户端 IP" },
  { key: "time", label: "时间" },
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
}));

export function ProxyLogsPage() {
  const { styles } = useStyles();

  // Control State
  const [recording, setRecording] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>("all");
  const [selectedType, setSelectedType] = useState<string>("");
  const [selectedLevel, setSelectedLevel] = useState<string>("");
  const [selectedProvider, setSelectedProvider] = useState<string>("");
  const [sortBy, setSortBy] = useState<string>("newest");
  const [selectedLog, setSelectedLog] = useState<ProxyLogItem | null>(null);

  // Column Visibility
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    return Object.fromEntries(PROXY_COLUMNS.map((c) => [c.key, true]));
  });

  const toggleColumn = (key: string) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Queries
  const logsQuery = useQuery({
    queryKey: ["proxy-logs", search, activeStatusFilter, selectedType, selectedLevel, selectedProvider],
    queryFn: () => logsApi.listProxyLogs({ limit: 300 }),
    refetchInterval: recording ? 3000 : false,
  });

  const logs = useMemo(() => logsQuery.data ?? [], [logsQuery.data]);

  // Derived unique lists for dropdowns
  const uniqueProviders = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.provider).filter(Boolean))).sort();
  }, [logs]);

  const uniqueTypes = useMemo(() => {
    return Array.from(new Set(logs.map((l) => getProxyType(l)).filter(Boolean))).sort();
  }, [logs]);

  const uniqueLevels = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.level).filter(Boolean))).sort();
  }, [logs]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    let list = [...logs];

    // Status filter
    if (activeStatusFilter === "error") {
      list = list.filter((l) => l.status === "error" || ((l as unknown as { statusCode?: number }).statusCode ?? 200) >= 400);
    } else if (activeStatusFilter === "ok") {
      list = list.filter((l) => l.status === "ok" || ((l as unknown as { statusCode?: number }).statusCode ?? 200) < 400);
    } else if (activeStatusFilter === "timeout") {
      list = list.filter((l) => l.status === "timeout");
    }

    // Type filter
    if (selectedType) {
      list = list.filter((l) => getProxyType(l) === selectedType);
    }

    // Level filter
    if (selectedLevel) {
      list = list.filter((l) => l.level === selectedLevel);
    }

    // Provider filter
    if (selectedProvider) {
      list = list.filter((l) => l.provider === selectedProvider);
    }

    // Keyword search
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter(
        (l) =>
          l.target?.toLowerCase().includes(q) ||
          formatProxyNode(l.proxy).toLowerCase().includes(q) ||
          l.provider?.toLowerCase().includes(q) ||
          l.clientIp?.toLowerCase().includes(q) ||
          l.ip?.toLowerCase().includes(q) ||
          l.id?.toLowerCase().includes(q)
      );
    }

    return list;
  }, [logs, activeStatusFilter, selectedType, selectedLevel, selectedProvider, search]);

  // Sorted Logs
  const sortedLogs = useMemo(() => {
    const arr = [...filteredLogs];
    arr.sort((a, b) => {
      switch (sortBy) {
        case "oldest":
          return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
        case "latency_desc":
          return (b.latencyMs || 0) - (a.latencyMs || 0);
        case "latency_asc":
          return (a.latencyMs || 0) - (b.latencyMs || 0);
        case "newest":
        default:
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      }
    });
    return arr;
  }, [filteredLogs, sortBy]);

  // Stats Counters
  const { totalCount, okCount, errorCount, timeoutCount, directCount, tlsCount } = useMemo(() => {
    return {
      totalCount: logs.length,
      okCount: logs.filter((l) => l.status === "ok" || ((l as unknown as { statusCode?: number }).statusCode ?? 200) < 400).length,
      errorCount: logs.filter((l) => l.status === "error" || ((l as unknown as { statusCode?: number }).statusCode ?? 200) >= 400).length,
      timeoutCount: logs.filter((l) => l.status === "timeout").length,
      directCount: logs.filter((l) => (l as unknown as { level?: string }).level === "direct" || l.type === "direct").length,
      tlsCount: logs.filter((l) => Boolean(l.tls || (l as unknown as { tlsFingerprint?: string }).tlsFingerprint)).length,
    };
  }, [logs]);

  // Table Columns
  const columns: TableColumnsType<ProxyLogItem> = [
    ...(visibleColumns.status
      ? [
          {
            title: "状态",
            key: "status",
            width: 100,
            render: (_: unknown, record: ProxyLogItem) => {
              const isOk = record.status === "ok" || ((record as unknown as { statusCode?: number }).statusCode ?? 200) < 400;
              const isTimeout = record.status === "timeout";
              const color = isOk ? "#059669" : isTimeout ? "#d97706" : "#dc2626";
              const label = isOk ? "SUCCESS" : isTimeout ? "TIMEOUT" : "ERROR";
              return (
                <Tag
                  style={{
                    backgroundColor: `${color}18`,
                    borderColor: `${color}40`,
                    color,
                    fontWeight: 700,
                    fontFamily: "monospace",
                    margin: 0,
                    fontSize: 10,
                  }}
                >
                  {label}
                </Tag>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.proxy
      ? [
          {
            title: "代理节点",
            key: "proxy",
            minWidth: 160,
            render: (_: unknown, record: ProxyLogItem) => {
              const proxyStr = formatProxyNode(record.proxy);
              if (!proxyStr || proxyStr === "direct") {
                return <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>— 直连 —</span>;
              }
              return (
                <Text strong style={{ fontFamily: "monospace", color: "#818cf8", fontSize: 12 }}>
                  {proxyStr}
                </Text>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.tls
      ? [
          {
            title: "TLS 指纹",
            key: "tls",
            width: 90,
            render: (_: unknown, record: ProxyLogItem) => {
              const hasTls = Boolean(record.tls || (record as unknown as { tlsFingerprint?: string }).tlsFingerprint);
              if (!hasTls) {
                return <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>—</span>;
              }
              return (
                <Tag
                  style={{
                    backgroundColor: "rgba(6, 182, 212, 0.15)",
                    borderColor: "rgba(6, 182, 212, 0.3)",
                    color: "#22d3ee",
                    fontWeight: 700,
                    margin: 0,
                    fontSize: 10,
                  }}
                >
                  🔒 TLS
                </Tag>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.type
      ? [
          {
            title: "类型",
            key: "type",
            width: 90,
            render: (_: unknown, record: ProxyLogItem) => {
              const rawType = getProxyType(record);
              const theme = TYPE_THEMES[rawType.toLowerCase()] || {
                bg: "rgba(107, 114, 128, 0.15)",
                color: "#9ca3af",
                label: rawType.toUpperCase(),
              };
              return (
                <Tag
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: "transparent",
                    color: theme.color,
                    fontWeight: 700,
                    margin: 0,
                    fontSize: 10,
                  }}
                >
                  {theme.label}
                </Tag>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.level
      ? [
          {
            title: "层级",
            dataIndex: "level",
            key: "level",
            width: 90,
            render: (level: string) => {
              const theme = LEVEL_THEMES[level?.toLowerCase()] || {
                bg: "rgba(107, 114, 128, 0.15)",
                color: "#9ca3af",
                label: level || "-",
              };
              return (
                <Tag
                  style={{
                    backgroundColor: theme.bg,
                    borderColor: "transparent",
                    color: theme.color,
                    fontWeight: 600,
                    margin: 0,
                    fontSize: 10,
                  }}
                >
                  {theme.label}
                </Tag>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.provider
      ? [
          {
            title: "提供商",
            dataIndex: "provider",
            key: "provider",
            width: 110,
            render: (provider: string) => {
              if (!provider) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
              const theme = PROVIDER_THEMES[provider?.toLowerCase()] || {
                bg: "#374151",
                text: "#ffffff",
                label: provider.toUpperCase(),
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

    ...(visibleColumns.target
      ? [
          {
            title: "目标地址",
            dataIndex: "target",
            key: "target",
            minWidth: 180,
            ellipsis: true,
            render: (target: string) => (
              <Text
                ellipsis
                style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ant-color-text-secondary)" }}
                title={target}
              >
                {target || "—"}
              </Text>
            ),
          },
        ]
      : []),

    ...(visibleColumns.latency
      ? [
          {
            title: (
              <span
                style={{ cursor: "pointer", userSelect: "none" }}
                onClick={() => setSortBy(sortBy === "latency_desc" ? "latency_asc" : "latency_desc")}
              >
                延迟 {sortBy.startsWith("latency") ? (sortBy === "latency_desc" ? "↓" : "↑") : ""}
              </span>
            ),
            dataIndex: "latencyMs",
            key: "latency",
            width: 90,
            align: "right" as const,
            render: (lat: number) => {
              const color = !lat ? "rgba(255,255,255,0.3)" : lat >= 1500 ? "#ef4444" : lat >= 600 ? "#f59e0b" : "#10b981";
              return (
                <span style={{ fontFamily: "monospace", color, fontWeight: 700, fontSize: 11 }}>
                  {lat ? `${lat.toLocaleString()} ms` : "—"}
                </span>
              );
            },
          },
        ]
      : []),

    ...(visibleColumns.ip
      ? [
          {
            title: "客户端 IP",
            key: "ip",
            width: 120,
            render: (_: unknown, record: ProxyLogItem) => {
              const ip = record.clientIp || record.ip;
              if (!ip) return <span style={{ color: "rgba(255,255,255,0.3)" }}>—</span>;
              return (
                <span style={{ fontFamily: "monospace", fontSize: 11, color: "#34d399" }}>
                  {ip}
                </span>
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
                时间 {sortBy === "newest" ? "↓" : sortBy === "oldest" ? "↑" : ""}
              </span>
            ),
            dataIndex: "timestamp",
            key: "time",
            width: 95,
            align: "right" as const,
            render: (ts: string) => (
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.55)" }}>
                {ts ? new Date(ts).toLocaleTimeString() : "--:--:--"}
              </span>
            ),
          },
        ]
      : []),
  ];

  if (logsQuery.isLoading && !logsQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
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
              {recording ? "录制中" : "已暂停"}
            </Button>

            {/* Search Input */}
            <Input.Search
              placeholder="搜索目标 URL、节点名称、IP 或状态..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ flex: "1 1 220px", minWidth: 200, maxWidth: 360 }}
              allowClear
            />

            {/* Type Dropdown */}
            <Select
              value={selectedType}
              onChange={setSelectedType}
              style={{ minWidth: 130 }}
              options={[
                { label: "全部代理类型", value: "" },
                ...uniqueTypes.map((t) => ({ label: (TYPE_THEMES[t.toLowerCase()]?.label || t).toUpperCase(), value: t })),
              ]}
            />

            {/* Level Dropdown */}
            <Select
              value={selectedLevel}
              onChange={setSelectedLevel}
              style={{ minWidth: 130 }}
              options={[
                { label: "全部代理层级", value: "" },
                ...uniqueLevels.map((l) => ({ label: LEVEL_THEMES[l.toLowerCase()]?.label || l, value: l })),
              ]}
            />

            {/* Provider Filter */}
            <Select
              value={selectedProvider}
              onChange={setSelectedProvider}
              style={{ minWidth: 140 }}
              options={[
                { label: "全部提供商", value: "" },
                ...uniqueProviders.map((p) => ({ label: p.toUpperCase(), value: p })),
              ]}
            />
          </Flex>

          <Space size={10} wrap>
            {/* Sort Dropdown */}
            <Select
              value={sortBy}
              onChange={setSortBy}
              style={{ minWidth: 135 }}
              options={[
                { label: "最新优先", value: "newest" },
                { label: "最早优先", value: "oldest" },
                { label: "延迟 降序", value: "latency_desc" },
                { label: "延迟 升序", value: "latency_asc" },
              ]}
            />

            {/* Manual Refresh */}
            <Button
              icon={<MaterialIcon name="refresh" size={16} className={logsQuery.isFetching ? "spin" : ""} />}
              onClick={() => void logsQuery.refetch()}
            />
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
              成功 (Success)
            </Button>
            <Button
              size="small"
              type={activeStatusFilter === "error" ? "primary" : "default"}
              shape="round"
              onClick={() => setActiveStatusFilter("error")}
              icon={<span style={{ color: "#ef4444", fontWeight: "bold" }}>●</span>}
            >
              错误 (Errors)
            </Button>
            <Button
              size="small"
              type={activeStatusFilter === "timeout" ? "primary" : "default"}
              shape="round"
              onClick={() => setActiveStatusFilter("timeout")}
              icon={<span style={{ color: "#f59e0b", fontWeight: "bold" }}>●</span>}
            >
              超时 (Timeout)
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
            <Tag color="success" style={{ margin: 0, fontFamily: "monospace" }}>成功: {okCount}</Tag>
            {errorCount > 0 && <Tag color="error" style={{ margin: 0, fontFamily: "monospace" }}>错误: {errorCount}</Tag>}
            {timeoutCount > 0 && <Tag color="warning" style={{ margin: 0, fontFamily: "monospace" }}>超时: {timeoutCount}</Tag>}
            {directCount > 0 && <Tag style={{ margin: 0, fontFamily: "monospace" }}>直连: {directCount}</Tag>}
            {tlsCount > 0 && <Tag color="cyan" style={{ margin: 0, fontFamily: "monospace" }}>🔒 {tlsCount} TLS</Tag>}
          </Space>
        </Flex>

        {/* Column Visibility Toggles */}
        <Flex align="center" gap={6} wrap style={{ marginTop: 10 }}>
          <span style={{ fontSize: 11, color: "var(--ant-color-text-tertiary)", textTransform: "uppercase", fontWeight: 700 }}>
            显示列:
          </span>
          {PROXY_COLUMNS.map((col) => {
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

      {/* Main Table Card */}
      <Card className={styles.tableCard} styles={{ body: { padding: 0 } }}>
        <Table<ProxyLogItem>
          rowKey="id"
          dataSource={sortedLogs}
          columns={columns}
          loading={logsQuery.isLoading}
          pagination={{
            pageSize: 20,
            showSizeChanger: true,
            pageSizeOptions: ["20", "50", "100"],
            showTotal: (total) => `共 ${total} 条代理事件`,
          }}
          size="small"
          onRow={(record) => ({
            onClick: () => setSelectedLog(record),
            style: { cursor: "pointer" },
          })}
          locale={{
            emptyText: <Empty description="暂无符合条件的代理日志" style={{ padding: "48px 0" }} />,
          }}
        />
      </Card>

      {/* Proxy Detail Drawer */}
      <Drawer
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="vpn_lock" size={20} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>代理路由事件审计</span>
            {selectedLog && (
              <Tag color={selectedLog.status === "ok" ? "success" : selectedLog.status === "timeout" ? "warning" : "error"}>
                {selectedLog.status.toUpperCase()}
              </Tag>
            )}
          </Flex>
        }
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        width={680}
      >
        {selectedLog && (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            {/* Meta Summary Grid */}
            <Card size="small" title="事件元数据">
              <Space direction="vertical" size={8} style={{ width: "100%", fontSize: 13 }}>
                <Flex justify="space-between">
                  <Text type="secondary">事件 ID:</Text>
                  <Text code copyable>{selectedLog.id}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">代理出口节点:</Text>
                  <Text strong style={{ fontFamily: "monospace", color: "#818cf8" }}>
                    {formatProxyNode(selectedLog.proxy) || "直连出口 (Direct)"}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">代理协议 / 层级:</Text>
                  <span>
                    <Tag color="purple">{getProxyType(selectedLog).toUpperCase()}</Tag>
                    <Tag color="cyan">{LEVEL_THEMES[selectedLog.level]?.label || selectedLog.level}</Tag>
                  </span>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">上游提供商:</Text>
                  <Tag color="blue">{selectedLog.provider || "全局/通用"}</Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">网络往返延迟 (Latency):</Text>
                  <span style={{ fontFamily: "monospace", fontWeight: 700, color: "#10b981" }}>
                    {selectedLog.latencyMs} ms
                  </span>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">目标 Target URL:</Text>
                  <Text code style={{ maxWidth: 440, fontSize: 11 }} ellipsis title={selectedLog.target}>
                    {selectedLog.target}
                  </Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">客户端来源 IP:</Text>
                  <span style={{ fontFamily: "monospace", color: "#34d399" }}>
                    {selectedLog.clientIp || selectedLog.ip || "127.0.0.1"}
                  </span>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">发生时间:</Text>
                  <span>{new Date(selectedLog.timestamp).toLocaleString()}</span>
                </Flex>
              </Space>
            </Card>

            {/* Error Message if any */}
            {selectedLog.errorMessage && (
              <Card size="small" title="代理异常诊断">
                <div style={{ color: "#ef4444", fontFamily: "monospace", fontSize: 12, wordBreak: "break-all" }}>
                  {selectedLog.errorMessage}
                </div>
              </Card>
            )}

            {/* Headers and Payloads */}
            <Tabs
              defaultActiveKey="raw"
              size="small"
              items={[
                {
                  key: "raw",
                  label: "原始事件 JSON",
                  children: (
                    <pre className={styles.jsonViewer}>
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  ),
                },
                ...(selectedLog.requestHeaders
                  ? [
                      {
                        key: "req_headers",
                        label: "请求头 (Headers)",
                        children: (
                          <pre className={styles.jsonViewer}>
                            {JSON.stringify(selectedLog.requestHeaders, null, 2)}
                          </pre>
                        ),
                      },
                    ]
                  : []),
                ...(selectedLog.responseHeaders
                  ? [
                      {
                        key: "resp_headers",
                        label: "响应头 (Headers)",
                        children: (
                          <pre className={styles.jsonViewer}>
                            {JSON.stringify(selectedLog.responseHeaders, null, 2)}
                          </pre>
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

export default ProxyLogsPage;
