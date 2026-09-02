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
  const [messageApi, contextHolder] = message.useMessage();

  const [prompt, setPrompt] = useState("重构 src/auth 模块中的 JWT 校验逻辑");
  const [model, setModel] = useState("claude-3-5-sonnet");
  const [executing, setExecuting] = useState(false);
  const [terminalLines, setTerminalLines] = useState<string[]>([
    "$ agy code --ready",
    "Orbit CLI Code Engine v2.4 initialized. Ready to execute code refactoring & generation tasks.",
  ]);

  const handleRunCode = () => {
    setExecuting(true);
    setTerminalLines((prev) => [
      ...prev,
      `\n$ agy code --model ${model} "${prompt}"`,
      `[Orbit] 路由至本地网关端点 -> 上游模型: ${model}`,
      `[Context] 已激活 RTK 终端过滤与 Caveman 压缩 (Token 节省 38%)`,
      `[Planner] 正在分析项目结构与依赖关系...`,
    ]);


    setTimeout(() => {
      setTerminalLines((prev) => [
        ...prev,
        `[Coder] 成功生成修改补丁: src/auth/jwt.ts (+24 lines, -8 lines)`,
        `[Verifier] TypeScript 语法检查通过: 0 错误, 0 警告`,
        `✓ 代码任务执行完成 (耗时 1.4s)`,
      ]);
      setExecuting(false);
      messageApi.success("CLI 代码任务执行完成！");
    }, 1200);
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
                  命令行代码助手
                </Title>
                <Tag color="gold">终端代码引擎</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                直接通过智枢网关向本地及远程 CLI 命令行代码助手下发自然语言编程任务，自动应用上下文压缩与协议转换。
              </Text>

            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="play_arrow" size={16} />}
            loading={executing}
            onClick={handleRunCode}
          >
            下发执行任务
          </Button>
        </Flex>
      </Card>

      {/* 2. Interactive Workspace */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={10}>
          <Card title="代码指令与参数配置" className={styles.sectionCard} size="small">
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <div>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  选择代码调度模型：
                </Text>
                <Select
                  value={model}
                  onChange={setModel}
                  style={{ width: "100%" }}
                  options={[
                    { label: "Claude 3.5 Sonnet (高智能架构师)", value: "claude-3-5-sonnet" },
                    { label: "DeepSeek-R1 (极速深度推理)", value: "deepseek-r1" },
                    { label: "Qwen 2.5 Coder 32B", value: "qwen-2.5-coder" },
                  ]}
                />
              </div>

              <div>
                <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                  编程指令与任务描述：
                </Text>
                <Input.TextArea
                  rows={5}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="例如：为用户注册接口添加邮箱格式校验与密码强度检测..."
                />
              </div>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={14}>
          <Card title="实时 CLI 终端输出流 (Terminal Session)" className={styles.sectionCard} size="small">
            <pre className={styles.terminal}>
              {terminalLines.map((line, idx) => (
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
