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
import { COMPRESSION_ENGINE_CATALOG } from "@/entities/api";

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
  stepNode: {
    padding: "10px 14px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
    minWidth: 160,
  },
  consoleBox: {
    background: "#09090b",
    color: "#a1a1aa",
    borderRadius: 8,
    padding: "12px 16px",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.6,
    minHeight: 200,
    maxHeight: 340,
    overflowY: "auto",
    border: "1px solid rgba(255,255,255,0.1)",
  },
}));

export function CompressionStudioPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();

  const [testPrompt, setTestPrompt] = useState(
    `[System: You are an expert code architect]\n\n[User: 请帮我检查以下代码中的潜在并发安全隐患，并输出修改建议。]`
  );
  const [running, setRunning] = useState(false);
  const [pipelineLogs, setPipelineLogs] = useState<string[]>([
    "[Studio] 压缩工作室就绪。选择上游模型与测试 Prompt，点击【开始流水线执行重放】即可可视化观察每一阶算子的压缩收益。",
  ]);

  const handleRunReplay = () => {
    setRunning(true);
    setPipelineLogs(["[Studio] 启动实时压缩流水线仿真执行..."]);

    const steps = [
      { engine: "Session Dedup", delay: 200, log: "Step 1: Session Dedup (无损去重) -> 扫描历史轮次，命中 0 个跨轮次重复块，放行。" },
      { engine: "Lite", delay: 400, log: "Step 2: Lite (排版压缩) -> 清理冗余连续空行与首尾空白，Tokens: 142 -> 138 (节省 2.8%)。" },
      { engine: "RTK", delay: 650, log: "Step 3: RTK (终端与工具提炼) -> 扫描 Tool Call 块，未发现 ANSI 逃逸序列。" },
      { engine: "Caveman", delay: 900, log: "Step 4: Caveman (语法事实精炼) -> 提取修饰语，Tokens: 138 -> 92 (节省 33.3%)。" },
      { engine: "Complete", delay: 1100, log: "✓ 流水线执行完毕！端到端累计节省 35.2% Tokens，执行总耗时 1.2ms，安全性评分: 100/100。" },
    ];

    steps.forEach((s) => {
      setTimeout(() => {
        setPipelineLogs((prev) => [...prev, s.log]);
        if (s.engine === "Complete") {
          setRunning(false);
          messageApi.success("压缩工作室仿真执行完成！");
        }
      }, s.delay);
    });
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
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="monitoring" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  压缩工作室 (Compression Studio & Cockpit)
                </Title>
                <Tag color="purple">可视化算子流序诊断</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                全链路逐阶探查请求在流水线各算子（去重、RTK、Caveman、SLM）中的实时 Token 衰减、延迟开销与语义还原度。
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="play_arrow" size={16} />}
            loading={running}
            onClick={handleRunReplay}
          >
            开始流水线仿真重放
          </Button>
        </Flex>
      </Card>

      {/* 2. Visual Pipeline Flow Chart */}
      <Card title="当前调度流水线节点拓扑" className={styles.sectionCard} size="small">
        <Flex align="center" gap={12} wrap>
          {["session-dedup", "lite", "rtk", "caveman"].map((id, idx, arr) => {
            const m = COMPRESSION_ENGINE_CATALOG[id];
            return (
              <Flex key={id} align="center" gap={10}>
                <div className={styles.stepNode}>
                  <Flex justify="space-between" align="center">
                    <Tag style={{ margin: 0 }}>#{idx + 1}</Tag>
                    {!m.guidance.lossy ? <Tag color="green">无损</Tag> : <Tag color="orange">修剪</Tag>}
                  </Flex>
                  <Text strong style={{ display: "block", marginTop: 4, fontSize: 13 }}>{m.label.split(" ")[0]}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>{m.description.slice(0, 16)}...</Text>
                </div>
                {idx < arr.length - 1 && (
                  <MaterialIcon name="arrow_forward" size={18} style={{ color: "rgba(255,255,255,0.3)" }} />
                )}
              </Flex>
            );
          })}
        </Flex>
      </Card>

      {/* 3. Input Playground & Real-time Console */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card title="测试 Prompt 与目标模型" className={styles.sectionCard} size="small">
            <Space orientation="vertical" size={10} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <Text strong style={{ fontSize: 12 }}>选择目标上游模型：</Text>
                <Select
                  defaultValue="claude-3-5-sonnet"
                  size="small"
                  style={{ width: 220 }}
                  options={[
                    { label: "Claude 3.5 Sonnet (Direct)", value: "claude-3-5-sonnet" },
                    { label: "DeepSeek-R1 (Local Engine)", value: "deepseek-r1" },
                    { label: "GPT-4o (OpenAI)", value: "gpt-4o" },
                  ]}
                />
              </Flex>

              <Input.TextArea
                rows={7}
                value={testPrompt}
                onChange={(e) => setTestPrompt(e.target.value)}
                placeholder="输入待诊断 Prompt..."
              />
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="逐阶流序执行诊断日志 (Waterfall Execution Logs)" className={styles.sectionCard} size="small">
            <div className={styles.consoleBox}>
              {pipelineLogs.map((log, i) => (
                <div key={i} style={{ marginBottom: 4, color: log.startsWith("✓") ? "#22c55e" : log.startsWith("Step") ? "#38bdf8" : "#a1a1aa" }}>
                  {log}
                </div>
              ))}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CompressionStudioPage;
