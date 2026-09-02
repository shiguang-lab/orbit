import { useState, useEffect, useRef } from "react";
import {
  Button,
  Card,
  Flex,
  Input,
  Select,
  Space,
  Switch,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { logsApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    minHeight: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
    flexShrink: 0,
  },
  terminalCard: {
    borderRadius: 12,
    background: "#09090b",
    border: "1px solid rgba(255, 255, 255, 0.12)",
    boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
    overflow: "hidden",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    minHeight: 0,
  },
  terminalHeader: {
    padding: "10px 16px",
    background: "#18181b",
    borderBottom: "1px solid rgba(255, 255, 255, 0.08)",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  terminalBody: {
    padding: "14px 16px",
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    fontSize: 12,
    lineHeight: 1.6,
    color: "#d4d4d8",
    flex: 1,
    overflowY: "auto",
  },
  logRow: {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    padding: "2px 0",
    "&:hover": {
      background: "rgba(255, 255, 255, 0.04)",
    },
  },
}));

const LEVEL_COLORS: Record<string, { color: string; bg: string }> = {
  debug: { color: "#9ca3af", bg: "rgba(156, 163, 175, 0.15)" },
  trace: { color: "#6b7280", bg: "rgba(107, 114, 128, 0.15)" },
  info: { color: "#38bdf8", bg: "rgba(56, 189, 248, 0.15)" },
  warn: { color: "#facc15", bg: "rgba(250, 204, 21, 0.15)" },
  error: { color: "#f87171", bg: "rgba(248, 113, 113, 0.15)" },
  fatal: { color: "#e879f9", bg: "rgba(232, 121, 249, 0.15)" },
};

export function ConsoleLogsPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [autoScroll, setAutoScroll] = useState<boolean>(true);
  const [polling, setPolling] = useState<boolean>(true);

  const scrollRef = useRef<HTMLDivElement>(null);

  const logsQuery = useQuery({
    queryKey: ["console-logs", levelFilter, search],
    queryFn: () =>
      logsApi.listConsoleLogs({
        level: levelFilter !== "all" ? levelFilter : undefined,
        search: search.trim() || undefined,
        limit: 500,
      }),
    staleTime: 3_000,
    refetchInterval: polling ? 3_000 : false,
  });

  const rawLogs = logsQuery.data ?? [];

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rawLogs, autoScroll]);

  const handleCopyLogs = () => {
    const text = rawLogs
      .map(
        (l) =>
          `[${l.timestamp}] [${l.level?.toUpperCase()}] ${l.component ? `[${l.component}] ` : ""}${
            l.message || l.msg || JSON.stringify(l)
          }`
      )
      .join("\n");
    navigator.clipboard.writeText(text);
    messageApi.success(`已复制 ${rawLogs.length} 条日志到剪贴板`);
  };

  if (logsQuery.isLoading && !logsQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Header */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(250, 204, 21, 0.12)",
                color: "#FACC15",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="terminal" size={22} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                控制台日志 (Console Logs)
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                实时终端日志输出流，展示服务端内核事件、路由调度日志与异常诊断
              </Text>
            </div>
          </Flex>

          <Space size={8} wrap>
            <Input.Search
              placeholder="搜索日志内容或模块..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ minWidth: 200, maxWidth: 320 }}
              allowClear
            />

            <Select
              value={levelFilter}
              onChange={setLevelFilter}
              style={{ minWidth: 130 }}
              options={[
                { label: "全部级别", value: "all" },
                { label: "INFO", value: "info" },
                { label: "WARN", value: "warn" },
                { label: "ERROR", value: "error" },
                { label: "DEBUG", value: "debug" },
              ]}
            />

            <Button icon={<MaterialIcon name="content_copy" size={15} />} onClick={handleCopyLogs}>
              复制全部
            </Button>

            <Button
              icon={<MaterialIcon name="refresh" size={15} />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ["console-logs"] })}
            >
              刷新
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* Terminal Viewer */}
      <div className={styles.terminalCard}>
        <div className={styles.terminalHeader}>
          <Flex align="center" gap={8}>
            <MaterialIcon name="terminal" size={16} style={{ color: "#FACC15" }} />
            <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.7)" }}>
              orbit.server.stdout
            </span>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)" }}>
              ({rawLogs.length} 条记录)
            </span>
          </Flex>

          <Space size={16}>
            <Flex align="center" gap={6}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>自动滚动到底部</span>
              <Switch size="small" checked={autoScroll} onChange={setAutoScroll} />
            </Flex>
            <Flex align="center" gap={6}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.6)" }}>实时轮询</span>
              <Switch size="small" checked={polling} onChange={setPolling} />
            </Flex>
          </Space>
        </div>

        <div className={styles.terminalBody} ref={scrollRef}>
          {rawLogs.length === 0 ? (
            <div style={{ color: "rgba(255,255,255,0.35)", padding: "40px 0", textAlign: "center" }}>
              暂无匹配的控制台日志
            </div>
          ) : (
            rawLogs.map((log, idx) => {
              const lvl = (log.level || "info").toLowerCase();
              const styling = LEVEL_COLORS[lvl] || LEVEL_COLORS.info;
              const content = log.message || log.msg || JSON.stringify(log);

              return (
                <div key={idx} className={styles.logRow}>
                  <span style={{ color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>
                    {log.timestamp ? new Date(log.timestamp).toLocaleTimeString() : "--:--:--"}
                  </span>
                  <span
                    style={{
                      color: styling.color,
                      background: styling.bg,
                      padding: "0 4px",
                      borderRadius: 3,
                      fontWeight: 700,
                      fontSize: 10,
                      flexShrink: 0,
                    }}
                  >
                    {lvl.toUpperCase()}
                  </span>
                  {log.component && (
                    <span style={{ color: "#a78bfa", flexShrink: 0 }}>
                      [{log.component}]
                    </span>
                  )}
                  <span style={{ wordBreak: "break-all" }}>{content}</span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export default ConsoleLogsPage;
