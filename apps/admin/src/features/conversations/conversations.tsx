import { useState, useMemo, useRef, useEffect } from "react";
import {
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  Empty,
  Flex,
  Input,
  Row,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  conversationsApi,
  logsApi,
  type ConversationSessionItem,
  type ConversationTurnItem,
  type RequestCallLog,
} from "@/entities/api";
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

function normalizeTurn(node: any): {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  text: string;
  blockKind: "text" | "tool_use" | "tool_result";
  toolName: string | null;
  toolInput?: unknown;
  timestamp?: string;
  seq?: number;
} {
  const role =
    node.role === "system" || node.role === "user" || node.role === "assistant"
      ? node.role
      : "tool";

  const blockKind = (node.blockKind as "text" | "tool_use" | "tool_result") || (node.role === "tool" ? "tool_result" : "text");
  const toolName = node.toolName || node.name || null;

  let text = node.textPreview ?? node.text ?? node.content ?? "";
  let toolInput: unknown = undefined;

  if (blockKind === "tool_use") {
    try {
      toolInput = typeof text === "string" ? JSON.parse(text) : text;
    } catch {
      toolInput = text;
    }
  }

  if (typeof text !== "string") {
    try {
      text = JSON.stringify(text, null, 2);
    } catch {
      text = String(text);
    }
  }

  return {
    id: String(node.id || `${role}-${Math.random()}`),
    role,
    text,
    blockKind,
    toolName,
    toolInput,
    timestamp: node.firstSeenAt || node.timestamp,
    seq: node.seq,
  };
}

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
  },
  sessionListCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    height: "calc(100vh - 180px)",
    minHeight: 560,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  sessionItem: {
    padding: "10px 12px",
    borderRadius: 8,
    cursor: "pointer",
    transition: "all 0.15s ease",
    border: "1px solid transparent",
    background: token.colorBgContainer,
    "&:hover": {
      background: "rgba(99, 102, 241, 0.06)",
    },
  },
  sessionItemActive: {
    background: "rgba(99, 102, 241, 0.12)",
    borderColor: token.colorPrimary,
  },
  chatCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    height: "calc(100vh - 180px)",
    minHeight: 560,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  chatHeader: {
    padding: "12px 16px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  chatBody: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    display: "flex",
    flexDirection: "column",
    gap: 14,
  },
  bubbleUser: {
    alignSelf: "flex-end",
    maxWidth: "80%",
    background: token.colorPrimary,
    color: "#fff",
    padding: "10px 14px",
    borderRadius: "14px 14px 2px 14px",
    fontSize: 13,
    lineHeight: 1.6,
    boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
  },
  bubbleAssistant: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    background: token.colorFillTertiary,
    border: `1px solid ${token.colorBorderSecondary}`,
    color: token.colorText,
    padding: "12px 16px",
    borderRadius: "14px 14px 14px 2px",
    fontSize: 13,
    lineHeight: 1.6,
  },
  bubbleTool: {
    alignSelf: "flex-start",
    maxWidth: "85%",
    background: "rgba(139, 92, 246, 0.08)",
    border: "1px solid rgba(139, 92, 246, 0.25)",
    padding: "10px 14px",
    borderRadius: 8,
    fontSize: 12,
    width: "100%",
  },
  bubbleSystem: {
    alignSelf: "center",
    maxWidth: "95%",
    background: "rgba(234, 179, 8, 0.08)",
    border: "1px solid rgba(234, 179, 8, 0.25)",
    padding: "8px 12px",
    borderRadius: 8,
    fontSize: 12,
    color: "#f59e0b",
  },
  jsonViewer: {
    background: "#09090b",
    color: "#f4f4f5",
    borderRadius: 6,
    padding: "10px 14px",
    fontFamily: "monospace",
    fontSize: 11,
    maxHeight: 280,
    overflowY: "auto",
    lineHeight: 1.4,
    margin: 0,
  },
}));

