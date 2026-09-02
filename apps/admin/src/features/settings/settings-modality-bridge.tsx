import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  InputNumber,
  Row,
  Select,
  Slider,
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

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
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
    marginBottom: 10,
  },
}));

export function SettingsModalityBridgePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const settingsQuery = useQuery({
    queryKey: ["settings-modality-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success("多模态桥接策略已成功保存");
      void queryClient.invalidateQueries({ queryKey: ["settings-modality-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error("保存多模态桥接设置失败"),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
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
                  多模态桥接与跨模态转译
                </Title>
                <Tag color="green">视觉 / 音频 / 视频适配</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                针对纯文本模型自动接入视觉 OCR、语音转录与视频抽帧，实现异构模型间无缝跨模态兼容。
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveMutation.isPending}
            onClick={() => form.submit()}
          >
            保存多模态设置
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          visionBridgeEnabled: s.visionBridgeEnabled ?? true,
          visionFallbackModel: s.visionFallbackModel || "gpt-4o-mini",
          imageAutoDownscale: s.imageAutoDownscale ?? true,
          imageMaxDimension: s.imageMaxDimension || 2048,
          imageQuality: s.imageQuality || 85,
          imageFormatTranscode: s.imageFormatTranscode ?? true,
          audioBridgeEnabled: s.audioBridgeEnabled ?? true,
          audioSttModel: s.audioSttModel || "whisper-large-v3",
          audioChunkDurationSec: s.audioChunkDurationSec || 60,
          audioAutoTranscode: s.audioAutoTranscode ?? true,
          videoBridgeEnabled: s.videoBridgeEnabled ?? true,
          videoSamplingFps: s.videoSamplingFps || 1,
          videoMaxKeyframes: s.videoMaxKeyframes || 30,
        }}
        onFinish={handleSave}
      >
        <Card className={styles.sectionCard} size="small">
          <Tabs
            defaultActiveKey="vision"
            items={[
              {
                key: "vision",
                label: (
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="image" size={16} /> 视觉与图像桥接 (Vision)
                  </Flex>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="启用非视觉模型图像自动转译 (OCR/描述回填)" name="visionBridgeEnabled" valuePropName="checked">
                          <Switch checkedChildren="已开启转译" unCheckedChildren="关闭" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="指定视觉识别转译模型" name="visionFallbackModel">
                          <Select
                            options={[
                              { label: "GPT-4o Mini (极速轻量)", value: "gpt-4o-mini" },
                              { label: "Claude 3.5 Sonnet (高精图文)", value: "claude-3-5-sonnet" },
                              { label: "Gemini 2.0 Flash (大图低成本)", value: "gemini-2.0-flash" },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={8}>
                        <Form.Item label="超大图片自动降采样缩放" name="imageAutoDownscale" valuePropName="checked">
                          <Switch checkedChildren="自动缩放" unCheckedChildren="原始尺寸" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item label="单边最大像素尺寸 (Max Dimension)" name="imageMaxDimension">
                          <Select
                            options={[
                              { label: "1024 px (极速节约 Token)", value: 1024 },
                              { label: "1536 px (均衡推荐)", value: 1536 },
                              { label: "2048 px (高清解析)", value: 2048 },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={8}>
                        <Form.Item label="JPEG 压缩质量" name="imageQuality">
                          <Slider min={50} max={100} step={5} marks={{ 50: "50%", 85: "85%", 100: "100%" }} />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: "audio",
                label: (
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="mic" size={16} /> 语音与音频桥接 (Audio)
                  </Flex>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="启用语音输入自动 STT 转录" name="audioBridgeEnabled" valuePropName="checked">
                          <Switch checkedChildren="已开启转录" unCheckedChildren="关闭" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="STT 语音转录后端模型" name="audioSttModel">
                          <Select
                            options={[
                              { label: "Whisper Large V3 (高准确率多语言)", value: "whisper-large-v3" },
                              { label: "Groq Whisper (百毫秒极速)", value: "groq-whisper" },
                              { label: "OpenAI Whisper-1", value: "whisper-1" },
                            ]}
                          />
                        </Form.Item>
                      </Col>
                    </Row>

                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="长音频分块切片时长 (秒)" name="audioChunkDurationSec">
                          <InputNumber min={10} max={300} style={{ width: "100%" }} addonAfter="秒" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={12}>
                        <Form.Item label="异构音频格式自动转码 (WAV / MP3)" name="audioAutoTranscode" valuePropName="checked">
                          <Switch checkedChildren="自动转码" unCheckedChildren="原样透传" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
              {
                key: "video",
                label: (
                  <Flex align="center" gap={6}>
                    <MaterialIcon name="videocam" size={16} /> 视频帧抽样与处理 (Video)
                  </Flex>
                ),
                children: (
                  <div style={{ padding: "8px 0" }}>
                    <Row gutter={[16, 0]}>
                      <Col xs={24} sm={12}>
                        <Form.Item label="启用视频输入自动抽帧分析" name="videoBridgeEnabled" valuePropName="checked">
                          <Switch checkedChildren="已开启视频抽帧" unCheckedChildren="关闭" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={6}>
                        <Form.Item label="视频抽帧采样率 (FPS)" name="videoSamplingFps">
                          <InputNumber min={0.2} max={5} step={0.2} style={{ width: "100%" }} addonAfter="FPS" />
                        </Form.Item>
                      </Col>
                      <Col xs={24} sm={6}>
                        <Form.Item label="单次请求最大关键帧上限" name="videoMaxKeyframes">
                          <InputNumber min={5} max={100} style={{ width: "100%" }} addonAfter="帧" />
                        </Form.Item>
                      </Col>
                    </Row>
                  </div>
                ),
              },
            ]}
          />
        </Card>
      </Form>
    </div>
  );
}

export default SettingsModalityBridgePage;
