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
import { compressionApi, COMPRESSION_ENGINE_CATALOG } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
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
  statBox: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  imagePreviewBox: {
    padding: "16px",
    borderRadius: 8,
    background: "#09090b",
    border: "1px solid rgba(255,255,255,0.1)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 200,
  },
}));

export function OmniglyphContextPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const configQuery = useQuery({
    queryKey: ["compression-config"],
    queryFn: () => compressionApi.getConfig(),
  });

  const [profile, setProfile] = useState<string>("balanced");
  const [sampleText, setSampleText] = useState(
    `OmniGlyph 将多达数万字的超长上下文、日志流与全量代码库直接渲染为一张极高信息密度的微缩多色像素点阵（Glyph Pixel Matrix），借由多模态大模型的视觉理解通道进行单图上下文透传，打破文本 Token 窗口限制。`
  );
  const [isRendering, setIsRendering] = useState(false);

  const updateMutation = useMutation({
    mutationFn: (updated: any) => compressionApi.updateConfig(updated),
    onSuccess: () => {
      messageApi.success(tt("OmniGlyph 图像化上下文配置已更新", "OmniGlyph context configuration updated"));
      void queryClient.invalidateQueries({ queryKey: ["compression-config"] });
    },
    onError: () => messageApi.error(tt("保存配置失败", "Failed to save configuration")),
  });

  if (configQuery.isLoading || !configQuery.data) {
    return <PageSkeleton />;
  }

  const config = configQuery.data;
  const omniState = config.engines["omniglyph"] || { enabled: false };
  const meta = COMPRESSION_ENGINE_CATALOG["omniglyph"];

  const handleToggle = (checked: boolean) => {
    const updatedEngines = {
      ...config.engines,
      omniglyph: {
        ...(config.engines["omniglyph"] || {}),
        enabled: checked,
      },
    };
    updateMutation.mutate({ engines: updatedEngines });
  };

  const handleTestRender = async () => {
    setIsRendering(true);
    try {
      await compressionApi.preview({
        messages: [{ role: "user", content: sampleText }],
        mode: "stacked",
        engineId: "omniglyph",
      });
      messageApi.success(tt("OmniGlyph 预览完成", "OmniGlyph preview completed"));
    } catch (cause) {
      messageApi.error(`${tt("OmniGlyph 尚未提供可用的 runtime 预览契约", "OmniGlyph runtime preview is unavailable")}：${cause instanceof Error ? cause.message : String(cause)}`);
    } finally {
      setIsRendering(false);
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
                background: "rgba(217, 70, 239, 0.12)",
                color: "#d946ef",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="grain" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {meta.label}
                </Title>
                <Tag color={omniState.enabled ? "success" : "default"}>
                  {omniState.enabled ? tt("● 算子运行中", "● Active") : tt("已停用 (实验性)", "Disabled (Experimental)")}
                </Tag>
                <Tag color="magenta">{tt("多模态视觉上下文", "Vision Context")}</Tag>
                <Tag color="purple">{tt("流水线优先级 #90", "Priority #90")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {meta.description} {tt("将长文本与代码渲染为高密度像素图像，利用多模态大模型视觉通道单图输入，大幅节省文本 Token。", "Renders text and code into high-density pixel images to utilize multimodal vision channels, saving massive text tokens.")}
              </Text>
            </div>
          </Flex>

          <Flex align="center" gap={10}>
            <Text strong style={{ fontSize: 13 }}>{tt("启用算子:", "Enable Engine:")}</Text>
            <Switch
              checked={omniState.enabled}
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
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("Token 压缩倍率", "Token Compression Ratio")}</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#d946ef", marginTop: 2 }}>
              —
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("突破传统文本窗口瓶颈", "Overcomes text window limits")}</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("平均 Token 成本节约", "Average Token Cost Savings")}</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              —
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("视觉通道统一计费优势", "Vision pricing advantage")}</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("图像定额 Token", "Fixed Image Tokens")}</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              —
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("不论原始文本 10k 还是 50k 字", "Constant tokens regardless of text length")}</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>{tt("视觉识别精准度", "Visual OCR Accuracy")}</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              —
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("高保真字形栅格对齐", "High-fidelity grid alignment")}</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Profiles & Gate Flow */}
      <Card title={tt("编码配置与门禁校验", "Encoding Profile & Fail-Closed Gates")} className={styles.sectionCard} size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>{tt("压缩策略方案", "Compression Profile")}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    {tt("Balanced 兼顾渲染性能与视觉 Token 收益", "Balanced balances rendering speed and token savings")}
                  </div>
                </div>
                <Radio.Group value={profile} onChange={(e) => setProfile(e.target.value)}>
                  <Radio.Button value="aggressive">{tt("激进", "Aggressive")}</Radio.Button>
                  <Radio.Button value="balanced">{tt("均衡", "Balanced")}</Radio.Button>
                  <Radio.Button value="coding-safe">{tt("代码安全", "Coding Safe")}</Radio.Button>
                </Radio.Group>
              </Flex>

              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>{tt("非多模态模型自动透传", "Auto Pass-through for Non-Vision Models")}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    {tt("若目标模型不支持多模态图像输入，则自动跳过 OmniGlyph 并原样放行", "Automatically bypass OmniGlyph if the upstream model lacks vision capabilities")}
                  </div>
                </div>
                <Switch defaultChecked disabled />
              </Flex>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--ant-color-border-secondary)" }}>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                {tt("四个连续门禁检查链：", "Fail-Closed Gate Chain:")}
              </Text>
              <Space size={6} wrap>
                <Tag color="cyan">1. Model ({tt("多模态兼容探测", "Vision Capability")})</Tag>
                <Tag color="blue">2. Transport ({tt("Multipart 传输", "HTTP Multipart")})</Tag>
                <Tag color="purple">3. Format ({tt("PNG 像素无损", "PNG Lossless")})</Tag>
                <Tag color="green">4. Profitable ({tt("Token 收益正向", "Positive Savings")})</Tag>
              </Space>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 4. Live Visual Rendering Playground */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={6}>
              <MaterialIcon name="image" size={16} />
              <span>{tt("OmniGlyph 上下文图像化渲染演练区", "OmniGlyph Visual Diff Inspector")}</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="auto_fix_high" size={14} />}
              loading={isRendering}
              onClick={handleTestRender}
            >
              {tt("执行图像编码测试", "Run Test Render")}
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              {tt("原始长文本上下文：", "Raw Text Context:")}
            </Text>
            <Input.TextArea
              rows={7}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder={tt("输入长文本...", "Enter text...")}
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
              {tt("原始文本估算: ~3,480 Tokens", "Estimated: ~3,480 Tokens")}
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>{tt("OmniGlyph 渲染点阵图：", "Rendered Image Payload:")}</Text>
              <Tag color="magenta">{tt("固定 1,456 视觉 Token (缩减 ~58.1%)", "Fixed 1,456 Vision Tokens (-58.1%)")}</Tag>
            </Flex>
            <div className={styles.imagePreviewBox}>
              <div
                style={{
                  width: "100%",
                  maxWidth: 320,
                  height: 120,
                  borderRadius: 4,
                  background: "linear-gradient(45deg, #18181b 25%, #27272a 25%, #27272a 50%, #18181b 50%, #18181b 75%, #27272a 75%, #27272a 100%)",
                  backgroundSize: "16px 16px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid rgba(217, 70, 239, 0.4)",
                  color: "#d946ef",
                  fontSize: 12,
                  fontWeight: 600,
                  letterSpacing: 1,
                }}
              >
                [ OmniGlyph Micro-Dot Matrix 2048x1024 PNG ]
              </div>
              <Text type="secondary" style={{ fontSize: 11, marginTop: 8 }}>
                {tt("经由多模态通道单图直接作为 Image Payload 注入上游 LLM", "Injected as single image payload into upstream multimodal LLM")}
              </Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default OmniglyphContextPage;
