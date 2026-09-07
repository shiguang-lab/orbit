import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Select,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
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
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

export function TranslatorPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const [messageApi, contextHolder] = message.useMessage();
  const [sourceFormat, setSourceFormat] = useState("openai");
  const [targetFormat, setTargetFormat] = useState("claude");
  const [inputPayload, setInputPayload] = useState(
    JSON.stringify(
      {
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a senior coding architect." },
          { role: "user", content: "Implement a rate-limiter in TypeScript." },
        ],
        temperature: 0.7,
      },
      null,
      2
    )
  );
  const [outputPayload, setOutputPayload] = useState("");

  const handleTranslate = () => {
    try {
      const parsed = JSON.parse(inputPayload);
      let converted: any = {};
      if (sourceFormat === "openai" && targetFormat === "claude") {
        const sysMsg = parsed.messages?.find((m: any) => m.role === "system")?.content || "";
        const userMsgs = (parsed.messages || []).filter((m: any) => m.role !== "system");
        converted = {
          model: "claude-3-5-sonnet-20241022",
          system: sysMsg,
          messages: userMsgs,
          max_tokens: 4096,
          temperature: parsed.temperature ?? 0.7,
        };
      } else {
        converted = {
          protocol: targetFormat,
          translated_from: sourceFormat,
          original: parsed,
        };
      }
      setOutputPayload(JSON.stringify(converted, null, 2));
      messageApi.success(tt("Payload 协议转换成功！", "Payload translated successfully!"));
    } catch {
      messageApi.error(tt("输入的 JSON 格式不合法", "Invalid JSON format"));
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
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="translate" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("协议与提示词转换器", "Protocol & Prompt Translator")}
                </Title>
                <Tag color="cyan">{tt("双向透明格式转译", "Bidirectional Translation")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "在 OpenAI / Anthropic Messages / Ollama / Gemini 等异构 LLM 协议之间双向转换请求与响应结构。",
                  "Translate requests and responses between OpenAI, Anthropic, Ollama, and Gemini protocols."
                )}
              </Text>
            </div>
          </Flex>

          <Button type="primary" icon={<MaterialIcon name="play_arrow" size={16} />} onClick={handleTranslate}>
            {tt("执行转换", "Translate")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Format Selectors */}
      <Flex gap={12} align="center">
        <span>{tt("源格式：", "Source:")}</span>
        <Select
          value={sourceFormat}
          onChange={setSourceFormat}
          style={{ width: 180 }}
          options={[
            { label: "OpenAI (/v1/chat)", value: "openai" },
            { label: "Anthropic (/v1/messages)", value: "claude" },
            { label: "Ollama (/api/chat)", value: "ollama" },
            { label: "Google Gemini", value: "gemini" },
          ]}
        />

        <MaterialIcon name="arrow_forward" size={18} style={{ color: "var(--ant-color-text-secondary)" }} />

        <span>{tt("目标格式：", "Target:")}</span>
        <Select
          value={targetFormat}
          onChange={setTargetFormat}
          style={{ width: 180 }}
          options={[
            { label: "Anthropic (/v1/messages)", value: "claude" },
            { label: "OpenAI (/v1/chat)", value: "openai" },
            { label: "Ollama (/api/chat)", value: "ollama" },
            { label: "Google Gemini", value: "gemini" },
          ]}
        />
      </Flex>

      {/* 3. Editors */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card title={tt("源输入 Payload", "Source JSON Payload")} className={styles.sectionCard} size="small">
            <Input.TextArea
              rows={16}
              value={inputPayload}
              onChange={(e) => setInputPayload(e.target.value)}
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={tt("转换后 Payload", "Target JSON Payload")} className={styles.sectionCard} size="small">
            <Input.TextArea
              rows={16}
              value={outputPayload}
              readOnly
              placeholder={tt("点击上方「执行转换」后在此查看转换结果...", "Click 'Translate' above to view translated payload...")}
              style={{ fontFamily: "monospace", fontSize: 12, background: "rgba(0,0,0,0.2)" }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default TranslatorPage;
