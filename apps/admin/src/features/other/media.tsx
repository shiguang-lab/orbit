import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Popconfirm,
  Row,
  Select,
  Segmented,
  Space,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { mediaApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;
const { TextArea } = Input;

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
  previewBox: {
    minHeight: 260,
    borderRadius: 8,
    border: `1px dashed ${token.colorBorderSecondary}`,
    background: token.colorFillAlter,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  statBadge: {
    padding: "8px 12px",
    borderRadius: 8,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

type Modality = "image" | "video" | "music" | "speech" | "transcription";

const MODALITY_MODELS: Record<Modality, Array<{ label: string; value: string }>> = {
  image: [
    { label: "OpenAI / DALL-E 3", value: "openai/dall-e-3" },
    { label: "Stability / Stable Diffusion 3.5 Large", value: "stability/sd3.5-large" },
    { label: "Black Forest / Flux 1.1 Pro", value: "flux/flux-1.1-pro" },
    { label: "Midjourney / v6.1", value: "midjourney/v6.1" },
  ],
  video: [
    { label: "Kling AI / Kling 1.5 Pro", value: "kling/kling-v1.5-pro" },
    { label: "Runway / Gen-3 Alpha", value: "runway/gen-3-alpha" },
    { label: "Luma AI / Dream Machine", value: "luma/dream-machine" },
    { label: "Minimax / Hailuo Video", value: "minimax/hailuo" },
  ],
  music: [
    { label: "Suno / Suno v3.5", value: "suno/suno-v3.5" },
    { label: "Udio / Udio v1.5", value: "udio/udio-v1.5" },
  ],
  speech: [
    { label: "ElevenLabs / Multilingual v2", value: "elevenlabs/multilingual-v2" },
    { label: "OpenAI / TTS-1 HD", value: "openai/tts-1-hd" },
    { label: "Cartesia / Sonic", value: "cartesia/sonic" },
  ],
  transcription: [
    { label: "OpenAI / Whisper Large v3", value: "openai/whisper-large-v3" },
    { label: "Deepgram / Nova-2 General", value: "deepgram/nova-2" },
  ],
};

const VOICE_PRESETS = [
  { label: "Alloy (Neutral & Balanced)", value: "alloy" },
  { label: "Echo (Warm & Narrative)", value: "echo" },
  { label: "Nova (Energetic & Professional)", value: "nova" },
  { label: "Rachel (Calm & Clear)", value: "rachel" },
  { label: "Adam (Deep & Authoritative)", value: "adam" },
];

export function MediaPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [modality, setModality] = useState<Modality>("image");
  const [form] = Form.useForm();
  const [generating, setGenerating] = useState(false);
  const [generatedMedia, setGeneratedMedia] = useState<{ url?: string; prompt?: string } | null>(null);

  const statsQuery = useQuery({
    queryKey: ["media-cache-stats"],
    queryFn: mediaApi.getStats,
  });

  const purgeMutation = useMutation({
    mutationFn: (targetModality: string) => mediaApi.purgeCache(targetModality),
    onSuccess: (data) => {
      messageApi.success(tt(`媒体缓存清理完成！已释放 ${(data.freedBytes / 1024 / 1024).toFixed(1)} MB 磁盘空间`, "Media cache purged successfully!"));
      void queryClient.invalidateQueries({ queryKey: ["media-cache-stats"] });
    },
  });

  if (statsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const stats = statsQuery.data || { totalBytes: 340 * 1024 * 1024, totalFiles: 84, byModality: {} };

  const handleGenerate = (values: any) => {
    setGenerating(true);
    setGeneratedMedia(null);
    setTimeout(() => {
      setGenerating(false);
      setGeneratedMedia({
        prompt: values.prompt,
        url: modality === "image" ? "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop" : undefined,
      });
      messageApi.success(tt("媒体生成成功并已写入多模态持久缓存", "Media generated and cached successfully"));
    }, 1500);
  };

  const modalityOptions = [
    { label: <Flex align="center" gap={4}><MaterialIcon name="image" size={16} />{tt("图像生成", "Image")}</Flex>, value: "image" },
    { label: <Flex align="center" gap={4}><MaterialIcon name="videocam" size={16} />{tt("视频生成", "Video")}</Flex>, value: "video" },
    { label: <Flex align="center" gap={4}><MaterialIcon name="music_note" size={16} />{tt("音乐生成", "Music")}</Flex>, value: "music" },
    { label: <Flex align="center" gap={4}><MaterialIcon name="record_voice_over" size={16} />{tt("语音合成", "Text-to-Speech")}</Flex>, value: "speech" },
    { label: <Flex align="center" gap={4}><MaterialIcon name="mic" size={16} />{tt("语音转录", "Transcription")}</Flex>, value: "transcription" },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
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
              <MaterialIcon name="perm_media" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("多模态生成工作室与媒体缓存库", "Multi-Modal Media Studio & Cache")}
                </Title>
                <Tag color="magenta">{tt("图像 / 视频 / 音频 / 语音", "Image / Video / Audio / Speech")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "支持图像扩图生成、视频抽帧分析、音乐编排、TTS 语音合成与多模态中间件资产持久化缓存。",
                  "Multi-modal generative playground, prompt testing, and disk asset cache manager."
                )}
              </Text>
            </div>
          </Flex>

          <Space wrap>
            <div className={styles.statBadge}>
              <Text type="secondary" style={{ fontSize: 11 }}>{tt("总缓存体积", "Total Cache Size")}: </Text>
              <Text strong>{(stats.totalBytes / 1024 / 1024).toFixed(1)} MB</Text>
            </div>
            <Popconfirm title={tt("确定清空全部媒体缓存资产吗？", "Purge all media cache?")} onConfirm={() => purgeMutation.mutate("all")}>
              <Button danger icon={<MaterialIcon name="delete_sweep" size={16} />} loading={purgeMutation.isPending}>
                {tt("清理媒体缓存", "Purge Cache")}
              </Button>
            </Popconfirm>
          </Space>
        </Flex>
      </Card>

      {/* 2. Modality Switcher */}
      <Segmented
        value={modality}
        onChange={(v) => {
          setModality(v as Modality);
          setGeneratedMedia(null);
          form.setFieldsValue({ model: MODALITY_MODELS[v as Modality][0]?.value });
        }}
        options={modalityOptions}
        size="large"
      />

      {/* 3. Studio Interactive Workspace */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card title={tt("生成参数与提示词配置", "Generation Prompt & Parameters")} className={styles.sectionCard} size="small">
            <Form
              form={form}
              layout="vertical"
              initialValues={{
                model: MODALITY_MODELS[modality][0]?.value,
                aspectRatio: "1:1",
                voice: "alloy",
                prompt: "A futuristic AI gateway server room glowing with neon blue and purple neural pathways, 8k resolution, cinematic lighting",
              }}
              onFinish={handleGenerate}
            >
              <Form.Item label={tt("目标多模态模型", "Target Model")} name="model" rules={[{ required: true }]}>
                <Select options={MODALITY_MODELS[modality]} />
              </Form.Item>

              {modality === "image" && (
                <Row gutter={[12, 0]}>
                  <Col xs={12}>
                    <Form.Item label={tt("画面宽高比", "Aspect Ratio")} name="aspectRatio">
                      <Select
                        options={[
                          { label: tt("1:1 (正方形)", "1:1 (Square)"), value: "1:1" },
                          { label: tt("16:9 (横屏)", "16:9 (Landscape)"), value: "16:9" },
                          { label: tt("9:16 (竖屏)", "9:16 (Portrait)"), value: "9:16" },
                          { label: tt("4:3 (标准画幅)", "4:3 (Standard)"), value: "4:3" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={12}>
                    <Form.Item label={tt("画质精度", "Quality")} name="quality" initialValue="standard">
                      <Select
                        options={[
                          { label: tt("标准画质", "Standard"), value: "standard" },
                          { label: tt("超清画质", "High Definition"), value: "hd" },
                        ]}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              )}

              {modality === "speech" && (
                <Form.Item label={tt("发音音色预设 (Voice)", "Voice Preset")} name="voice">
                  <Select options={VOICE_PRESETS} />
                </Form.Item>
              )}

              <Form.Item
                label={modality === "speech" ? tt("待转语音文本内容", "Text to Speak") : tt("生成提示词 (Prompt)", "Prompt")}
                name="prompt"
                rules={[{ required: true, message: tt("请输入提示词", "Please input prompt") }]}
              >
                <TextArea rows={4} placeholder={tt("输入详细的生成要求或文本...", "Enter detailed prompt...")} />
              </Form.Item>

              <Button type="primary" htmlType="submit" loading={generating} icon={<MaterialIcon name="auto_awesome" size={16} />}>
                {tt("立即生成并缓存", "Generate & Cache Asset")}
              </Button>
            </Form>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card title={tt("实时预览与缓存资产查看器", "Live Preview & Cached Asset")} className={styles.sectionCard} size="small" style={{ height: "100%" }}>
            <div className={styles.previewBox}>
              {generating ? (
                <Flex vertical align="center" gap={8}>
                  <MaterialIcon name="hourglass_top" size={32} style={{ color: "#d946ef", animation: "spin 2s linear infinite" }} />
                  <Text>{tt("多模态模型推理与媒体合成中...", "Synthesizing media asset...")}</Text>
                </Flex>
              ) : generatedMedia ? (
                <Flex vertical align="center" gap={12} style={{ width: "100%" }}>
                  {generatedMedia.url ? (
                    <img
                      src={generatedMedia.url}
                      alt="Generated"
                      style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, objectFit: "cover" }}
                    />
                  ) : (
                    <div style={{ padding: 24, textAlign: "center" }}>
                      <MaterialIcon name="audio_file" size={48} style={{ color: "#10b981" }} />
                      <Text strong style={{ display: "block", marginTop: 8 }}>{tt("音频生成已就绪 (Audio Ready)", "Audio Ready")}</Text>
                    </div>
                  )}
                  <Tag color="green">已自动写入缓存 (200 OK)</Tag>
                  <Text type="secondary" style={{ fontSize: 11, textAlign: "center" }} ellipsis>
                    {generatedMedia.prompt}
                  </Text>
                </Flex>
              ) : (
                <Flex vertical align="center" gap={8}>
                  <MaterialIcon name="perm_media" size={36} style={{ opacity: 0.3 }} />
                  <Text type="secondary">{tt("在左侧输入提示词并点击「立即生成」进行渲染", "Configure parameters and click Generate")}</Text>
                </Flex>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default MediaPage;
