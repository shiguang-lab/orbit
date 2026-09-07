import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Select,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";
import { modelsApi, providersApi } from "@/entities/api";
import { useQuery } from "@tanstack/react-query";

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
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  terminal: {
    background: "#09090b",
    color: "#22c55e",
    borderRadius: 8,
    padding: "12px 16px",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.6,
    minHeight: 220,
    maxHeight: 380,
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.1)",
  },
}));

export function CliCodePage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const [messageApi, contextHolder] = message.useMessage();

  const [prompt, setPrompt] = useState("重构 src/auth 模块中的 JWT 校验逻辑");
  const [model, setModel] = useState("");
  const [executing, setExecuting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([]);

  const modelsQuery = useQuery({
    queryKey: ["models-catalog"],
    queryFn: modelsApi.list,
    staleTime: 30_000,
  });
  const models = modelsQuery.data?.models ?? [];
  const selectedModel = model || models[0]?.id || "";

  const handleRunCode = async () => {
    if (!selectedModel) {
      messageApi.error(tt("没有可用模型，请先配置 provider", "No model is available; configure a provider first"));
      return;
    }
    if (!prompt.trim()) {
      messageApi.error(tt("请输入代码任务", "Enter a coding task first"));
      return;
    }
    setExecuting(true);
    setTerminalLines([`$ local code-assistant --model ${selectedModel}`, `> ${prompt}`]);
    try {
      const response = await providersApi.chat({
        model: selectedModel,
        messages: [
          { role: "user", content: "Act as a coding assistant. Return an actionable patch or precise implementation guidance, and do not claim files were changed unless a tool actually changed them.\n\n" + prompt },
        ],
      });
      const choices = Array.isArray(response?.choices) ? response.choices : [];
      const content = choices[0]?.message?.content ?? response?.output_text ?? response?.content;
      if (typeof content !== "string" || !content.trim()) throw new Error("Provider returned no text");
      setTerminalLines((prev) => [...prev, content]);
      messageApi.success(tt("代码任务已由本地网关完成响应", "Coding task response received from the local gateway"));
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      setTerminalLines((prev) => [...prev, `ERROR: ${detail}`]);
      messageApi.error(tt("代码任务执行失败", "Coding task failed"));
    } finally {
      setExecuting(false);
    }
  };

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(250, 204, 21, 0.12)",
                color: "#facc15",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="terminal" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("命令行代码助手", "CLI Code Assistant")}
                </Title>
                <Tag color="gold">{tt("终端代码引擎", "Terminal Code Engine")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "直接通过智枢网关向本地及远程 CLI 命令行代码助手下发自然语言编程任务，自动应用上下文压缩与协议转换。",
                  "Dispatch natural-language programming tasks directly to local and remote CLI code agents with context compression and protocol translation."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="play_arrow" size={16} />}
            loading={executing}
            onClick={handleRunCode}
          >
            {tt("下发执行任务", "Dispatch Task")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Interactive Workspace */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={10}>
          <Card title={tt("代码指令与参数配置", "Task Instruction & Parameters")} className={styles.sectionCard} size="small">
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  {tt("选择代码调度模型：", "Select Coding Model:")}
                </Text>
                <Select
                  value={model}
                  onChange={setModel}
                  style={{ width: "100%" }}
                  loading={modelsQuery.isLoading}
                  options={models.map((item) => ({ label: item.name || item.id, value: item.id }))}
                />
              </div>

              <div>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  {tt("编程指令与任务描述：", "Instruction & Task Description:")}
                </Text>
                <Input.TextArea
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder={tt("例如：为用户注册接口添加邮箱格式校验与密码强度检测...", "e.g., Add email validation and password strength checks...")}
                />
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card title={tt("实时 CLI 终端输出流", "Live CLI Terminal Session")} className={styles.sectionCard} size="small">
            <pre className={styles.terminal}>
              {terminalLines.length === 0 ? <span style={{ color: "#a1a1aa" }}>{tt("尚未执行任务", "No task has been executed")}</span> : terminalLines.map((line, idx) => (
                <div key={idx} style={{ color: line.startsWith("✓") ? "#4ade80" : line.startsWith("$") ? "#facc15" : "#e4e4e7" }}>
                  {line}
                </div>
              ))}
            </pre>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CliCodePage;
