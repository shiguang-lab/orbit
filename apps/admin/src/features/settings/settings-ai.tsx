import { useEffect } from "react";
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
  Select,
  Switch,
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
}));

export function SettingsAiPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  const [thinkingForm] = Form.useForm();
  const [promptForm] = Form.useForm();
  const [generalAiForm] = Form.useForm();

  // Queries
  const settingsQuery = useQuery({
    queryKey: ["settings-ai-all"],
    queryFn: () => settingsApi.getSettings(),
  });

  const thinkingQuery = useQuery({
    queryKey: ["settings-thinking-budget"],
    queryFn: async () => {
      const res = await fetch("/api/settings/thinking-budget");
      if (!res.ok) throw new Error("Failed to load thinking budget");
      return res.json();
    },
  });

  const promptQuery = useQuery({
    queryKey: ["settings-system-prompt"],
    queryFn: async () => {
      const res = await fetch("/api/settings/system-prompt");
      if (!res.ok) throw new Error("Failed to load system prompt");
      return res.json();
    },
  });

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => settingsApi.updateSettings(patch),
    onSuccess: () => {
      messageApi.success(tt("AI 运行策略已成功更新", "AI policies updated successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-ai-all"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("更新 AI 运行策略失败", "Failed to update AI policies")),
  });

  const updateThinkingMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/settings/thinking-budget", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update thinking budget");
      return res.json();
    },
    onSuccess: () => {
      messageApi.success(tt("思考预算 (Thinking Budget) 配置已保存", "Thinking budget settings saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings-thinking-budget"] });
    },
    onError: () => messageApi.error(tt("保存思考预算配置失败", "Failed to save thinking budget")),
  });

  const updatePromptMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/settings/system-prompt", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error("Failed to update system prompt");
      return res.json();
    },
    onSuccess: () => {
      messageApi.success(tt("全局系统提示词 (System Prompt) 策略已保存", "System prompt policy saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings-system-prompt"] });
    },
    onError: () => messageApi.error(tt("保存系统提示词策略失败", "Failed to save system prompt")),
  });

  // Form synch
  useEffect(() => {
    if (thinkingQuery.data) {
      thinkingForm.setFieldsValue({
        mode: thinkingQuery.data.mode || "passthrough",
        customBudget: thinkingQuery.data.customBudget || 10240,
        effortLevel: thinkingQuery.data.effortLevel || "medium",
      });
    }
  }, [thinkingQuery.data, thinkingForm]);

  useEffect(() => {
    if (promptQuery.data) {
      promptForm.setFieldsValue({
        mode: promptQuery.data.mode || "passthrough",
        customPrompt: promptQuery.data.customPrompt || "",
      });
    }
  }, [promptQuery.data, promptForm]);

  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data as any;
      generalAiForm.setFieldsValue({
        responsesStatePolicy: s.responsesStatePolicy || "passthrough",
        usageTokenBuffer: s.usageTokenBuffer || 1000,
        codexFastTier: s.codexFastTier === true,
        codexAutoPing: s.codexAutoPing === true,
        claudeFastMode: s.claudeFastMode === true,
      });
    }
  }, [settingsQuery.data, generalAiForm]);

  if (settingsQuery.isLoading || thinkingQuery.isLoading || promptQuery.isLoading) {
    return <PageSkeleton />;
  }

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
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="psychology" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("AI 推理与行为治理设置", "AI Reasoning & Governance Settings")}
                </Title>
                <Tag color="purple">{tt("模型推理中枢", "Inference Core")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置模型思考预算 (Thinking Budget)、全局 Prompt 拦截注入、上下文会话状态策略及 Codex/Claude 极速模式通道。",
                  "Configure model reasoning/thinking token budgets, system prompt injection policies, conversation state, and fast-mode tiers."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Thinking Budget */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="auto_awesome" size={18} />
              <span>{tt("思考预算治理 (Thinking Budget)", "Thinking Budget Management")}</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              loading={updateThinkingMutation.isPending}
              onClick={() => thinkingForm.submit()}
            >
              {tt("保存思考配置", "Save Budget")}
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Form
          form={thinkingForm}
          layout="vertical"
          onFinish={(v) => updateThinkingMutation.mutate(v)}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={tt("推理预算控制模式 (Thinking Mode)", "Thinking Mode")}
                name="mode"
                tooltip={tt("passthrough: 完全由客户端参数决定; auto: 网关自适应; custom: 固定 Tokens; adaptive: 深度渐进", "Thinking budget allocation strategy")}
              >
                <Select
                  options={[
                    { label: tt("透传客户端指定 (Passthrough)", "Passthrough (Client decides)"), value: "passthrough" },
                    { label: tt("自动适配模型 (Auto)", "Auto (Gateway manages)"), value: "auto" },
                    { label: tt("自定义全局预算 (Custom Budget)", "Custom Budget"), value: "custom" },
                    { label: tt("渐进式深度推理 (Adaptive)", "Adaptive"), value: "adaptive" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                label={tt("自定义 Token 预算上限", "Custom Budget Tokens")}
                name="customBudget"
                tooltip={tt("仅在模式为 Custom 时生效，范围 1024 - 65536 Tokens", "Token limit for custom mode (1024 - 65536)")}
              >
                <InputNumber min={1024} max={65536} step={1024} style={{ width: "100%" }} addonAfter="Tokens" />
              </Form.Item>
            </Col>

            <Col xs={24} md={6}>
              <Form.Item
                label={tt("思考努力程度 (Reasoning Effort)", "Reasoning Effort Level")}
                name="effortLevel"
                tooltip={tt("对应 OpenAI o1/o3 reasoning_effort 参数", "Effort parameter for OpenAI o-series models")}
              >
                <Select
                  options={[
                    { label: tt("关闭思考 (None)", "None"), value: "none" },
                    { label: tt("轻度 (Low)", "Low"), value: "low" },
                    { label: tt("中度 (Medium)", "Medium"), value: "medium" },
                    { label: tt("深度 (High)", "High"), value: "high" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* 3. Global System Prompt Injection */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="terminal" size={18} />
              <span>{tt("全局系统提示词策略 (System Prompt)", "Global System Prompt Policy")}</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              loading={updatePromptMutation.isPending}
              onClick={() => promptForm.submit()}
            >
              {tt("保存提示词", "Save Prompt")}
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Form
          form={promptForm}
          layout="vertical"
          onFinish={(v) => updatePromptMutation.mutate(v)}
        >
          <Form.Item
            label={tt("注入生效模式", "Injection Mode")}
            name="mode"
            tooltip={tt("passthrough: 不修改; prepend: 前置追加; replace: 强制覆盖客户端第一条 system", "Prompt behavior")}
          >
            <Radio.Group>
              <Radio.Button value="passthrough">{tt("原始透传 (Passthrough)", "Passthrough")}</Radio.Button>
              <Radio.Button value="prepend">{tt("前置追加 (Prepend)", "Prepend")}</Radio.Button>
              <Radio.Button value="replace">{tt("强制覆盖 (Replace)", "Replace")}</Radio.Button>
            </Radio.Group>
          </Form.Item>

          <Form.Item
            label={tt("系统提示词内容 (Custom System Prompt)", "Custom System Prompt Content")}
            name="customPrompt"
          >
            <TextArea
              rows={4}
              placeholder={tt("输入要全局注入给上游 LLM 的通用约束或安全规范...", "Enter system prompt instructions injected to upstream models...")}
            />
          </Form.Item>
        </Form>
      </Card>

      {/* 4. Responses State, Buffer & Codex/Claude Fast Mode */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="speed" size={18} />
              <span>{tt("会话状态与极速加速通道", "Session State & Fast-Tier Channels")}</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              loading={updateSettingsMutation.isPending}
              onClick={() => generalAiForm.submit()}
            >
              {tt("保存加速设置", "Save Fast-Tier")}
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Form
          form={generalAiForm}
          layout="vertical"
          onFinish={(v) => updateSettingsMutation.mutate(v)}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("多轮会话状态策略 (Responses State Policy)", "Responses State Policy")}
                name="responsesStatePolicy"
                tooltip={tt("控制网关对会话中间轮次历史与多轮状态的暂存或裁剪机制", "Stateless vs stateful session handling")}
              >
                <Select
                  options={[
                    { label: tt("无感透传 (Passthrough)", "Passthrough"), value: "passthrough" },
                    { label: tt("无状态剥离 (Stateless)", "Stateless"), value: "stateless" },
                    { label: tt("状态保活暂存 (Stateful)", "Stateful"), value: "stateful" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("用量预警缓冲池 (Usage Token Buffer)", "Usage Token Buffer")}
                name="usageTokenBuffer"
                tooltip={tt("在配额接近耗尽时预留的安全缓冲 Token 数量", "Buffer tokens reserved before hard stop")}
              >
                <InputNumber min={0} max={100000} step={500} style={{ width: "100%" }} addonAfter="Tokens" />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "12px 0" }} />

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Flex justify="space-between" align="center" style={{ padding: "4px 0" }}>
                <div>
                  <Text strong>{tt("Codex 极速通道 (Fast Tier)", "Codex Fast Tier")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("优先调度至超低延迟 Codex 上游", "Low-latency tier for Codex")}
                  </Text>
                </div>
                <Form.Item name="codexFastTier" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>
            </Col>

            <Col xs={24} sm={8}>
              <Flex justify="space-between" align="center" style={{ padding: "4px 0" }}>
                <div>
                  <Text strong>{tt("Codex 探活保活 (Auto Ping)", "Codex Auto Ping")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("定时心跳防长连接冷启动", "Heartbeat to prevent cold starts")}
                  </Text>
                </div>
                <Form.Item name="codexAutoPing" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>
            </Col>

            <Col xs={24} sm={8}>
              <Flex justify="space-between" align="center" style={{ padding: "4px 0" }}>
                <div>
                  <Text strong>{tt("Claude 极速模式 (Fast Mode)", "Claude Fast Mode")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {tt("启用 Claude 3.5/3.7 快速响应参数", "Fast mode flags for Claude models")}
                  </Text>
                </div>
                <Form.Item name="claudeFastMode" valuePropName="checked" noStyle>
                  <Switch />
                </Form.Item>
              </Flex>
            </Col>
          </Row>
        </Form>
      </Card>
    </div>
  );
}

export default SettingsAiPage;
