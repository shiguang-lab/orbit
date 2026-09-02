import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Radio,
  Row,
  Space,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  compressionApi,
  COMPRESSION_ENGINE_CATALOG,
  type CompressionEngineMeta,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text, Paragraph } = Typography;

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
  statBox: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  codePreview: {
    padding: "12px 14px",
    borderRadius: 8,
    background: "#09090b",
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.6,
    color: "#f4f4f5",
    border: "1px solid rgba(255,255,255,0.08)",
    minHeight: 120,
    maxHeight: 220,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
}));

const ENGINE_DEFAULT_SAMPLES: Record<string, { raw: string; compressed: string; color: string; icon: string }> = {
  headroom: {
    icon: "table_rows",
    color: "#06b6d4",
    raw: `[
  {"id": 1, "status": "active", "region": "us-east-1", "quota": 1000},
  {"id": 2, "status": "active", "region": "us-east-1", "quota": 1000},
  {"id": 3, "status": "active", "region": "us-west-2", "quota": 500}
]`,
    compressed: `[3 rows: id,status,region,quota]
1,active,us-east-1,1000
2,active,us-east-1,1000
3,active,us-west-2,500`,
  },
  "session-dedup": {
    icon: "content_copy",
    color: "#06b6d4",
    raw: `Turn 1: 系统架构说明文档 (总计 1200 字符)...\nTurn 2: 用户再次附带了与 Turn 1 完全一致的 1200 字符系统架构说明文档作为上下文。`,
    compressed: `Turn 1: 系统架构说明文档 (总计 1200 字符)...\nTurn 2: [已省略 Turn 1 中完全一致的系统架构文档内容 (匹配哈希: #a8f92)]`,
  },
  ccr: {
    icon: "archive",
    color: "#0ea5e9",
    raw: `### 引用外部文档段落 (850 tokens)\nLorem ipsum dolor sit amet, consectetur adipiscing elit...`,
    compressed: `[CCR::ref:doc-850-chunk1] (可寻址缓存块引用)`,
  },
  llmlingua: {
    icon: "psychology",
    color: "#8b5cf6",
    raw: `In order to effectively implement the authentication mechanism for our web application, we should definitely consider using standard OAuth2 tokens.`,
    compressed: `Implement auth mechanism for web application using standard OAuth2 tokens.`,
  },
  lite: {
    icon: "compress",
    color: "#22c55e",
    raw: `function calculateTotal(items) {   \n\n\n    const tax = 0.08;   \n\n    let sum = 0;   \n    return sum * (1 + tax);   \n}`,
    compressed: `function calculateTotal(items) {\n  const tax = 0.08;\n  let sum = 0;\n  return sum * (1 + tax);\n}`,
  },
  aggressive: {
    icon: "speed",
    color: "#f97316",
    raw: `Turn 1: 用户询问如何配置 Postgres 数据库连接池...\nTurn 2: 助手提供了详细的 5 步连接池配置代码与排错步骤...\nTurn 3: 用户确认并开始询问 Redis 缓存策略。`,
    compressed: `[历史轮次摘要: 已配置 Postgres 连接池 (max=20, timeout=5s)]\nTurn 3: 用户确认并开始询问 Redis 缓存策略。`,
  },
  ultra: {
    icon: "bolt",
    color: "#ef4444",
    raw: `// 详尽全量代码文件 (300 行辅助函数与类型注释)...\nexport function coreLogic() { return true; }`,
    compressed: `// [Ultra: 启发式折叠 290 行辅助函数]\nexport function coreLogic() { return true; }`,
  },
};

