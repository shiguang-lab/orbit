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
  contextCombosApi,
  COMPRESSION_ENGINE_CATALOG,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

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
  statBox: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  diffBox: {
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
  },
}));

const SAMPLE_CAVEMAN_INPUT = `你好！关于您刚刚询问的代码重构建议，经过我对整个项目代码库的深入仔细分析，我认为我们非常推荐您将当前的认证模块改为使用标准的 JWT 令牌校验机制，这样可以显著提升系统的安全性与整体性能。另外需要注意的是，相关的数据库迁移脚本也需要同步执行完毕。`;

export function CavemanContextPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const configQuery = useQuery({
    queryKey: ["compression-config"],
    queryFn: () => compressionApi.getConfig(),
  });

  const languagePacksQuery = useQuery({
    queryKey: ["compression-language-packs"],
    queryFn: () => contextCombosApi.getLanguagePacks(),
  });
  const telemetryQuery = useQuery({
    queryKey: ["compression-telemetry", "caveman"],
    queryFn: () => compressionApi.getTelemetry(),
    refetchInterval: 15000,
  });

  // Playground State
  const [sampleText, setSampleText] = useState(SAMPLE_CAVEMAN_INPUT);
  const [compressedResult, setCompressedResult] = useState<string | null>(null);
  const [previewStats, setPreviewStats] = useState<{ originalTokens: number; compressedTokens: number; savingsPct: number } | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (updated: any) => compressionApi.updateConfig(updated),
    onSuccess: () => {
      messageApi.success("Caveman 穴居人压缩配置已更新");
      void queryClient.invalidateQueries({ queryKey: ["compression-config"] });
    },
    onError: () => messageApi.error("保存配置失败"),
  });

  if (configQuery.isLoading || !configQuery.data) {
    return <PageSkeleton />;
  }

  const config = configQuery.data;
  const cavemanState = config.engines["caveman"] || { enabled: true, level: "full" };
  const meta = COMPRESSION_ENGINE_CATALOG["caveman"];

  const handleToggle = (checked: boolean) => {
    const updatedEngines = {
      ...config.engines,
      caveman: {
        ...(config.engines["caveman"] || {}),
        enabled: checked,
      },
    };
    updateMutation.mutate({ engines: updatedEngines });
  };

  const handleLevelChange = (level: string) => {
    const updatedEngines = {
      ...config.engines,
      caveman: {
        ...(config.engines["caveman"] || {}),
        enabled: true,
        level,
      },
    };
    updateMutation.mutate({ engines: updatedEngines });
  };

  const handleTestCompress = async () => {
    setIsCompressing(true);
    try {
      const result = await compressionApi.preview({
        messages: [{ role: "user", content: sampleText }],
        mode: "caveman",
        engineId: "caveman",
      });
      if (typeof result.compressed !== "string") throw new Error("runtime 未返回压缩文本");
      setCompressedResult(result.compressed);
      setPreviewStats({
        originalTokens: Number(result.originalTokens ?? 0),
        compressedTokens: Number(result.compressedTokens ?? 0),
        savingsPct: Number(result.savingsPct ?? 0),
      });
      messageApi.success("测试压缩完成");
    } catch (cause) {
      setCompressedResult(null);
      setPreviewStats(null);
      messageApi.error(`测试压缩失败：${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setIsCompressing(false);
    }
  };

  const origTokens = previewStats?.originalTokens;
  const compTokens = previewStats?.compressedTokens;
  const savingsPct = previewStats?.savingsPct;
  const telemetry = telemetryQuery.data;

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
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="compress" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {meta.label}
                </Title>
                <Tag color={cavemanState.enabled ? "success" : "default"}>
                  {cavemanState.enabled ? "● 算子运行中" : "已停用"}
                </Tag>
                <Tag color="orange">语义修剪 (Lossy)</Tag>
                <Tag color="blue">流水线优先级 #20</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {meta.description} 依据语法规则库提炼事实核心，剔除客套修饰与冗长转折，平均节省 30%~45% Token。
              </Text>
            </div>
          </Flex>

          <Flex align="center" gap={10}>
            <Text strong style={{ fontSize: 13 }}>启用算子:</Text>
            <Switch
              checked={cavemanState.enabled}
              loading={updateMutation.isPending}
              onChange={handleToggle}
            />
          </Flex>
        </Flex>
      </Card>

      {/* 2. Stat Cards */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>累计节省 Token</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              {telemetry ? telemetry.totalTokensSaved.toLocaleString() : "—"}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>处理请求 {telemetry ? telemetry.totalRuns.toLocaleString() : "—"} 次</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>平均压缩比例</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              —
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>语言语法特征模式</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>执行延迟开销</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              —
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>纯内存规则匹配机</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>缓存影响评级</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
              —
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>改写自然语言表述</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Core Engine Configuration */}
      <Card title="Caveman 核心参数与修剪强度" className={styles.sectionCard} size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>压缩强度档位 (Intensity)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    Lite：仅去客套；Full：事实提炼；Ultra：极端电报文模式
                  </div>
                </div>
                <Radio.Group
                  value={cavemanState.level || "full"}
                  onChange={(e) => handleLevelChange(e.target.value)}
                >
                  <Radio.Button value="lite">轻度 (Lite)</Radio.Button>
                  <Radio.Button value="full">标准 (Full)</Radio.Button>
                  <Radio.Button value="ultra">极限 (Ultra)</Radio.Button>
                </Radio.Group>
              </Flex>

              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>大模型回复端精简 (Output Mode)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    提示上游模型在生成回复时也采用极简无废话风格
                  </div>
                </div>
                <Switch
                  checked={config.cavemanOutputMode?.enabled ?? false}
                  onChange={(val) => {
                    updateMutation.mutate({
                      cavemanOutputMode: {
                        ...(config.cavemanOutputMode || { intensity: "full", autoClarity: true }),
                        enabled: val,
                      },
                    });
                  }}
                />
              </Flex>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 6 }}>
                活跃语言规则包 (Active Language Packs)
              </Text>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {(languagePacksQuery.data ?? []).map((pack) => (
                  <Tag key={pack.language} color="cyan" style={{ padding: "4px 8px", fontSize: 12 }}>
                    {pack.label || pack.language.toUpperCase()} · {pack.ruleCount} 规则
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 4. Interactive Live Playground */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={6}>
              <MaterialIcon name="play_arrow" size={16} />
              <span>实时交互式压缩演练区 (Live Playground & Diff Inspector)</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="bolt" size={14} />}
              loading={isCompressing}
              onClick={handleTestCompress}
            >
              执行测试压缩
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              输入原始文本 (Original Prompt Context):
            </Text>
            <Input.TextArea
              rows={5}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="输入待压缩文本..."
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
              预计 Token: {origTokens ?? "—"}
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>Caveman 压缩结果 (Compressed Output):</Text>
              {savingsPct !== undefined && savingsPct > 0 && (
                <Tag color="success">Token 缩减 {savingsPct}% ({origTokens} → {compTokens})</Tag>
              )}
            </Flex>
            <div className={styles.diffBox}>
              {compressedResult || "点击上方按钮执行真实压缩预览..."}
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default CavemanContextPage;
