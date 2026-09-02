import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Radio,
  Row,
  Select,
  Slider,
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
  type CompressionConfig,
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
  telemetryMetric: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  engineRow: {
    padding: "12px 14px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.01)",
    border: `1px solid ${token.colorBorderSecondary}`,
    transition: "all 0.2s ease",
    "&:hover": {
      background: "rgba(255,255,255,0.03)",
      borderColor: token.colorPrimaryBorder,
    },
  },
}));

export function CompressionSettingsPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  // Load config & telemetry
  const configQuery = useQuery({
    queryKey: ["compression-config"],
    queryFn: () => compressionApi.getConfig(),
  });

  const telemetryQuery = useQuery({
    queryKey: ["compression-telemetry"],
    queryFn: () => compressionApi.getTelemetry(),
    refetchInterval: 10000,
  });

  const [localConfig, setLocalConfig] = useState<CompressionConfig | null>(null);
  const [expandedGuidance, setExpandedGuidance] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (configQuery.data) {
      setLocalConfig(configQuery.data);
    }
  }, [configQuery.data]);

  const updateMutation = useMutation({
    mutationFn: (updated: Partial<CompressionConfig>) => compressionApi.updateConfig(updated),
    onSuccess: () => {
      messageApi.success("压缩配置已保存并热重载生效");
      void queryClient.invalidateQueries({ queryKey: ["compression-config"] });
    },
    onError: () => messageApi.error("保存压缩配置失败"),
  });

  if (configQuery.isLoading || !localConfig) {
    return <PageSkeleton />;
  }

  const telemetry = telemetryQuery.data;

  const handleToggleGlobal = (checked: boolean) => {
    const next = { ...localConfig, enabled: checked };
    setLocalConfig(next);
    updateMutation.mutate({ enabled: checked });
  };

  const handleEngineToggle = (engineId: string, enabled: boolean) => {
    const currentEngines = { ...localConfig.engines };
    currentEngines[engineId] = {
      ...(currentEngines[engineId] || {}),
      enabled,
    };
    const next = { ...localConfig, engines: currentEngines };
    setLocalConfig(next);
    updateMutation.mutate({ engines: currentEngines });
  };

  const handleEngineLevelChange = (engineId: string, level: string) => {
    const currentEngines = { ...localConfig.engines };
    currentEngines[engineId] = {
      ...(currentEngines[engineId] || {}),
      enabled: currentEngines[engineId]?.enabled ?? true,
      level,
    };
    const next = { ...localConfig, engines: currentEngines };
    setLocalConfig(next);
    updateMutation.mutate({ engines: currentEngines });
  };

  const toggleGuidance = (id: string) => {
    setExpandedGuidance((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const sortedEngines: CompressionEngineMeta[] = Object.values(COMPRESSION_ENGINE_CATALOG).sort(
    (a, b) => a.stackPriority - b.stackPriority
  );

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
                background: "rgba(249, 115, 22, 0.12)",
                color: "#f97316",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="tune" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  上下文压缩引擎全局配置
                </Title>
                <Tag color={localConfig.enabled ? "success" : "default"}>
                  {localConfig.enabled ? "● 压缩引擎运行中" : "已停用"}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                全局调度上下文多阶压缩引擎（去重、RTK 过滤、Caveman 自然语言修剪与 SLM 剪枝），大幅降低上游 API Token 开销。
              </Text>
            </div>
          </Flex>

          <Flex align="center" gap={12}>
            <Text strong style={{ fontSize: 13 }}>全局总开关:</Text>
            <Switch
              checked={localConfig.enabled}
              loading={updateMutation.isPending}
              onChange={handleToggleGlobal}
            />
          </Flex>
        </Flex>
      </Card>

      {/* 2. Telemetry Summary Cards */}
      {telemetry && (
        <Row gutter={[10, 10]}>
          <Col xs={24} sm={12} md={6}>
            <div className={styles.telemetryMetric}>
              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>累计节省 Token</Text>
                <MaterialIcon name="savings" size={18} style={{ color: "#10b981" }} />
              </Flex>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10b981", marginTop: 4 }}>
                {(telemetry.totalTokensSaved / 1000).toFixed(1)}k
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                已处理 {telemetry.totalRuns.toLocaleString()} 次对话请求
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.telemetryMetric}>
              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>平均压缩率</Text>
                <MaterialIcon name="speed" size={18} style={{ color: "#6366f1" }} />
              </Flex>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#6366f1", marginTop: 4 }}>
                38.4%
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                端到端请求加速比提升 1.42x
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.telemetryMetric}>
              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>生效输出样式次数</Text>
                <MaterialIcon name="auto_fix_high" size={18} style={{ color: "#06b6d4" }} />
              </Flex>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#06b6d4", marginTop: 4 }}>
                {telemetry.runsWithStyles.toLocaleString()}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                旁路直通: {telemetry.bypassCount} 次
              </Text>
            </div>
          </Col>

          <Col xs={24} sm={12} md={6}>
            <div className={styles.telemetryMetric}>
              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>活跃引擎分布</Text>
                <MaterialIcon name="pie_chart" size={18} style={{ color: "#f59e0b" }} />
              </Flex>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                {Object.entries(telemetry?.appliedStyleCounts || {}).slice(0, 3).map(([k, v]) => (
                  <Tag key={k} color="orange" style={{ margin: 0, fontSize: 10 }}>
                    {k}: {v}
                  </Tag>
                ))}
              </div>
            </div>
          </Col>
        </Row>
      )}

      {/* 3. General Trigger Threshold & Strategy Settings */}
      <Card title="全局触发阈值与系统提示词策略" className={styles.sectionCard} size="small">
        <Row gutter={[20, 16]}>
          <Col xs={24} md={12}>
            <div>
              <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                <Text strong style={{ fontSize: 13 }}>自动触发 Token 阈值 (Auto-Trigger Tokens)</Text>
                <Tag color="blue">{localConfig.autoTriggerTokens} Tokens</Tag>
              </Flex>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                仅当客户端发送的 Prompt 上下文长度超过该阈值时才激活多阶压缩管道（设为 0 表示对所有请求无条件压缩）。
              </Paragraph>
              <Slider
                min={0}
                max={16384}
                step={256}
                value={localConfig.autoTriggerTokens}
                onChange={(val) => {
                  const next = { ...localConfig, autoTriggerTokens: val };
                  setLocalConfig(next);
                }}
                onChangeComplete={(val) => updateMutation.mutate({ autoTriggerTokens: val })}
              />
            </div>
          </Col>

          <Col xs={24} md={12}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                System Prompt 系统提示词保护模式
              </Text>
              <Paragraph type="secondary" style={{ fontSize: 12, marginBottom: 8 }}>
                控制网关在执行压缩时是否跳过 System Prompt，防止核心角色与工具 Schema 设定发生偏差。
              </Paragraph>
              <Radio.Group
                value={localConfig.preserveSystemPromptMode || (localConfig.preserveSystemPrompt ? "always" : "never")}
                onChange={(e) => {
                  const mode = e.target.value as "always" | "whenNoCache" | "never";
                  const next = {
                    ...localConfig,
                    preserveSystemPromptMode: mode,
                    preserveSystemPrompt: mode !== "never",
                  };
                  setLocalConfig(next);
                  updateMutation.mutate({
                    preserveSystemPromptMode: mode,
                    preserveSystemPrompt: mode !== "never",
                  });
                }}
              >
                <Radio.Button value="always">始终保护 (推荐)</Radio.Button>
                <Radio.Button value="whenNoCache">无缓存时保护</Radio.Button>
                <Radio.Button value="never">允许压缩</Radio.Button>
              </Radio.Group>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 4. Engine Catalog Grid */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={6}>
              <MaterialIcon name="view_cozy" size={18} />
              <span>多阶压缩引擎流水线配置 (Engine Pipeline Matrix)</span>
            </Flex>
            <Text type="secondary" style={{ fontSize: 12, fontWeight: "normal" }}>
              按流水线优先级由上至下依序执行
            </Text>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Space orientation="vertical" size={10} style={{ width: "100%" }}>
          {sortedEngines.map((meta) => {
            const engineState = localConfig.engines[meta.id] || { enabled: false };
            const isExpanded = Boolean(expandedGuidance[meta.id]);

            return (
              <div key={meta.id} className={styles.engineRow}>
                <Flex justify="space-between" align="center" wrap gap={12}>
                  {/* Left: Priority & Name & Badges */}
                  <Flex align="center" gap={12}>
                    <Tag style={{ margin: 0, fontFamily: "monospace", fontSize: 11 }}>
                      #{meta.stackPriority}
                    </Tag>
                    <div>
                      <Flex align="center" gap={8}>
                        <Text strong style={{ fontSize: 13 }}>{meta.label}</Text>
                        {!meta.guidance.lossy ? (
                          <Tag color="success" style={{ margin: 0, fontSize: 10 }}>无损安全 (Lossless)</Tag>
                        ) : (
                          <Tag color="warning" style={{ margin: 0, fontSize: 10 }}>语义修剪 (Lossy)</Tag>
                        )}
                        <Tag
                          color={
                            meta.guidance.cacheImpact === "none"
                              ? "green"
                              : meta.guidance.cacheImpact === "low"
                              ? "cyan"
                              : meta.guidance.cacheImpact === "moderate"
                              ? "orange"
                              : "red"
                          }
                          style={{ margin: 0, fontSize: 10 }}
                        >
                          缓存影响: {meta.guidance.cacheImpact.toUpperCase()}
                        </Tag>
                      </Flex>
                      <Text type="secondary" style={{ fontSize: 12, display: "block", marginTop: 2 }}>
                        {meta.description}
                      </Text>
                    </div>
                  </Flex>

                  {/* Right: Intensity selector & Switch & Guidance trigger */}
                  <Flex align="center" gap={10}>
                    {meta.levels && (
                      <Select
                        size="small"
                        value={engineState.level || meta.levels[0]}
                        onChange={(val) => handleEngineLevelChange(meta.id, val)}
                        style={{ width: 110 }}
                        options={meta.levels.map((lvl) => ({
                          label: lvl.toUpperCase(),
                          value: lvl,
                        }))}
                      />
                    )}

                    <Button
                      type="text"
                      size="small"
                      onClick={() => toggleGuidance(meta.id)}
                      icon={<MaterialIcon name={isExpanded ? "expand_less" : "expand_more"} size={16} />}
                    >
                      {isExpanded ? "收起说明" : "原理说明"}
                    </Button>

                    <Switch
                      checked={engineState.enabled}
                      onChange={(val) => handleEngineToggle(meta.id, val)}
                    />
                  </Flex>
                </Flex>

                {/* Guidance Detail Expansion */}
                {isExpanded && (
                  <div
                    style={{
                      marginTop: 10,
                      padding: "8px 12px",
                      borderRadius: 6,
                      background: "rgba(0,0,0,0.2)",
                      border: "1px solid var(--ant-color-border-secondary)",
                      fontSize: 12,
                    }}
                  >
                    <Flex align="flex-start" gap={6}>
                      <MaterialIcon name="info" size={14} style={{ color: "#06b6d4", marginTop: 2 }} />
                      <div>
                        <Text strong style={{ color: "#06b6d4" }}>权衡指标与运行特性：</Text>
                        <span style={{ color: "var(--ant-color-text-secondary)", marginLeft: 6 }}>
                          {meta.guidance.tradeoffs}
                        </span>
                      </div>
                    </Flex>
                  </div>
                )}
              </div>
            );
          })}
        </Space>
      </Card>

      {/* 5. Caveman Output & Ultra Advanced Settings */}
      <Row gutter={[10, 10]}>
        <Col xs={24} md={12}>
          <Card title="Caveman 输出精简模式 (Output Prose Mode)" className={styles.sectionCard} size="small">
            <Space orientation="vertical" size={10} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>启用大模型回复精炼</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    在 Prompt 尾部追加轻量指令，引导模型以极简、高信息密度中文/英文回复
                  </div>
                </div>
                <Switch
                  checked={localConfig.cavemanOutputMode?.enabled ?? false}
                  onChange={(val) => {
                    const next = {
                      ...localConfig,
                      cavemanOutputMode: {
                        ...(localConfig.cavemanOutputMode || { intensity: "full", autoClarity: true }),
                        enabled: val,
                      },
                    };
                    setLocalConfig(next);
                    updateMutation.mutate({ cavemanOutputMode: next.cavemanOutputMode });
                  }}
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>精简强度 (Intensity):</Text>
                <Radio.Group
                  size="small"
                  value={localConfig.cavemanOutputMode?.intensity || "full"}
                  onChange={(e) => {
                    const next = {
                      ...localConfig,
                      cavemanOutputMode: {
                        ...(localConfig.cavemanOutputMode || { enabled: true, autoClarity: true }),
                        intensity: e.target.value,
                      },
                    };
                    setLocalConfig(next);
                    updateMutation.mutate({ cavemanOutputMode: next.cavemanOutputMode });
                  }}
                >
                  <Radio.Button value="lite">轻度 (Lite)</Radio.Button>
                  <Radio.Button value="full">标准 (Full)</Radio.Button>
                  <Radio.Button value="ultra">极限 (Ultra)</Radio.Button>
                </Radio.Group>
              </Flex>
            </Space>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title="Ultra 极限模式与本地 SLM 模型" className={styles.sectionCard} size="small">
            <Space orientation="vertical" size={10} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>SLM 预热与冷启就绪 (Pre-warm)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    网关启动时自动将 LLMLingua-2 ONNX 分类模型载入内存
                  </div>
                </div>
                <Switch
                  checked={localConfig.ultraSlmPrewarm ?? false}
                  onChange={(val) => {
                    const next = { ...localConfig, ultraSlmPrewarm: val };
                    setLocalConfig(next);
                    updateMutation.mutate({ ultraSlmPrewarm: val });
                  }}
                />
              </Flex>

              <Flex justify="space-between" align="center">
                <Text type="secondary" style={{ fontSize: 12 }}>Ultra 剪枝算子类型:</Text>
                <Radio.Group
                  size="small"
                  value={localConfig.ultraEngine || "heuristic"}
                  onChange={(e) => {
                    const next = { ...localConfig, ultraEngine: e.target.value };
                    setLocalConfig(next);
                    updateMutation.mutate({ ultraEngine: e.target.value });
                  }}
                >
                  <Radio.Button value="heuristic">启发式修剪 (Heuristic)</Radio.Button>
                  <Radio.Button value="slm">ONNX 模型 (SLM)</Radio.Button>
                </Radio.Group>
              </Flex>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default CompressionSettingsPage;
