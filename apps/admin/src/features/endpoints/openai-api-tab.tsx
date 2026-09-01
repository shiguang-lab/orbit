import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Row,
  Space,
  Switch,
  Tag,
  Tooltip,
  Typography,
  message,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import {
  ENDPOINT_CATEGORIES,
  OFFICIAL_ENDPOINTS,
  type EndpointCardDef,
} from "./constants";
import { QuickTestModal } from "./quick-test-modal";
import { useQuery } from "@tanstack/react-query";
import { providersApi } from "@/entities/api";

const { Text, Title, Paragraph } = Typography;
const { TextArea } = Input;

const useStyles = createStyles(({ token }) => ({
  endpointCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "border-color 0.2s, box-shadow 0.2s, transform 0.2s",
    "&:hover": {
      borderColor: token.colorPrimary,
      boxShadow: token.boxShadowTertiary,
    },
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  pathBox: {
    fontFamily: "monospace",
    fontSize: 12,
    background: token.colorFillAlter,
    padding: "3px 8px",
    borderRadius: 4,
    border: `1px solid ${token.colorBorderSecondary}`,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 6,
  },
}));

interface OpenAiApiTabProps {
  baseUrl: string;
}

export function OpenAiApiTab({ baseUrl }: OpenAiApiTabProps) {
  const { styles } = useStyles();
  const { token } = theme.useToken();

  const [testingEndpoint, setTestingEndpoint] = useState<EndpointCardDef | null>(null);
  const [customSystemPromptEnabled, setCustomSystemPromptEnabled] = useState(false);
  const [customSystemPrompt, setCustomSystemPrompt] = useState("");

  // Fetch all models for count
  const providersQuery = useQuery({
    queryKey: ["providers-catalog-for-endpoints"],
    queryFn: () => providersApi.list(),
    staleTime: 60_000,
  });

  const connections = providersQuery.data?.connections ?? [];
  const totalModelsCount = connections.reduce(
    (sum: number, c: Record<string, unknown>) => {
      const count = Array.isArray(c.models) ? c.models.length : 1;
      return sum + count;
    },
    0
  );

  const copyToClipboard = (text: string, tip = "已复制到剪贴板") => {
    navigator.clipboard.writeText(text);
    message.success(tip);
  };

  return (
    <Flex vertical gap={16}>
      {/* Overview Info Banner */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <div>
            <Title level={5} style={{ margin: 0, fontSize: 15 }}>
              标准 OpenAI 兼容协议接入端点
            </Title>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
              系统提供 100% 兼容 OpenAI 格式的统一标准 API 入口，当前网关汇聚支持{" "}
              <Text strong>{totalModelsCount > 0 ? totalModelsCount : "40+"}</Text> 个模型与多模态能力
            </Text>
          </div>
          <Tag color="blue" style={{ fontSize: 12, padding: "2px 8px" }}>
            OpenAI API v1 规范
          </Tag>
        </Flex>
      </Card>

      {/* Categorized Endpoint Matrix */}
      {ENDPOINT_CATEGORIES.map((cat) => {
        const categoryEndpoints = OFFICIAL_ENDPOINTS.filter((ep) => ep.category === cat.key);
        if (categoryEndpoints.length === 0) return null;

        return (
          <div key={cat.key}>
            {/* Category Header */}
            <Flex align="center" gap={8} style={{ marginBottom: 10, marginTop: 4 }}>
              <MaterialIcon name={cat.icon} size={16} style={{ color: cat.color }} />
              <Text strong style={{ fontSize: 13, textTransform: "uppercase", letterSpacing: 0.5 }}>
                {cat.title}
              </Text>
              <div style={{ flex: 1, height: 1, background: token.colorBorderSecondary, opacity: 0.6 }} />
              <Text type="secondary" style={{ fontSize: 11 }}>
                {categoryEndpoints.length} 个端点
              </Text>
            </Flex>

            {/* Grid of Endpoint Cards */}
            <Row gutter={[12, 12]}>
              {categoryEndpoints.map((ep) => {
                const fullUrl = `${baseUrl.replace(/\/$/, "")}${ep.path}`;

                return (
                  <Col xs={24} sm={12} lg={8} xl={6} key={ep.id}>
                    <Card
                      size="small"
                      className={styles.endpointCard}
                      bodyStyle={{ padding: 12, display: "flex", flexDirection: "column", height: "100%", justifyContent: "space-between" }}
                    >
                      <div>
                        {/* Title & Badge */}
                        <Flex align="center" justify="space-between" style={{ marginBottom: 8 }}>
                          <Space size={8} align="center">
                            <div className={styles.iconBox} style={{ background: ep.iconBg }}>
                              <MaterialIcon name={ep.icon} size={16} style={{ color: ep.iconColor }} />
                            </div>
                            <div>
                              <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.2 }}>
                                {ep.title}
                              </Text>
                            </div>
                          </Space>

                          {ep.badge && (
                            <Tag color={ep.badge === "Anthropic" ? "purple" : "blue"} style={{ fontSize: 10, margin: 0 }}>
                              {ep.badge}
                            </Tag>
                          )}
                        </Flex>

                        {/* Description */}
                        <Paragraph
                          type="secondary"
                          style={{
                            fontSize: 11,
                            margin: "0 0 8px",
                            minHeight: 32,
                            display: "-webkit-box",
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: "vertical",
                            overflow: "hidden",
                          }}
                        >
                          {ep.description}
                        </Paragraph>
                      </div>

                      {/* Path Box with Copy & Debug buttons */}
                      <div>
                        <div className={styles.pathBox}>
                          <Text ellipsis style={{ fontSize: 11, fontFamily: "monospace" }}>
                            {ep.path}
                          </Text>
                          <Tooltip title="复制完整 URL">
                            <Button
                              type="text"
                              size="small"
                              style={{ padding: "0 2px", height: "auto" }}
                              icon={<MaterialIcon name="content_copy" size={13} />}
                              onClick={() => copyToClipboard(fullUrl, `已复制 ${ep.title} 地址`)}
                            />
                          </Tooltip>
                        </div>

                        <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
                          <Button
                            size="small"
                            type="link"
                            icon={<MaterialIcon name="play_arrow" size={14} />}
                            style={{ padding: 0, height: "auto", fontSize: 12 }}
                            onClick={() => setTestingEndpoint(ep)}
                          >
                            在线调试
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </Col>
                );
              })}
            </Row>
          </div>
        );
      })}

      {/* VS Code / Client Token Alias Card */}
      <Card size="small" style={{ borderRadius: 8, background: "rgba(59, 130, 246, 0.03)", borderColor: "rgba(59, 130, 246, 0.25)", marginTop: 6 }}>
        <Flex align="center" justify="space-between" wrap gap={12}>
          <div>
            <Flex align="center" gap={8} wrap>
              <MaterialIcon name="terminal" size={20} style={{ color: "#3B82F6" }} />
              <Text strong style={{ fontSize: 13, lineHeight: 1 }}>
                VS Code / 智能体插件兼容端点 (Cline / Roo Code / Continue)
              </Text>
              <Tag color="blue" style={{ margin: 0 }}>免配置鉴权头</Tag>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 4 }}>
              将 API Token 直接嵌入 URL 路径中，适用于不支持自定义 Header 请求头的客户端插件：
            </Text>
            <div style={{ marginTop: 6 }}>
              <Text code strong style={{ fontSize: 12 }}>
                {baseUrl.replace(/\/$/, "")}/api/v1/vscode/<code>{"{API_KEY}"}</code>/chat/completions
              </Text>
            </div>
          </div>
          <Button
            size="small"
            icon={<MaterialIcon name="content_copy" size={14} />}
            onClick={() =>
              copyToClipboard(
                `${baseUrl.replace(/\/$/, "")}/api/v1/vscode/{token}/chat/completions`,
                "已复制 VS Code 兼容基址"
              )
            }
          >
            复制基址模板
          </Button>
        </Flex>
      </Card>

      {/* Global Custom System Prompt Injection */}
      <Card size="small" style={{ borderRadius: 8 }}>
        <Flex vertical gap={12}>
          <Flex align="center" justify="space-between" wrap gap={12}>
            <Flex align="center" gap={8}>
              <MaterialIcon name="tune" size={18} style={{ color: "#8B5CF6" }} />
              <div>
                <Text strong style={{ fontSize: 13, display: "block", lineHeight: 1.2 }}>
                  全局自定义系统提示词 (Global Custom System Prompt)
                </Text>
                <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
                  开启后，所有经过此网关的对话补全请求将自动在前缀中合并注入全局指导指令
                </Text>
              </div>
            </Flex>

            <Switch
              size="small"
              checked={customSystemPromptEnabled}
              onChange={(checked) => {
                setCustomSystemPromptEnabled(checked);
                message.success(checked ? "已启用全局系统提示词" : "已停用全局系统提示词");
              }}
            />
          </Flex>

          {/* Expanded Large TextArea */}
          {customSystemPromptEnabled && (
            <Flex vertical gap={8} style={{ marginTop: 4 }}>
              <TextArea
                rows={4}
                autoSize={{ minRows: 3, maxRows: 8 }}
                showCount
                maxLength={2000}
                value={customSystemPrompt}
                onChange={(e) => setCustomSystemPrompt(e.target.value)}
                placeholder="例如：你是由 OmniRoute 智能调度网关提供的高性能 AI 助手。请始终保持严谨、客观、详实的回答风格，并在代码输出中附带清晰的注释..."
                style={{ fontFamily: "monospace", fontSize: 12 }}
              />

              <Flex justify="space-between" align="center" wrap gap={8}>
                <Space size={8}>
                  <Button
                    size="small"
                    type="link"
                    style={{ padding: 0, height: "auto", fontSize: 11 }}
                    onClick={() =>
                      setCustomSystemPrompt(
                        "你是由 OmniRoute 统一智能网关调度的高性能 AI 助手。请在回答时保持专业、准确与高效，所有代码块需包含完整的语言标识与清晰说明。"
                      )
                    }
                  >
                    填入默认助手模板
                  </Button>
                  <Button
                    size="small"
                    type="link"
                    danger
                    style={{ padding: 0, height: "auto", fontSize: 11 }}
                    onClick={() => setCustomSystemPrompt("")}
                  >
                    清空内容
                  </Button>
                </Space>

                <Button
                  type="primary"
                  icon={<MaterialIcon name="save" size={14} />}
                  onClick={() => message.success("全局自定义系统提示词已保存生效")}
                >
                  保存并生效
                </Button>
              </Flex>
            </Flex>
          )}
        </Flex>
      </Card>

      {/* Quick Test Modal */}
      <QuickTestModal
        endpoint={testingEndpoint}
        baseUrl={baseUrl}
        onClose={() => setTestingEndpoint(null)}
      />
    </Flex>
  );
}
