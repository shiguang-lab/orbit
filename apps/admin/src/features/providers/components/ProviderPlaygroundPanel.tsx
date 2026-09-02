import { useState, useRef, useEffect } from "react";
import {
  Card,
  Tabs,
  Input,
  Select,
  Button,
  Space,
  Spin,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";
import { providersApi } from "@/entities/api";

const useStyles = createStyles(({ token }) => ({
  playgroundCard: {
    marginBottom: 0,
    borderRadius: token.borderRadiusLG,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  toolbarRow: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 14,
    padding: "10px 12px",
    background: token.colorFillAlter,
    borderRadius: token.borderRadius,
  },
  chatContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  messagesBox: {
    minHeight: 220,
    maxHeight: 460,
    overflowY: "auto",
    padding: 12,
    borderRadius: token.borderRadius,
    background: token.colorFillQuaternary,
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: "10px 14px",
    borderRadius: token.borderRadiusLG,
    fontSize: 13,
    lineHeight: 1.6,
    wordBreak: "break-word",
  },
  userBubble: {
    alignSelf: "flex-end",
    background: token.colorPrimary,
    color: "#fff",
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    alignSelf: "flex-start",
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    color: token.colorText,
    borderBottomLeftRadius: 2,
  },
  inputArea: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  statsRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  previewResult: {
    marginTop: 12,
    padding: 12,
    borderRadius: token.borderRadius,
    background: token.colorFillQuaternary,
    maxHeight: 380,
    overflowY: "auto",
    fontSize: 12,
    fontFamily: "monospace",
  },
}));

interface Props {
  providerId: string;
  providerDisplayAlias: string;
  serviceKinds?: string[];
  availableModels: Array<{ id: string; name?: string }>;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export function ProviderPlaygroundPanel({
  providerId,
  providerDisplayAlias,
  serviceKinds = ["llm"],
  availableModels = [],
}: Props) {
  const { styles } = useStyles();
  const { t } = useI18n();

  // Active Kind Tab
  const activeKinds = serviceKinds.length > 0 ? serviceKinds : ["llm"];
  const [activeKind, setActiveKind] = useState(activeKinds[0] || "llm");

  // Selected Model for playground
  const firstModelId = availableModels[0]?.id || "";
  const [selectedModel, setSelectedModel] = useState(firstModelId);

  useEffect(() => {
    if (!selectedModel && availableModels.length > 0) {
      setSelectedModel(availableModels[0].id);
    }
  }, [availableModels, selectedModel]);

  // LLM Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
  const [systemPrompt, setSystemPrompt] = useState("");
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);
  const [streaming, setStreaming] = useState(false);
  const [stats, setStats] = useState<{ latencyMs?: number; inTokens?: number; outTokens?: number } | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendChat = async () => {
    const text = inputText.trim();
    if (!text || streaming) return;

    const currentModel = selectedModel || firstModelId;
    if (!currentModel) {
      message.error(t("providers.selectModelFirst", "请先选择一个模型"));
      return;
    }

    const qualifiedModel = `${providerDisplayAlias}/${currentModel}`;
    const newMessages: ChatMessage[] = [
      ...(systemPrompt.trim() ? [{ role: "system" as const, content: systemPrompt.trim() }] : []),
      ...messages,
      { role: "user" as const, content: text },
    ];

    setMessages((prev) => [...prev, { role: "user", content: text }, { role: "assistant", content: "" }]);
    setInputText("");
    setStreaming(true);
    setStats(null);

    const startTime = performance.now();
    const abortController = new AbortController();
    abortControllerRef.current = abortController;

    try {
      const response = await fetch("/api/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: qualifiedModel,
          messages: newMessages,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || `Request failed with status ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No readable stream received");

      const decoder = new TextDecoder();
      let assistantResponse = "";
      let inTokens = 0;
      let outTokens = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data:")) continue;
          const dataStr = trimmed.slice(5).trim();
          if (dataStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(dataStr);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (typeof delta === "string") {
              assistantResponse += delta;
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last && last.role === "assistant") {
                  last.content = assistantResponse;
                }
                return next;
              });
            }
            if (parsed.usage) {
              inTokens = parsed.usage.prompt_tokens || inTokens;
              outTokens = parsed.usage.completion_tokens || outTokens;
            }
          } catch {
            // non-json sse line
          }
        }
      }

      const latencyMs = Math.round(performance.now() - startTime);
      setStats({ latencyMs, inTokens, outTokens });
    } catch (err: any) {
      if (err?.name === "AbortError") {
        message.info(t("common.stopped", "已停止生成"));
      } else {
        const errMsg = err?.message || String(err);
        message.error(errMsg);
        setMessages((prev) => {
          const next = [...prev];
          const last = next[next.length - 1];
          if (last && last.role === "assistant") {
            last.content += `\n\n[错误: ${errMsg}]`;
          }
          return next;
        });
      }
    } finally {
      setStreaming(false);
      abortControllerRef.current = null;
    }
  };

  const handleStopStream = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  };

  const handleClearChat = () => {
    handleStopStream();
    setMessages([]);
    setStats(null);
  };

  // Web Fetch State
  const [fetchUrl, setFetchUrl] = useState("https://example.com");
  const [fetchFormat, setFetchFormat] = useState("markdown");
  const [fetchResult, setFetchResult] = useState<string>("");
  const [fetching, setFetching] = useState(false);

  const handleRunFetch = async () => {
    if (!fetchUrl.trim()) return;
    setFetching(true);
    setFetchResult("");
    try {
      const res = await providersApi.webFetch({
        url: fetchUrl.trim(),
        provider: providerId,
        format: fetchFormat,
      });
      setFetchResult(JSON.stringify(res, null, 2));
    } catch (err: any) {
      setFetchResult(`Error: ${err?.message || String(err)}`);
    } finally {
      setFetching(false);
    }
  };

  // Web Search State
  const [searchQuery, setSearchQuery] = useState("OmniRoute AI Gateway");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const handleRunSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchResults([]);
    try {
      const res = await providersApi.webSearch({
        query: searchQuery.trim(),
        provider: providerId,
      });
      const list = Array.isArray((res as any)?.results)
        ? (res as any).results
        : Array.isArray((res as any)?.data)
        ? (res as any).data
        : [res];
      setSearchResults(list);
    } catch (err: any) {
      message.error(err?.message || "Search failed");
    } finally {
      setSearching(false);
    }
  };

  // Embeddings State
  const [embedText, setEmbedText] = useState("The quick brown fox jumps over the lazy dog");
  const [embedResult, setEmbedResult] = useState<any>(null);
  const [embeddingLoading, setEmbeddingLoading] = useState(false);

  const handleRunEmbed = async () => {
    if (!embedText.trim()) return;
    setEmbeddingLoading(true);
    setEmbedResult(null);
    try {
      const res = await providersApi.embeddings({
        model: `${providerDisplayAlias}/${selectedModel || firstModelId}`,
        input: embedText,
      });
      setEmbedResult(res);
    } catch (err: any) {
      message.error(err?.message || "Embedding failed");
    } finally {
      setEmbeddingLoading(false);
    }
  };

  // Build Tab Items
  const tabItems = [];

  if (activeKinds.includes("llm") || activeKinds.length === 0) {
    tabItems.push({
      key: "llm",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MaterialIcon name="chat" size={16} />
          LLM 对话
        </span>
      ),
      children: (
        <div className={styles.chatContainer}>
          <div className={styles.toolbarRow}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>模型:</span>
            <Select
              style={{ minWidth: 220 }}
              value={selectedModel || firstModelId}
              onChange={setSelectedModel}
              options={availableModels.map((m) => ({ label: m.name ? `${m.id} (${m.name})` : m.id, value: m.id }))}
            />

            <Button
              type={showSystemPrompt ? "primary" : "default"}
              onClick={() => setShowSystemPrompt(!showSystemPrompt)}
            >
              系统提示词
            </Button>

            <div style={{ marginInlineStart: "auto", display: "flex", gap: 8 }}>
              <Button onClick={handleClearChat}>
                清空对话
              </Button>
            </div>
          </div>

          {showSystemPrompt && (
            <Input.TextArea
              rows={2}
              placeholder="输入系统提示词 (System Prompt)..."
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              style={{ marginBottom: 10 }}
            />
          )}

          <div className={styles.messagesBox}>
            {messages.length === 0 ? (
              <div style={{ textAlign: "center", color: "#888", marginTop: 60 }}>
                <MaterialIcon name="forum" size={32} style={{ opacity: 0.5, marginBottom: 8 }} />
                <div>输入消息开始与模型对话测试</div>
              </div>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`${styles.messageBubble} ${
                    m.role === "user" ? styles.userBubble : styles.assistantBubble
                  }`}
                >
                  <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 2, fontWeight: 600 }}>
                    {m.role === "user" ? "User" : "Assistant"}
                  </div>
                  <div style={{ whiteSpace: "pre-wrap" }}>{m.content || (streaming && idx === messages.length - 1 ? <Spin size="small" /> : "")}</div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.inputArea}>
            <Input.TextArea
              rows={3}
              placeholder="输入消息 (Enter 发送, Shift+Enter 换行)..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSendChat();
                }
              }}
            />

            <div className={styles.statsRow}>
              <div>
                {stats && (
                  <span>
                    耗时: <b>{stats.latencyMs}ms</b>
                    {stats.inTokens ? ` | 输入: ${stats.inTokens} tokens` : ""}
                    {stats.outTokens ? ` | 输出: ${stats.outTokens} tokens` : ""}
                  </span>
                )}
              </div>

              <Space>
                {streaming ? (
                  <Button danger onClick={handleStopStream}>
                    停止
                  </Button>
                ) : (
                  <Button type="primary" onClick={handleSendChat}>
                    发送
                  </Button>
                )}
              </Space>
            </div>
          </div>
        </div>
      ),
    });
  }

  if (activeKinds.includes("webFetch")) {
    tabItems.push({
      key: "webFetch",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MaterialIcon name="language" size={16} />
          网页抓取
        </span>
      ),
      children: (
        <div>
          <div className={styles.toolbarRow}>
            <Input
              placeholder="https://..."
              value={fetchUrl}
              onChange={(e) => setFetchUrl(e.target.value)}
              style={{ flex: 1, minWidth: 240 }}
            />
            <Select
              value={fetchFormat}
              onChange={setFetchFormat}
              options={[
                { label: "Markdown 格式", value: "markdown" },
                { label: "HTML 源码", value: "html" },
                { label: "纯文本", value: "text" },
                { label: "提取链接", value: "links" },
              ]}
              style={{ width: 140 }}
            />
            <Button type="primary" loading={fetching} onClick={handleRunFetch}>
              抓取
            </Button>
          </div>
          {fetchResult && <pre className={styles.previewResult}>{fetchResult}</pre>}
        </div>
      ),
    });
  }

  if (activeKinds.includes("webSearch")) {
    tabItems.push({
      key: "webSearch",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MaterialIcon name="search" size={16} />
          网页搜索
        </span>
      ),
      children: (
        <div>
          <div className={styles.toolbarRow}>
            <Input
              placeholder="输入搜索关键词..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ flex: 1, minWidth: 240 }}
              onPressEnter={handleRunSearch}
            />
            <Button type="primary" loading={searching} onClick={handleRunSearch}>
              搜索
            </Button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
            {searchResults.map((item, idx) => (
              <Card key={idx} size="small" style={{ borderRadius: 6 }}>
                <a href={item.url} target="_blank" rel="noreferrer" style={{ fontWeight: 600 }}>
                  {item.title || item.url || `Result ${idx + 1}`}
                </a>
                <div style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                  {item.snippet || item.description || item.content}
                </div>
              </Card>
            ))}
          </div>
        </div>
      ),
    });
  }

  if (activeKinds.includes("embedding")) {
    tabItems.push({
      key: "embedding",
      label: (
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <MaterialIcon name="scatter_plot" size={16} />
          向量嵌入
        </span>
      ),
      children: (
        <div>
          <div className={styles.toolbarRow}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>模型:</span>
            <Select
              style={{ minWidth: 220 }}
              value={selectedModel || firstModelId}
              onChange={setSelectedModel}
              options={availableModels.map((m) => ({ label: m.name ? `${m.id} (${m.name})` : m.id, value: m.id }))}
            />
            <Button type="primary" loading={embeddingLoading} onClick={handleRunEmbed}>
              生成向量
            </Button>
          </div>
          <Input.TextArea
            rows={2}
            value={embedText}
            onChange={(e) => setEmbedText(e.target.value)}
            placeholder="输入文本生成嵌入向量..."
          />
          {embedResult && (
            <div className={styles.previewResult}>
              <pre>{JSON.stringify(embedResult, null, 2)}</pre>
            </div>
          )}
        </div>
      ),
    });
  }

  return (
    <Card className={styles.playgroundCard}>
      <div className={styles.headerTitle}>
        <MaterialIcon name="play_circle" size={20} style={{ color: "var(--ant-color-primary)" }} />
        <span>{t("providers.playgroundTitle", "演练场 (Playground)")}</span>
      </div>

      <Tabs activeKey={activeKind} onChange={setActiveKind} items={tabItems} />
    </Card>
  );
}