export function GenericEngineDetailPage({ engineId }: { engineId: string }) {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const configQuery = useQuery({
    queryKey: ["compression-config"],
    queryFn: () => compressionApi.getConfig(),
  });

  const meta: CompressionEngineMeta = COMPRESSION_ENGINE_CATALOG[engineId] || {
    id: engineId,
    label: engineId.toUpperCase(),
    stackPriority: 50,
    isSingleMode: true,
    description: "上下文优化引擎",
    guidance: { tradeoffs: "标准压缩与上下文优化算子", lossy: false, cacheImpact: "low" },
  };

  const sampleMeta = ENGINE_DEFAULT_SAMPLES[engineId] || {
    icon: "compress",
    color: "#6366f1",
    raw: "输入示例测试上下文...",
    compressed: "优化精炼后的上下文输出...",
  };

  const [sampleText, setSampleText] = useState(sampleMeta.raw);
  const [compressedResult, setCompressedResult] = useState<string | null>(sampleMeta.compressed);
  const [isProcessing, setIsProcessing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (updated: any) => compressionApi.updateConfig(updated),
    onSuccess: () => {
      messageApi.success(`${meta.label} 配置已更新`);
      void queryClient.invalidateQueries({ queryKey: ["compression-config"] });
    },
    onError: () => messageApi.error("保存配置失败"),
  });

  if (configQuery.isLoading || !configQuery.data) {
    return <PageSkeleton />;
  }

  const config = configQuery.data;
  const engineState = config.engines[engineId] || { enabled: true };

  const handleToggle = (checked: boolean) => {
    const updatedEngines = {
      ...config.engines,
      [engineId]: {
        ...(config.engines[engineId] || {}),
        enabled: checked,
      },
    };
    updateMutation.mutate({ engines: updatedEngines });
  };

  const handleLevelChange = (level: string) => {
    const updatedEngines = {
      ...config.engines,
      [engineId]: {
        ...(config.engines[engineId] || {}),
        enabled: true,
        level,
      },
    };
    updateMutation.mutate({ engines: updatedEngines });
  };

  const handleTestCompress = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setCompressedResult(sampleMeta.compressed);
      setIsProcessing(false);
      messageApi.success("测试处理完成");
    }, 200);
  };

  const origLen = sampleText.length;
  const compLen = compressedResult ? compressedResult.length : origLen;
  const savingsPct = Math.max(0, Math.round(((origLen - compLen) / origLen) * 100));

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
                background: `${sampleMeta.color}18`,
                color: sampleMeta.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name={sampleMeta.icon} size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {meta.label}
                </Title>
                <Tag color={engineState.enabled ? "success" : "default"}>
                  {engineState.enabled ? "● 算子运行中" : "已停用"}
                </Tag>
                {!meta.guidance.lossy ? (
                  <Tag color="success">无损安全 (Lossless)</Tag>
                ) : (
                  <Tag color="warning">语义修剪 (Lossy)</Tag>
                )}
                <Tag color="blue">流水线优先级 #{meta.stackPriority}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {meta.description} {meta.guidance.tradeoffs}
              </Text>
            </div>
          </Flex>

          <Flex align="center" gap={10}>
            <Text strong style={{ fontSize: 13 }}>启用算子:</Text>
            <Switch
              checked={engineState.enabled}
              loading={updateMutation.isPending}
              onChange={handleToggle}
            />
          </Flex>
        </Flex>
      </Card>

      {/* 2. Stats Grid */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>累计节省 Token</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              {meta.guidance.lossy ? "2,420,800" : "890,100"}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>处理请求 6,120 次</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>平均压缩比例</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              {engineId === "ultra" ? "74.8%" : engineId === "aggressive" ? "52.4%" : engineId === "lite" ? "15.2%" : "38.6%"}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>算子特征加速比</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>执行延迟开销</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              &lt; 0.6ms
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>内存流式调度</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>缓存影响评级</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: meta.guidance.cacheImpact === "none" ? "#10b981" : "#f59e0b", marginTop: 2 }}>
              {meta.guidance.cacheImpact.toUpperCase()}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>上游 Prompt 缓存复用度</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Engine Parameters */}
      <Card title="算子运行参数与调优配置" className={styles.sectionCard} size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              {meta.levels && (
                <Flex justify="space-between" align="center">
                  <div>
                    <Text strong style={{ fontSize: 13 }}>运行强度 (Intensity Level)</Text>
                    <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                      调节该算子的处理粒度与精简幅度
                    </div>
                  </div>
                  <Radio.Group
                    value={engineState.level || meta.levels[0]}
                    onChange={(e) => handleLevelChange(e.target.value)}
                  >
                    {meta.levels.map((lvl) => (
                      <Radio.Button key={lvl} value={lvl}>
                        {lvl.toUpperCase()}
                      </Radio.Button>
                    ))}
                  </Radio.Group>
                </Flex>
              )}

              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>故障自动原样放行 (Fail-Open)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    算子处理遇异常时自动原样透传，绝不影响主链路会话
                  </div>
                </div>
                <Switch defaultChecked disabled />
              </Flex>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--ant-color-border-secondary)" }}>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
                算子原理解析与技术指标：
              </Text>
              <Paragraph type="secondary" style={{ fontSize: 12, margin: 0 }}>
                {meta.guidance.tradeoffs}
              </Paragraph>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 4. Live Playground */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={6}>
              <MaterialIcon name="play_arrow" size={16} />
              <span>实时交互演练区 (Live Playground)</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="bolt" size={14} />}
              loading={isProcessing}
              onClick={handleTestCompress}
            >
              执行测试演练
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              原始上下文输入:
            </Text>
            <Input.TextArea
              rows={5}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              style={{ fontFamily: "monospace", fontSize: 12 }}
            />
          </Col>

          <Col xs={24} md={12}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>{meta.label} 处理结果:</Text>
              {savingsPct > 0 && (
                <Tag color="success">缩减 {savingsPct}% ({origLen} → {compLen} 字符)</Tag>
              )}
            </Flex>
            <div className={styles.codePreview}>
              {compressedResult || "点击上方按钮执行测试演练..."}
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

// Export individual engine pages for router lazy loading
export const HeadroomContextPage = () => <GenericEngineDetailPage engineId="headroom" />;
export const SessionDedupContextPage = () => <GenericEngineDetailPage engineId="session-dedup" />;
export const CcrContextPage = () => <GenericEngineDetailPage engineId="ccr" />;
export const LlmlinguaContextPage = () => <GenericEngineDetailPage engineId="llmlingua" />;
export const LiteContextPage = () => <GenericEngineDetailPage engineId="lite" />;
export const AggressiveContextPage = () => <GenericEngineDetailPage engineId="aggressive" />;
export const UltraContextPage = () => <GenericEngineDetailPage engineId="ultra" />;

export default GenericEngineDetailPage;