export function ConversationsPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const [search, setSearch] = useState("");
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [selectedLog, setSelectedLog] = useState<RequestCallLog | null>(null);

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Query Sessions List
  const sessionsQuery = useQuery({
    queryKey: ["conversations-list", search],
    queryFn: () => conversationsApi.list({ limit: 100, search: search.trim() || undefined }),
    refetchInterval: 5000,
  });

  const sessions: ConversationSessionItem[] = useMemo(() => {
    return sessionsQuery.data ?? [];
  }, [sessionsQuery.data]);

  // Active Selected Session
  const activeSession: ConversationSessionItem | null = useMemo(() => {
    if (!sessions.length) return null;
    if (selectedSessionId) {
      const found = sessions.find((s) => s.id === selectedSessionId);
      if (found) return found;
    }
    return sessions[0];
  }, [sessions, selectedSessionId]);

  const currentId = activeSession?.id;

  // Query Turns for Selected Session
  const turnsQuery = useQuery({
    queryKey: ["conversation-turns", currentId],
    queryFn: async () => {
      if (!currentId) return { nodes: [], hasMore: false };
      const res = await conversationsApi.getTurns(currentId, { limit: 50 });
      return res;
    },
    enabled: Boolean(currentId),
    refetchInterval: activeSession?.isActive ? 2000 : false,
  });

  const rawTurns: ConversationTurnItem[] = useMemo(() => {
    return turnsQuery.data?.nodes ?? [];
  }, [turnsQuery.data]);

  // Auto scroll on new turn
  useEffect(() => {
    if (rawTurns.length > 0) {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [rawTurns.length]);

  // View underlying request call log
  const handleOpenCallLog = async (logId: string) => {
    try {
      const log = await logsApi.getCallLogDetail(logId);
      if (log) {
        setSelectedLog(log);
      }
    } catch {
      messageApi.error("未能找到对应的请求审计明细");
    }
  };

  const handleCopyFullChat = () => {
    if (!rawTurns.length) return;
    const transcript = rawTurns
      .map((t) => {
        const norm = normalizeTurn(t);
        return `[${norm.role.toUpperCase()}] ${norm.timestamp ? `(${new Date(norm.timestamp).toLocaleTimeString()})` : ""}:\n${norm.text}`;
      })
      .join("\n\n---\n\n");
    void navigator.clipboard.writeText(transcript);
    messageApi.success("已复制全量会话对话流");
  };

  if (sessionsQuery.isLoading && !sessionsQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Header Control Bar */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(6, 182, 212, 0.12)",
                color: "#06b6d4",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="forum" size={22} />
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>
                会话对话流 (Conversations)
              </Text>
              <div style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                按客户端 SessionTag 还原端到端多轮交互上下文、工具调用链与思维推理
              </div>
            </div>
          </Flex>

          <Space wrap size={8}>
            <Tag color="cyan" style={{ margin: 0, fontFamily: "monospace" }}>
              共 {sessions.length} 个活跃会话
            </Tag>
            <Button
              icon={<MaterialIcon name="refresh" size={16} className={sessionsQuery.isFetching ? "spin" : ""} />}
              onClick={() => {
                void queryClient.invalidateQueries({ queryKey: ["conversations-list"] });
                void queryClient.invalidateQueries({ queryKey: ["conversation-turns"] });
              }}
            >
              刷新
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 2-Column Layout */}
      <Row gutter={[12, 12]} style={{ flex: 1, minHeight: 0 }}>
        {/* Left Column: Sessions List */}
        <Col xs={24} md={8} lg={7} style={{ height: "100%" }}>
          <Card className={styles.sessionListCard} styles={{ body: { padding: 10, height: "100%", display: "flex", flexDirection: "column" } }}>
            <div style={{ marginBottom: 10 }}>
              <Input.Search
                placeholder="搜索会话 ID 或模型..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                allowClear
                size="middle"
              />
            </div>

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6 }}>
              {sessions.length === 0 ? (
                <div style={{ padding: "40px 0", textAlign: "center" }}>
                  <Empty description="暂无符合条件的会话" />
                </div>
              ) : (
                sessions.map((sess) => {
                  const isSelected = activeSession?.id === sess.id;
                  const theme = PROVIDER_THEMES[sess.lastProvider?.toLowerCase() || ""] || {
                    bg: "#374151",
                    text: "#fff",
                    label: (sess.lastProvider || "-").toUpperCase(),
                  };
                  return (
                    <div
                      key={sess.id}
                      className={`${styles.sessionItem} ${isSelected ? styles.sessionItemActive : ""}`}
                      onClick={() => setSelectedSessionId(sess.id)}
                    >
                      <Flex justify="space-between" align="center">
                        <Text strong style={{ fontSize: 13, fontFamily: "monospace", color: isSelected ? "#818cf8" : undefined }} ellipsis title={sess.id}>
                          {sess.id}
                        </Text>
                        {sess.isActive && (
                          <span title="实时流式生成中">
                            <Badge status="processing" color="#f59e0b" />
                          </span>
                        )}
                      </Flex>

                      <Flex justify="space-between" align="center" style={{ marginTop: 6 }}>
                        <Space size={4}>
                          <Tag
                            style={{
                              backgroundColor: `${theme.bg}22`,
                              borderColor: `${theme.bg}40`,
                              color: theme.bg,
                              fontWeight: 700,
                              fontSize: 10,
                              margin: 0,
                            }}
                          >
                            {theme.label}
                          </Tag>
                          <Tag style={{ fontSize: 10, margin: 0, fontFamily: "monospace" }}>
                            {sess.turnCount} 轮
                          </Tag>
                        </Space>
                        <Text type="secondary" style={{ fontSize: 10, fontFamily: "monospace" }}>
                          {sess.lastSeenAt ? new Date(sess.lastSeenAt).toLocaleTimeString() : ""}
                        </Text>
                      </Flex>
                    </div>
                  );
                })
              )}
            </div>
          </Card>
        </Col>

        {/* Right Column: Chat Turns */}
        <Col xs={24} md={16} lg={17} style={{ height: "100%" }}>
          <Card className={styles.chatCard} styles={{ body: { padding: 0, height: "100%", display: "flex", flexDirection: "column" } }}>
            {/* Chat Top Banner */}
            <div className={styles.chatHeader}>
              <Flex justify="space-between" align="center" wrap gap={8}>
                <Flex align="center" gap={8}>
                  <Text strong style={{ fontSize: 14, fontFamily: "monospace" }}>
                    {activeSession?.id || "未选择会话"}
                  </Text>
                  {activeSession?.lastModel && (
                    <Tag color="cyan" style={{ margin: 0, fontFamily: "monospace" }}>
                      {activeSession.lastModel}
                    </Tag>
                  )}
                  {activeSession?.isActive && (
                    <Tag color="warning" icon={<MaterialIcon name="sync" size={12} className="spin" />} style={{ margin: 0 }}>
                      正在生成...
                    </Tag>
                  )}
                </Flex>

                <Space size={8}>
                  {activeSession?.lastCallLogId && (
                    <Button
                      size="small"
                      icon={<MaterialIcon name="receipt_long" size={14} />}
                      onClick={() => handleOpenCallLog(activeSession.lastCallLogId!)}
                    >
                      审计调用
                    </Button>
                  )}

                  {rawTurns.length > 0 && (
                    <Button
                      size="small"
                      icon={<MaterialIcon name="content_copy" size={14} />}
                      onClick={handleCopyFullChat}
                    >
                      复制对话
                    </Button>
                  )}
                </Space>
              </Flex>
            </div>

            {/* Chat Messages Body */}
            <div className={styles.chatBody}>
              {turnsQuery.isLoading ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Spin tip="正在拉取对话轮次..." />
                </div>
              ) : rawTurns.length === 0 ? (
                <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100%" }}>
                  <Empty description="该会话下暂无可展示的轮次数据" />
                </div>
              ) : (
                rawTurns.map((turn, idx) => {
                  const norm = normalizeTurn(turn);

                  if (norm.role === "system") {
                    return (
                      <div key={norm.id || idx} className={styles.bubbleSystem}>
                        <Flex align="center" gap={6} style={{ fontWeight: 700, marginBottom: 4 }}>
                          <MaterialIcon name="info" size={14} />
                          <span>SYSTEM PROMPT</span>
                        </Flex>
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{norm.text}</div>
                      </div>
                    );
                  }

                  if (norm.role === "user") {
                    return (
                      <div key={norm.id || idx} className={styles.bubbleUser}>
                        <Flex justify="space-between" align="center" style={{ fontSize: 10, opacity: 0.75, marginBottom: 4 }}>
                          <span>USER #{norm.seq ?? idx + 1}</span>
                          {norm.timestamp && <span>{new Date(norm.timestamp).toLocaleTimeString()}</span>}
                        </Flex>
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{norm.text}</div>
                      </div>
                    );
                  }

                  if (norm.blockKind === "tool_use" || norm.role === "tool") {
                    return (
                      <div key={norm.id || idx} className={styles.bubbleTool}>
                        <Flex justify="space-between" align="center" style={{ color: "#a855f7", fontWeight: 700, marginBottom: 6 }}>
                          <Flex align="center" gap={6}>
                            <MaterialIcon name="construction" size={14} />
                            <span>{norm.blockKind === "tool_use" ? `TOOL CALL: ${norm.toolName || "function"}` : "TOOL RESULT"}</span>
                          </Flex>
                          {norm.timestamp && <span style={{ fontSize: 10, opacity: 0.6 }}>{new Date(norm.timestamp).toLocaleTimeString()}</span>}
                        </Flex>
                        <pre className={styles.jsonViewer}>
                          {norm.toolInput ? JSON.stringify(norm.toolInput, null, 2) : norm.text}
                        </pre>
                      </div>
                    );
                  }

                  return (
                    <div key={norm.id || idx} className={styles.bubbleAssistant}>
                      <Flex justify="space-between" align="center" style={{ fontSize: 10, color: "#10b981", fontWeight: 700, marginBottom: 6 }}>
                        <Flex align="center" gap={6}>
                          <MaterialIcon name="smart_toy" size={14} />
                          <span>ASSISTANT #{norm.seq ?? idx + 1}</span>
                        </Flex>
                        {norm.timestamp && <span style={{ opacity: 0.6 }}>{new Date(norm.timestamp).toLocaleTimeString()}</span>}
                      </Flex>
                      <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{norm.text}</div>
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
          </Card>
        </Col>
      </Row>

      {/* Audit Detail Drawer */}
      <Drawer
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="receipt_long" size={20} />
            <span style={{ fontSize: 16, fontWeight: 700 }}>会话关联调用审计</span>
            {selectedLog && (
              <Tag color={(selectedLog.status ?? 200) < 400 ? "success" : "error"}>
                {selectedLog.status ?? 200}
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
            <Card size="small" title="元数据">
              <Space direction="vertical" size={6} style={{ width: "100%", fontSize: 13 }}>
                <Flex justify="space-between">
                  <Text type="secondary">请求 ID:</Text>
                  <Text code copyable>{selectedLog.id}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">模型:</Text>
                  <Text strong>{selectedLog.model || "-"}</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">提供商:</Text>
                  <Tag color="cyan">{selectedLog.provider || "-"}</Tag>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">耗时:</Text>
                  <Text>{selectedLog.durationMs ?? selectedLog.latencyMs ?? 0} ms</Text>
                </Flex>
                <Flex justify="space-between">
                  <Text type="secondary">Token (入/出):</Text>
                  <Text>{selectedLog.inputTokens ?? selectedLog.tokens?.in ?? 0} / {selectedLog.outputTokens ?? selectedLog.tokens?.out ?? 0}</Text>
                </Flex>
              </Space>
            </Card>

            <Tabs
              defaultActiveKey="raw"
              size="small"
              items={[
                {
                  key: "raw",
                  label: "原始日志 JSON",
                  children: (
                    <pre className={styles.jsonViewer}>
                      {JSON.stringify(selectedLog, null, 2)}
                    </pre>
                  ),
                },
                ...(selectedLog.requestBody
                  ? [
                      {
                        key: "req",
                        label: "请求载荷",
                        children: (
                          <pre className={styles.jsonViewer}>
                            {JSON.stringify(selectedLog.requestBody, null, 2)}
                          </pre>
                        ),
                      },
                    ]
                  : []),
                ...(selectedLog.responseBody
                  ? [
                      {
                        key: "resp",
                        label: "响应载荷",
                        children: (
                          <pre className={styles.jsonViewer}>
                            {JSON.stringify(selectedLog.responseBody, null, 2)}
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

export default ConversationsPage;
