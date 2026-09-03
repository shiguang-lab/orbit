import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Switch,
  Tabs,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { settingsApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
  },
  headerCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

export function SettingsModalityBridgePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>("vision");
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-modality-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("多模态桥接策略已成功保存", "Modality bridge settings saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings-modality-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存多模态桥接设置失败", "Failed to save modality bridge settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
  };

  const tabItems = [
    {
      key: "vision",
      label: (
        <Flex align="center" gap={6}>
          <MaterialIcon name="visibility" size={16} />
          <span>{tt("视觉桥接 (Vision)", "Vision Bridge")}</span>
        </Flex>
      ),
      children: (
        <Flex vertical gap={12}>
          <Card title={tt("视觉理解核心配置", "Vision Bridge Core Settings")} className={styles.sectionCard} size="small">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Flex justify="space-between" align="center" style={{ padding: "6px 0" }}>
                  <div>
                    <Text strong>{tt("启用视觉跨模态桥接", "Enable Vision Bridge")}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {tt("对纯文本上游模型自动接入图像分析器", "Reroute images through vision models")}
                    </Text>
                  </div>
                  <Form.Item name="modalityBridgeVisionEnabled" valuePropName="checked" noStyle>
                    <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                  </Form.Item>
                </Flex>
              </Col>
              <Col xs={24} sm={12}>
                <Flex justify="space-between" align="center" style={{ padding: "6px 0" }}>
                  <div>
                    <Text strong>{tt("仅重路由纯文本模型", "Reroute Text-Only Models")}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {tt("当目标模型原生不支持图像时才触发视觉桥接", "Only bridge when target model lacks vision")}
                    </Text>
                  </div>
                  <Form.Item name="visionBridgeRerouteTextOnly" valuePropName="checked" noStyle>
                    <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                  </Form.Item>
                </Flex>
              </Col>
            </Row>

            <Divider style={{ margin: "10px 0" }} />

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={tt("视觉分析模式 (Vision Mode)", "Vision Analysis Mode")}
                  name="modalityBridgeVisionMode"
                  tooltip={tt("OCR 提取文字、Caption 生成简短摘要、Describe 详细描述画面、Reroute 转发给专用模型", "Vision transformation mode")}
                >
                  <Radio.Group buttonStyle="solid">
                    <Radio.Button value="describe">{tt("详细描述 (Describe)", "Describe")}</Radio.Button>
                    <Radio.Button value="caption">{tt("简短摘要 (Caption)", "Caption")}</Radio.Button>
                    <Radio.Button value="ocr">{tt("文字提取 (OCR)", "OCR")}</Radio.Button>
                    <Radio.Button value="reroute">{tt("重路由 (Reroute)", "Reroute")}</Radio.Button>
                  </Radio.Group>
                </Form.Item>
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  label={tt("默认视觉代理模型", "Vision Bridge Model")}
                  name="modalityBridgeVisionModel"
                  tooltip={tt("负责执行视觉理解的前置模型标识，如 openai/gpt-4o 或 google/gemini-2.0-flash", "Upstream vision model")}
                >
                  <Input placeholder="openai/gpt-4o or gemini/gemini-1.5-flash" />
                </Form.Item>
              </Col>
            </Row>

            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item label={tt("超时时间 (ms)", "Timeout (ms)")} name="modalityBridgeVisionTimeout">
                  <InputNumber min={1000} max={120000} step={1000} style={{ width: "100%" }} addonAfter="ms" />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label={tt("单次请求最大图片数", "Max Images per Request")} name="modalityBridgeVisionMaxImages">
                  <InputNumber min={1} max={30} style={{ width: "100%" }} addonAfter={tt("张", "images")} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label={tt("描述文本最大字符数", "Max Output Characters")} name="modalityBridgeVisionMaxChars">
                  <InputNumber min={100} max={20000} step={500} style={{ width: "100%" }} addonAfter="chars" />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          <Card title={tt("视觉理解缓存 (Vision Cache)", "Vision Cache & Prompt Template")} className={styles.sectionCard} size="small">
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={8}>
                <Form.Item label={tt("启用视觉理解结果缓存", "Enable Vision Cache")} name="modalityBridgeCacheEnabled" valuePropName="checked">
                  <Switch checkedChildren={tt("启用缓存", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label={tt("缓存过期时间 (TTL)", "Cache TTL Minutes")} name="modalityBridgeCacheTtlMinutes">
                  <InputNumber min={5} max={10080} style={{ width: "100%" }} addonAfter={tt("分钟", "mins")} />
                </Form.Item>
              </Col>
              <Col xs={24} sm={8}>
                <Form.Item label={tt("最大缓存条目数", "Max Cache Entries")} name="modalityBridgeCacheMaxEntries">
                  <InputNumber min={100} max={50000} step={500} style={{ width: "100%" }} />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              label={tt("自定义视觉解析 Prompt 模版", "Custom Vision Prompt Template")}
              name="modalityBridgeVisionPrompt"
              tooltip={tt("留空则使用网关内置的高精度视觉理解系统提示词", "Leave empty for gateway default")}
            >
              <Input.TextArea rows={3} placeholder={tt("请详细描述图像中可见的主要内容、图表文字与关键信息...", "Describe visual details...")} />
            </Form.Item>
          </Card>
        </Flex>
      ),
    },
    {
      key: "audio",
      label: (
        <Flex align="center" gap={6}>
          <MaterialIcon name="mic" size={16} />
          <span>{tt("音频转录桥接 (Audio)", "Audio Bridge")}</span>
        </Flex>
      ),
      children: (
        <Card title={tt("音频语音转录配置 (Speech-to-Text)", "Speech-to-Text Audio Bridge")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Flex justify="space-between" align="center" style={{ padding: "6px 0" }}>
                <div>
                  <Text strong>{tt("启用音频语音桥接", "Enable Audio Bridge")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("入站语音片段自动转录为文本注入提示词", "Auto-transcribe input audio into text prompt")}
                  </Text>
                </div>
                <Form.Item name="modalityBridgeAudioEnabled" valuePropName="checked" noStyle>
                  <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                </Form.Item>
              </Flex>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("默认语音转录模型 (STT)", "Speech-to-Text Model")}
                name="modalityBridgeAudioModel"
              >
                <Input placeholder="openai/whisper-1 or groq/whisper-large-v3" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "10px 0" }} />

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("转录超时时间 (ms)", "Timeout (ms)")} name="modalityBridgeAudioTimeout">
                <InputNumber min={1000} max={180000} step={1000} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("单请求最大语音片段数", "Max Audio Clips")} name="modalityBridgeAudioMaxClips">
                <InputNumber min={1} max={20} style={{ width: "100%" }} addonAfter={tt("段", "clips")} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item label={tt("转录前置提示词 (Audio Prompt)", "Transcription Prompt")} name="modalityBridgeAudioPrompt">
            <Input placeholder={tt("输入术语或专有名词以提高转录准确率...", "Specify specialized terminology...")} />
          </Form.Item>
        </Card>
      ),
    },
    {
      key: "video",
      label: (
        <Flex align="center" gap={6}>
          <MaterialIcon name="videocam" size={16} />
          <span>{tt("视频分析桥接 (Video)", "Video Bridge")}</span>
        </Flex>
      ),
      children: (
        <Card title={tt("视频抽帧与分析配置 (Video Analysis)", "Video Analysis & Keyframe Extraction")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Flex justify="space-between" align="center" style={{ padding: "6px 0" }}>
                <div>
                  <Text strong>{tt("启用视频跨模态桥接", "Enable Video Bridge")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("通过 FFmpeg 抽帧将视频片段转换为视觉序列输入", "Extract keyframes and analyze video via vision")}
                  </Text>
                </div>
                <Form.Item name="modalityBridgeVideoEnabled" valuePropName="checked" noStyle>
                  <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                </Form.Item>
              </Flex>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("视频分析策略", "Video Analysis Mode")}
                name="modalityBridgeVideoAnalysisMode"
              >
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="frame-extraction">{tt("智能抽帧 (Frame Extraction)", "Frame Extraction")}</Radio.Button>
                  <Radio.Button value="native">{tt("原生解析 (Native)", "Native")}</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "10px 0" }} />

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("视频分析视觉模型", "Video Vision Model")} name="modalityBridgeVideoModel">
                <Input placeholder="google/gemini-2.0-flash or openai/gpt-4o" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("抽帧采样策略", "Sampling Policy")} name="modalityBridgeVideoSamplingPolicy">
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="uniform">{tt("均匀采样 (Uniform)", "Uniform")}</Radio.Button>
                  <Radio.Button value="scene-change">{tt("场景变化 (Scene Change)", "Scene Change")}</Radio.Button>
                  <Radio.Button value="fps">{tt("固定帧率 (FPS)", "Fixed FPS")}</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("最大采样关键帧数", "Max Sampled Keyframes")} name="modalityBridgeVideoFrameCount">
                <InputNumber min={2} max={64} style={{ width: "100%" }} addonAfter={tt("帧", "frames")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("单请求最大视频数", "Max Videos per Request")} name="modalityBridgeVideoMaxVideos">
                <InputNumber min={1} max={5} style={{ width: "100%" }} addonAfter={tt("个", "videos")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("超时时间 (ms)", "Timeout (ms)")} name="modalityBridgeVideoTimeout">
                <InputNumber min={2000} max={300000} step={2000} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      ),
    },
  ];

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
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="image_search" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("多模态跨架构桥接 (Modality Bridge)", "Modality Bridge & Multimodal Translation")}
                </Title>
                <Tag color="green">{tt("视觉 OCR / 语音 STT / 视频抽帧", "Vision / Audio / Video")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置异构模型间的跨模态桥接策略，自动针对不支持图片、音频或视频的上游模型进行前置代理转译与重路由。",
                  "Configure multimodal translation policies to automatically bridge images, audio, and video for text-only LLMs."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveMutation.isPending}
            onClick={() => form.submit()}
          >
            {tt("保存多模态配置", "Save Settings")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          // Vision
          modalityBridgeVisionEnabled: s.modalityBridgeVisionEnabled ?? true,
          visionBridgeRerouteTextOnly: s.visionBridgeRerouteTextOnly ?? true,
          modalityBridgeVisionMode: s.modalityBridgeVisionMode || "describe",
          modalityBridgeVisionModel: s.modalityBridgeVisionModel || "openai/gpt-4o",
          modalityBridgeVisionTimeout: s.modalityBridgeVisionTimeout || 30000,
          modalityBridgeVisionMaxImages: s.modalityBridgeVisionMaxImages || 8,
          modalityBridgeVisionMaxChars: s.modalityBridgeVisionMaxChars || 2000,
          modalityBridgeCacheEnabled: s.modalityBridgeCacheEnabled ?? true,
          modalityBridgeCacheTtlMinutes: s.modalityBridgeCacheTtlMinutes || 1440,
          modalityBridgeCacheMaxEntries: s.modalityBridgeCacheMaxEntries || 1000,
          modalityBridgeVisionPrompt: s.modalityBridgeVisionPrompt || "",
          // Audio
          modalityBridgeAudioEnabled: s.modalityBridgeAudioEnabled ?? true,
          modalityBridgeAudioModel: s.modalityBridgeAudioModel || "openai/whisper-1",
          modalityBridgeAudioTimeout: s.modalityBridgeAudioTimeout || 60000,
          modalityBridgeAudioMaxClips: s.modalityBridgeAudioMaxClips || 5,
          modalityBridgeAudioPrompt: s.modalityBridgeAudioPrompt || "",
          // Video
          modalityBridgeVideoEnabled: s.modalityBridgeVideoEnabled ?? true,
          modalityBridgeVideoAnalysisMode: s.modalityBridgeVideoAnalysisMode || "frame-extraction",
          modalityBridgeVideoModel: s.modalityBridgeVideoModel || "google/gemini-2.0-flash",
          modalityBridgeVideoSamplingPolicy: s.modalityBridgeVideoSamplingPolicy || "uniform",
          modalityBridgeVideoFrameCount: s.modalityBridgeVideoFrameCount || 16,
          modalityBridgeVideoMaxVideos: s.modalityBridgeVideoMaxVideos || 1,
          modalityBridgeVideoTimeout: s.modalityBridgeVideoTimeout || 90000,
        }}
        onFinish={handleSave}
      >
        <Tabs activeKey={activeTab} onChange={setActiveTab} items={tabItems} />
      </Form>
    </div>
  );
}

export default SettingsModalityBridgePage;
