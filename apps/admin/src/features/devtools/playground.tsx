import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Select,
  Slider,
  Space,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 2,
    "&::-webkit-scrollbar": {
      width: 6,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: token.colorBorderSecondary,
      borderRadius: 3,
    },
  },
  headerCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  chatBox: {
    minHeight: 320,
    maxHeight: 460,
    overflowY: "auto",
    padding: "12px 14px",
    background: "rgba(0,0,0,0.25)",
    borderRadius: 8,
    border: "1px solid rgba(255,255,255,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  messageBubble: {
    padding: "10px 14px",
    borderRadius: 8,
    maxWidth: "85%",
    fontSize: 13,
    lineHeight: 1.5,
  },
}));

export function PlaygroundPage() {
  const { styles } = useStyles();
  const [model, setModel] = useState("claude-3-5-sonnet");
  const [temperature, setTemperature] = useState(0.7);
  const [maxTokens, setMaxTokens] = useState(2048);
  const [prompt, setPrompt] = useState("");
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; content: string }>>([
    { role: "assistant", content: "你好！我是智枢调试游乐场。你可以随时输入 Prompt 与任意挂载的上游模型进行实时推演对话。" },
  ]);

  const [loading, setLoading] = useState(false);

  const handleSend = () => {
    if (!prompt.trim()) return;
    const userMsg = prompt.trim();
    setPrompt("");
    setMessages((prev) => [...prev, { role: "user", content: userMsg }]);
    setLoading(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `【模型 ${model} 返回】响应已就绪。\n\n针对您的输入：「${userMsg}」，系统通过智枢透明网关完成路由转发，耗时 342ms，输入消耗 24 tokens，输出消耗 68 tokens。`,
        },
      ]);
      setLoading(false);
    }, 600);
  };

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
                background: "rgba(244, 63, 94, 0.12)",
                color: "#f43f5e",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="science" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  交互式多模型推演游乐场
                </Title>
                <Tag color="magenta">在线推演与提示词调试</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                直接选择 OpenAI、Claude、DeepSeek 或本地 Ollama 模型，实时调整温度系数与上下文限制进行推理测试。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Main Content */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={16}>
          <Card title="对话推演窗口" className={styles.sectionCard} size="small">
            <div className={styles.chatBox}>
              {messages.map((m, idx) => (
                <div
                  key={idx}
                  style={{
                    display: "flex",
                    justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  }}
                >
                  <div
                    className={styles.messageBubble}
                    style={{
                      background: m.role === "user" ? "rgba(99, 102, 241, 0.25)" : "rgba(255, 255, 255, 0.04)",
                      border: m.role === "user" ? "1px solid rgba(99, 102, 241, 0.4)" : "1px solid rgba(255, 255, 255, 0.08)",
                      color: m.role === "user" ? "#e0e7ff" : "#f3f4f6",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.45)", marginBottom: 4 }}>
                      {m.role === "user" ? "您" : `助手 (${model})`}
                    </div>
                    <div style={{ whiteSpace: "pre-wrap" }}>{m.content}</div>
                  </div>
                </div>
              ))}
            </div>

            <Flex gap={8} style={{ marginTop: 12 }}>
              <Input.TextArea
                rows={2}
                placeholder="输入测试 Prompt (按 Command+Enter 发送)..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    handleSend();
                  }
                }}
              />
              <Button
                type="primary"
                style={{ height: "auto" }}
                icon={<MaterialIcon name="send" size={18} />}
                loading={loading}
                onClick={handleSend}
              >
                发送
              </Button>
            </Flex>
          </Card>
        </Col>

        <Col xs={24} md={8}>
          <Card title="推理参数配置" className={styles.sectionCard} size="small">
            <Space orientation="vertical" size={14} style={{ width: "100%" }}>
              <div>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>目标模型：</Text>
                <Select
                  value={model}
                  onChange={setModel}
                  style={{ width: "100%" }}
                  options={[
                    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
                    { label: "DeepSeek-R1 (Reasoning)", value: "deepseek-reasoner" },
                    { label: "DeepSeek-V3", value: "deepseek-chat" },
                    { label: "GPT-4o (Omni)", value: "gpt-4o" },
                    { label: "Qwen 2.5 Coder 32B (Local)", value: "qwen-2.5-coder-32b" },
                  ]}
                />
              </div>

              <div>
                <Flex justify="space-between">
                  <Text strong style={{ fontSize: 12 }}>采样温度 (Temperature):</Text>
                  <span>{temperature}</span>
                </Flex>
                <Slider min={0} max={2} step={0.1} value={temperature} onChange={setTemperature} />
              </div>

              <div>
                <Flex justify="space-between">
                  <Text strong style={{ fontSize: 12 }}>最大生成 Token (Max Tokens):</Text>
                  <span>{maxTokens}</span>
                </Flex>
                <Slider min={256} max={8192} step={256} value={maxTokens} onChange={setMaxTokens} />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default PlaygroundPage;
