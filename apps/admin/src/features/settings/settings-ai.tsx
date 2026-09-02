import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Radio,
  Row,
  Select,
  Slider,
  Switch,
  Table,
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

interface ModelAlias {
  id: string;
  alias: string;
  target: string;
  enabled: boolean;
  notes?: string;
}

export function SettingsAiPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasForm] = Form.useForm();
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-ai-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const [aliases, setAliases] = useState<ModelAlias[]>([
    { id: "1", alias: "gpt-4o", target: "deepseek-chat", enabled: true, notes: "将前端 GPT-4o 请求静默重定向至 DeepSeek-V3" },
    { id: "2", alias: "claude-3-5-sonnet-20241022", target: "claude-3-7-sonnet-thinking", enabled: true, notes: "升级 Sonnet 3.5 请求至 3.7" },
    { id: "3", alias: "text-embedding-ada-002", target: "text-embedding-3-small", enabled: true, notes: "嵌入模型现代换代" },
  ]);

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("AI 全局推理设置已成功保存", "AI inference settings saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-ai-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存 AI 设置失败", "Failed to save AI settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate({ ...values, modelAliases: aliases });
  };

  const handleAddAlias = (values: any) => {
    const newAlias: ModelAlias = {
      id: String(Date.now()),
      alias: values.alias.trim(),
      target: values.target.trim(),
      enabled: true,
      notes: values.notes,
    };
    setAliases((prev) => [...prev, newAlias]);
    setAliasModalOpen(false);
    aliasForm.resetFields();
    messageApi.success(tt("已添加模型重定向别名", "Added model alias redirection"));
  };

  const handleDeleteAlias = (id: string) => {
    setAliases((prev) => prev.filter((a) => a.id !== id));
    messageApi.success(tt("已删除模型别名", "Deleted model alias"));
  };

  const handleToggleAlias = (id: string, enabled: boolean) => {
    setAliases((prev) => prev.map((a) => (a.id === id ? { ...a, enabled } : a)));
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
                background: "rgba(245, 158, 11, 0.12)",
                color: "#f59e0b",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="auto_awesome" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("AI 推理与全局模型默认配置", "AI Inference & Model Defaults")}
                </Title>
                <Tag color="gold">{tt("模型重定向与推理链", "Model Aliases & Reasoning")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置全局默认模型映射、别名重定向、Thinking 深度思考预算与系统级前置提示词注入。",
                  "Configure default models, alias mapping, reasoning budgets, and system prompt injection."
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
            {tt("保存 AI 设置", "Save AI Settings")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          defaultModel: s.defaultModel || "deepseek-chat",
          stripThinkingTags: s.stripThinkingTags ?? false,
          enableReasoningBudget: s.enableReasoningBudget ?? true,
          reasoningEffort: s.reasoningEffort || "medium",
          maxReasoningTokens: s.maxReasoningTokens || 8192,
          codexFastTierEnabled: s.codexFastTierEnabled ?? false,
          claudeFastModeEnabled: s.claudeFastModeEnabled ?? false,
          systemPromptInjectionMode: s.systemPromptInjectionMode || "prefix",
          globalSystemPrompt: s.globalSystemPrompt || "",
        }}
        onFinish={handleSave}
      >
        {/* 2. Default Model & Global Reasoning Config */}
        <Card title={tt("默认兜底模型与深度思考 (Reasoning) 配置", "Default Models & Reasoning Settings")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("网关全局默认模型 (Default Fallback Model)", "Gateway Default Fallback Model")} name="defaultModel">
                <Select
                  options={[
                    { label: "DeepSeek-V3 (推荐)", value: "deepseek-chat" },
                    { label: "DeepSeek-R1 (深度长思考推理)", value: "deepseek-reasoner" },
                    { label: "Claude 3.7 Sonnet (Thinking)", value: "claude-3-7-sonnet" },
                    { label: "Claude 3.5 Sonnet", value: "claude-3-5-sonnet" },
                    { label: "GPT-4o", value: "gpt-4o" },
                    { label: "Gemini 2.5 Pro", value: "gemini-2.5-pro" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("自动剥离 DeepSeek-R1 / o1 <think> 思考标签", "Strip <think> Reasoning Tags for R1 / o1")}
                name="stripThinkingTags"
                valuePropName="checked"
                tooltip={tt("开启后将在返回给客户端前剔除 <think>...</think>，仅保留最终回答正文", "Remove <think> blocks before returning response to client")}
              >
                <Switch checkedChildren={tt("自动剥离", "Strip")} unCheckedChildren={tt("完整输出", "Preserve")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("思考强度 (Reasoning Effort)", "Reasoning Effort")} name="reasoningEffort">
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="low">{tt("低 (Low)", "Low")}</Radio.Button>
                  <Radio.Button value="medium">{tt("中 (Medium)", "Medium")}</Radio.Button>
                  <Radio.Button value="high">{tt("高 (High)", "High")}</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label={tt("思考预算 Token 上限 (Thinking Budget Tokens)", "Max Thinking Budget Tokens")} name="maxReasoningTokens">
                <Slider min={1024} max={64000} step={1024} marks={{ 1024: "1k", 8192: "8k", 32000: "32k", 64000: "64k" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("开启 Codex Fast Tier 极速通道", "Enable Codex Fast Tier")} name="codexFastTierEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启", "Enabled")} unCheckedChildren={tt("标准通道", "Standard")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("开启 Claude Fast Mode 提速", "Enable Claude Fast Mode")} name="claudeFastModeEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启", "Enabled")} unCheckedChildren={tt("标准通道", "Standard")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 3. Global Model Aliases */}
        <Card
          title={tt("全局虚拟模型别名与请求重定向 (Model Aliases)", "Virtual Model Aliases & Request Rewriting")}
          className={styles.sectionCard}
          size="small"
          extra={
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="add" size={14} />}
              onClick={() => setAliasModalOpen(true)}
            >
              {tt("添加模型别名映射", "Add Model Alias")}
            </Button>
          }
        >
          <Table<ModelAlias>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={aliases}
            columns={[
              {
                title: tt("虚拟别名 (请求模型 ID)", "Requested Alias ID"),
                dataIndex: "alias",
                key: "alias",
                render: (val) => <code>{val}</code>,
              },
              {
                title: tt("重定向目标模型 (Target Model)", "Target Model"),
                dataIndex: "target",
                key: "target",
                render: (val) => <Tag color="blue">{val}</Tag>,
              },
              {
                title: tt("备注说明", "Notes"),
                dataIndex: "notes",
                key: "notes",
                render: (n) => <span style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>{n || "-"}</span>,
              },
              {
                title: tt("状态", "Status"),
                dataIndex: "enabled",
                key: "enabled",
                render: (enabled, record) => (
                  <Switch
                    size="small"
                    checked={enabled}
                    onChange={(checked) => handleToggleAlias(record.id, checked)}
                  />
                ),
              },
              {
                title: tt("操作", "Action"),
                key: "action",
                render: (_, record) => (
                  <Popconfirm
                    title={tt("确定删除此别名重定向规则吗？", "Delete this alias rule?")}
                    onConfirm={() => handleDeleteAlias(record.id)}
                    okText={tt("删除", "Delete")}
                    cancelText={tt("取消", "Cancel")}
                  >
                    <Button type="text" danger size="small" icon={<MaterialIcon name="delete" size={14} />} />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Card>

        {/* 4. Global System Prompt Injection */}
        <Card title={tt("全局前置系统提示词注入 (System Prompt & Persona)", "System Prompt & Persona Injection")} className={styles.sectionCard} size="small">
          <Form.Item label={tt("注入位置模式", "Injection Position Mode")} name="systemPromptInjectionMode">
            <Radio.Group>
              <Radio value="prefix">{tt("前置注入 (Prefix - 拼接到原始 System Prompt 之前)", "Prefix (Prepend before incoming system prompt)")}</Radio>
              <Radio value="suffix">{tt("后置追加 (Suffix - 拼接到原始 System Prompt 之后)", "Suffix (Append after incoming system prompt)")}</Radio>
              <Radio value="override">{tt("强制覆盖 (Override - 替换所有客户端传递的 System 消息)", "Override (Replace all client system messages)")}</Radio>
            </Radio.Group>
          </Form.Item>

          <Form.Item label={tt("提示词内容模板", "Prompt Template")} name="globalSystemPrompt">
            <Input.TextArea
              rows={4}
              placeholder={tt(
                "在此处输入对所有流经网关请求强制生效的系统级守则（如代码规范、合规要求、安全约束等，留空则不注入）...",
                "Enter system-wide rules enforced across all gateway traffic (leave empty to skip)..."
              )}
            />
          </Form.Item>
        </Card>
      </Form>

      {/* Add Alias Modal */}
      <Modal
        title={tt("添加虚拟模型别名映射", "Add Model Alias")}
        open={aliasModalOpen}
        onOk={() => aliasForm.submit()}
        onCancel={() => setAliasModalOpen(false)}
        okText={tt("确认添加", "Add Alias")}
        cancelText={tt("取消", "Cancel")}
      >
        <Form form={aliasForm} layout="vertical" onFinish={handleAddAlias} style={{ marginTop: 12 }}>
          <Form.Item
            label={tt("客户端请求的模型名称 (Alias ID)", "Requested Model Alias ID")}
            name="alias"
            rules={[{ required: true, message: tt("请输入请求别名，例如 gpt-4o", "Please input alias, e.g. gpt-4o") }]}
          >
            <Input placeholder="gpt-4o" />
          </Form.Item>
          <Form.Item
            label={tt("实际路由转发生效的目标模型 (Target ID)", "Actual Target Model ID")}
            name="target"
            rules={[{ required: true, message: tt("请输入实际模型，例如 deepseek-chat", "Please input target model, e.g. deepseek-chat") }]}
          >
            <Input placeholder="deepseek-chat" />
          </Form.Item>
          <Form.Item label={tt("规则备注说明", "Notes")} name="notes">
            <Input placeholder={tt("例如：将前端老旧 GPT-4 请求平滑转译至低成本模型", "e.g., Rewrite legacy GPT-4 calls to cost-efficient model")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SettingsAiPage;
