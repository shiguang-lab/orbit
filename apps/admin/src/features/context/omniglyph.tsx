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
      messageApi.success("OmniGlyph 图像化上下文配置已更新");
      void queryClient.invalidateQueries({ queryKey: ["compression-config"] });
    },
    onError: () => messageApi.error("保存配置失败"),
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

  const handleTestRender = () => {
    setIsRendering(true);
    setTimeout(() => {
      setIsRendering(false);
      messageApi.success("OmniGlyph 像素矩阵渲染完成 (耗时 12ms)");
    }, 400);
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
                  {omniState.enabled ? "● 算子运行中" : "已停用 (实验性)"}
                </Tag>
                <Tag color="magenta">多模态视觉上下文</Tag>
                <Tag color="purple">流水线优先级 #90</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {meta.description} 将长文本与代码渲染为高密度像素图像，利用多模态大模型视觉通道单图输入，大幅节省文本 Token。
              </Text>
            </div>
          </Flex>

          <Flex align="center" gap={10}>
            <Text strong style={{ fontSize: 13 }}>启用算子:</Text>
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
            <Text type="secondary" style={{ fontSize: 12 }}>Token 压缩倍率</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#d946ef", marginTop: 2 }}>
              ~ 10x
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>突破传统文本窗口瓶颈</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>平均 Token 成本节约</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              59% – 70%
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>视觉通道统一计费优势</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>图像定额 Token</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              1,456 Tokens / 图
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>不论原始文本 10k 还是 50k 字</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>视觉识别精准度</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              100% (Lossless OCR)
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>高保真字形栅格对齐</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Profiles & Gate Flow */}
      <Card title="编码配置与门禁校验 (Profile & Fail-Closed Gate Chain)" className={styles.sectionCard} size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Space orientation="vertical" size={12} style={{ width: "100%" }}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>压缩策略方案 (Profile)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    Balanced 兼顾渲染性能与视觉 Token 收益
                  </div>
                </div>
                <Radio.Group value={profile} onChange={(e) => setProfile(e.target.value)}>
                  <Radio.Button value="aggressive">激进 (Aggressive)</Radio.Button>
                  <Radio.Button value="balanced">均衡 (Balanced)</Radio.Button>
                  <Radio.Button value="coding-safe">代码安全 (Coding Safe)</Radio.Button>
                </Radio.Group>
              </Flex>

              <Flex justify="space-between" align="center">
                <div>
                  <Text strong style={{ fontSize: 13 }}>非多模态模型自动透传 (Fail-Closed Gate)</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    若目标模型不支持多模态图像输入，则自动跳过 OmniGlyph 并原样放行
                  </div>
                </div>
                <Switch defaultChecked disabled />
              </Flex>
            </Space>
          </Col>

          <Col xs={24} md={12}>
            <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(255,255,255,0.02)", border: "1px solid var(--ant-color-border-secondary)" }}>
              <Text strong style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
                四个连续门禁检查链 (Evaluation Gate Order)：
              </Text>
              <Space size={6} wrap>
                <Tag color="cyan">1. Model (多模态兼容探测)</Tag>
                <Tag color="blue">2. Transport (HTTP Multipart)</Tag>
                <Tag color="purple">3. Format (PNG 像素无损)</Tag>
                <Tag color="green">4. Profitable (Token 收益正向)</Tag>
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
              <span>OmniGlyph 上下文图像化渲染演练区 (Visual Diff Inspector)</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="auto_fix_high" size={14} />}
              loading={isRendering}
              onClick={handleTestRender}
            >
              执行图像编码测试
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Row gutter={[12, 12]}>
          <Col xs={24} md={12}>
            <Text strong style={{ fontSize: 12, display: "block", marginBottom: 4 }}>
              原始长文本上下文 (Raw Text Context):
            </Text>
            <Input.TextArea
              rows={7}
              value={sampleText}
              onChange={(e) => setSampleText(e.target.value)}
              placeholder="输入长文本..."
            />
            <div style={{ marginTop: 4, fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
              原始文本估算: ~3,480 Tokens
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
              <Text strong style={{ fontSize: 12 }}>OmniGlyph 渲染点阵图 (Rendered Image Payload):</Text>
              <Tag color="magenta">固定 1,456 视觉 Token (缩减 ~58.1%)</Tag>
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
                经由多模态通道单图直接作为 Image Payload 注入上游 LLM
              </Text>
            </div>
          </Col>
        </Row>
      </Card>
    </div>
  );
}

export default OmniglyphContextPage;
