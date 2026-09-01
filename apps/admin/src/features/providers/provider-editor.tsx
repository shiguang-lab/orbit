import { useEffect, useMemo, useState } from "react";
import { createStyles } from "antd-style";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import {
  Alert,
  Button,
  Card,
  Descriptions,
  Form,
  Input,
  InputNumber,
  Modal,
  Select,
  Space,
  Tabs,
  Switch,
  Table,
  Typography,
  message,
} from "antd";
import { providersApi } from "@/entities/api";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const useStyles = createStyles(({ token }) => ({
  page: { maxWidth: 860, margin: "0 auto", paddingBottom: 32 },
  actions: { display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 },
  hint: { color: token.colorTextSecondary, marginTop: -6 },
}));

type ProviderFormValues = {
  provider: string;
  name: string;
  apiKey?: string;
  baseUrl?: string;
  authType?: string;
  defaultModel?: string;
  priority?: number;
  isActive?: boolean;
  providerSpecificData?: string;
};

export default function ProviderEditorPage() {
  const { styles } = useStyles();
  const { t } = useI18n();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<ProviderFormValues>();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [testResult, setTestResult] = useState<{ valid: boolean; latencyMs?: number; error?: string } | null>(null);
  const [paramFiltersText, setParamFiltersText] = useState("");
  const [interceptionRulesText, setInterceptionRulesText] = useState("");
  const [newModelId, setNewModelId] = useState("");
  const [newModelName, setNewModelName] = useState("");
  const isEdit = Boolean(id);
  const providerHint = searchParams.get("provider") ?? "";
  const kind = searchParams.get("kind");

  const catalogQuery = useQuery({
    queryKey: ["providers", "catalog"],
    queryFn: () => providersApi.catalog(),
    staleTime: 5 * 60_000,
  });
  const connectionQuery = useQuery({
    queryKey: ["providers", id],
    queryFn: () => providersApi.get(id!),
    enabled: isEdit,
  });
  const modelsQuery = useQuery({ queryKey: ["providers", id, "models"], queryFn: () => providersApi.models(id!), enabled: isEdit });
  const paramFiltersQuery = useQuery({ queryKey: ["providers", id, "param-filters"], queryFn: () => providersApi.paramFilters(id!), enabled: isEdit });
  const interceptionQuery = useQuery({ queryKey: ["providers", id, "interception-rules"], queryFn: () => providersApi.interceptionRules(id!), enabled: isEdit });
  const providerOptions = useMemo(
    () => {
      const options = (catalogQuery.data?.categories ?? []).flatMap((category) => category.providers
      .filter((provider) => !provider.hiddenFromDashboard)
      .map((provider) => ({ label: `${provider.name} (${provider.id})`, value: provider.id })));
      if (providerHint && !options.some((option) => option.value === providerHint)) options.push({ label: providerHint, value: providerHint });
      if (kind && !options.some((option) => option.value === `${kind}-endpoint`)) options.push({ label: `${kind}-endpoint`, value: `${kind}-endpoint` });
      return options;
    },
    [catalogQuery.data, kind, providerHint],
  );

  useEffect(() => {
    const connection = connectionQuery.data?.connection;
    if (connection) {
      form.setFieldsValue({
        provider: connection.provider,
        name: connection.name,
        // Masked keys must never be copied back into an update payload.
        apiKey: "",
        baseUrl: connection.baseUrl,
        authType: connection.authType,
        defaultModel: connection.defaultModel,
        priority: connection.priority,
        isActive: connection.isActive !== false,
        providerSpecificData: connection.providerSpecificData ? JSON.stringify(connection.providerSpecificData, null, 2) : "",
      });
    } else if (!isEdit) {
      const initialProvider = providerHint || (kind ? `${kind}-endpoint` : "");
      form.setFieldsValue({ provider: initialProvider, name: initialProvider ? `${initialProvider} Primary` : undefined, authType: kind?.includes("compatible") ? "compatible" : undefined, priority: 1, isActive: false });
    }
  }, [connectionQuery.data, form, isEdit, kind, providerHint]);
  useEffect(() => {
    if (paramFiltersQuery.data) setParamFiltersText(JSON.stringify(paramFiltersQuery.data, null, 2));
  }, [paramFiltersQuery.data]);
  useEffect(() => {
    if (interceptionQuery.data) setInterceptionRulesText(JSON.stringify(interceptionQuery.data, null, 2));
  }, [interceptionQuery.data]);

  const saveMutation = useMutation({
    mutationFn: async (values: ProviderFormValues) => {
      let providerSpecificData: unknown;
      if (values.providerSpecificData?.trim()) {
        try { providerSpecificData = JSON.parse(values.providerSpecificData); } catch { throw new Error("Provider 专属配置必须是有效 JSON"); }
      }
      const { providerSpecificData: _rawProviderSpecificData, ...rest } = values;
      const payload: Record<string, unknown> = { ...rest };
      if (providerSpecificData !== undefined) payload.providerSpecificData = providerSpecificData;
      if (!values.apiKey?.trim()) delete payload.apiKey;
      if (isEdit) return providersApi.update(id!, payload);
      return providersApi.create(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      messageApi.success(isEdit ? "Provider 已保存" : "Provider 已添加");
      navigate("/dashboard/providers");
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "保存失败"),
  });
  const deleteMutation = useMutation({
    mutationFn: () => providersApi.remove(id!),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers"] }); navigate("/dashboard/providers"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "删除失败"),
  });
  const testMutation = useMutation({
    mutationFn: () => providersApi.test(id!),
    onSuccess: (item) => {
      setTestResult(item ? { valid: item.valid, latencyMs: item.latencyMs, error: item.error } : { valid: false, error: "没有返回测试结果" });
      void queryClient.invalidateQueries({ queryKey: ["providers", id] });
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
      if (item?.valid) messageApi.success(`连接测试通过${item.latencyMs ? `（${item.latencyMs} ms）` : ""}`);
      else messageApi.error(item?.error || "连接测试失败");
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "测试失败"),
  });
  const saveDetailConfig = useMutation({
    mutationFn: async ({ kind: configKind, text }: { kind: "params" | "interception"; text: string }) => {
      let config: unknown;
      try { config = JSON.parse(text); } catch { throw new Error("配置必须是有效 JSON"); }
      if (!config || typeof config !== "object" || Array.isArray(config)) throw new Error("配置必须是 JSON 对象");
      return configKind === "params" ? providersApi.updateParamFilters(id!, config as Record<string, unknown>) : providersApi.updateInterceptionRules(id!, config as Record<string, unknown>);
    },
    onSuccess: (_result, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["providers", id, variables.kind === "params" ? "param-filters" : "interception-rules"] });
      messageApi.success("配置已保存");
    },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "配置保存失败"),
  });
  const modelMutation = useMutation({
    mutationFn: async ({ action, modelId, modelName }: { action: "add" | "remove"; modelId: string; modelName?: string }): Promise<unknown> => action === "add" ? providersApi.addModel(id!, modelId, modelName) : providersApi.removeModel(id!, modelId),
    onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["providers", id, "models"] }); setNewModelId(""); setNewModelName(""); messageApi.success("模型配置已更新"); },
    onError: (error) => messageApi.error(error instanceof Error ? error.message : "模型操作失败"),
  });

  if (isEdit && connectionQuery.isLoading) return <PageSkeleton />;
  if (isEdit && connectionQuery.isError) return <Alert type="error" title="Provider 加载失败" description={connectionQuery.error instanceof Error ? connectionQuery.error.message : "无法读取连接"} />;

  return (
    <div className={styles.page}>
      {contextHolder}
      <div className={styles.actions}>
        <Button icon={<MaterialIcon name="arrow_back" />} onClick={() => navigate("/dashboard/providers")}>{t("providerEditor.back")}</Button>
        {isEdit && <Button danger icon={<MaterialIcon name="delete" />} loading={deleteMutation.isPending} onClick={() => {
          Modal.confirm({ title: t("providerEditor.deleteConfirm"), content: t("providerEditor.deleteDescription"), okText: t("providers.delete"), okButtonProps: { danger: true }, cancelText: t("providers.cancel"), onOk: () => deleteMutation.mutateAsync() });
        }}>{t("providers.delete")}</Button>}
      </div>
      <Card title={isEdit ? t("providerEditor.edit") : kind ? t("providerEditor.addCompatible", { type: kind.includes("anthropic") ? "Anthropic" : kind.includes("openai") ? "OpenAI" : "CC" }) : t("providerEditor.add")}>
        <Typography.Paragraph className={styles.hint}>
          {t("providerEditor.hint")}
        </Typography.Paragraph>
        {isEdit && connectionQuery.data?.connection && (
          <Descriptions size="small" column={{ xs: 1, sm: 2 }} bordered style={{ marginBottom: 20 }}>
            <Descriptions.Item label={t("providerEditor.connectionId")}>{connectionQuery.data.connection.id}</Descriptions.Item>
            <Descriptions.Item label={t("providerEditor.currentStatus")}>{connectionQuery.data.connection.isActive === false ? t("providers.statusDisabled") : t("apiKeys.active")}</Descriptions.Item>
            <Descriptions.Item label={t("providerEditor.testStatus")}>{connectionQuery.data.connection.testStatus ?? t("providerEditor.unknown")}</Descriptions.Item>
            <Descriptions.Item label={t("providerEditor.lastError")}>{connectionQuery.data.connection.lastError || t("providerEditor.none")}</Descriptions.Item>
          </Descriptions>
        )}
        {testResult && <Alert type={testResult.valid ? "success" : "error"} showIcon title={testResult.valid ? `${t("providerEditor.connectionAvailable")}${testResult.latencyMs ? ` · ${testResult.latencyMs} ms` : ""}` : t("providerEditor.connectionUnavailable")} description={testResult.error} style={{ marginBottom: 16 }} />}
        <Form form={form} layout="vertical" onFinish={(values) => saveMutation.mutate(values)}>
          <Form.Item name="provider" label={t("providerEditor.provider")} rules={[{ required: true, message: t("providerEditor.providerRequired") }]}>
            <Select showSearch allowClear options={providerOptions} placeholder={t("providerEditor.selectProvider")} optionFilterProp="label" disabled={isEdit} />
          </Form.Item>
          <Form.Item name="name" label={t("providerEditor.connectionName")} rules={[{ required: true, message: t("providerEditor.connectionNameRequired") }]}>
            <Input placeholder="例如：Primary" />
          </Form.Item>
          <Form.Item name="authType" label={t("providerEditor.authType")}>
            <Select allowClear options={["apikey", "oauth", "web-cookie", "compatible", "no-auth", "local"].map((value) => ({ label: value, value }))} />
          </Form.Item>
          <Form.Item name="apiKey" label="API Key"><Input.Password placeholder={isEdit ? t("providerEditor.keepApiKey") : t("providerEditor.enterApiKey")} /></Form.Item>
          <Form.Item name="baseUrl" label="Base URL"><Input placeholder="https://api.example.com/v1" /></Form.Item>
          <Space.Compact block>
            <Form.Item name="defaultModel" label={t("providerEditor.defaultModel")} style={{ flex: 1 }}><Input placeholder={t("providerEditor.optional")} /></Form.Item>
            <Form.Item name="priority" label={t("providers.priority")} style={{ width: 140 }}><InputNumber min={0} style={{ width: "100%" }} /></Form.Item>
          </Space.Compact>
          <Form.Item name="providerSpecificData" label={t("providerEditor.providerConfig")}><Input.TextArea autoSize={{ minRows: 4, maxRows: 12 }} placeholder={t("providerEditor.providerConfigPlaceholder")} /></Form.Item>
          {isEdit && <Form.Item name="isActive" label={t("providerEditor.enableConnection")} valuePropName="checked"><Switch /></Form.Item>}
          <Space>
            <Button type="primary" htmlType="submit" icon={<MaterialIcon name="save" />} loading={saveMutation.isPending}>{t("providers.save")}</Button>
            {isEdit && <Button icon={<MaterialIcon name="play_circle" />} loading={testMutation.isPending} onClick={() => testMutation.mutate()}>{t("providerEditor.testConnection")}</Button>}
          </Space>
        </Form>
      </Card>
      {isEdit && <Tabs
        items={[
          {
            key: "models",
            label: t("providerEditor.models", { count: (modelsQuery.data?.models.length ?? 0) + (modelsQuery.data?.customModels.length ?? 0) }),
            children: <Card title={t("providers.availableModels")} loading={modelsQuery.isLoading} extra={<Space><Input size="small" value={newModelId} onChange={(event) => setNewModelId(event.target.value)} placeholder={t("providers.modelId")} /><Input size="small" value={newModelName} onChange={(event) => setNewModelName(event.target.value)} placeholder={t("providers.displayNameOptional")} /><Button size="small" type="primary" disabled={!newModelId.trim()} loading={modelMutation.isPending} onClick={() => modelMutation.mutate({ action: "add", modelId: newModelId.trim(), modelName: newModelName.trim() || undefined })}>{t("providers.add")}</Button></Space>}>
              <Table
                size="small"
                rowKey={(row) => `${String(row.id)}-${row._custom ? "custom" : "catalog"}`}
                pagination={{ pageSize: 10, showSizeChanger: true }}
                dataSource={[...(modelsQuery.data?.models ?? []).map((row) => ({ ...row, _custom: false })), ...(modelsQuery.data?.customModels ?? []).map((row) => ({ ...row, _custom: true }))]}
                columns={[{ title: t("providers.modelId"), dataIndex: "id", key: "id" }, { title: t("apiKeys.name"), dataIndex: "name", key: "name", render: (value: unknown, row: Record<string, unknown>) => String(value || row.id || "-") }, { title: t("providerEditor.source"), dataIndex: "source", key: "source", render: (value: unknown) => String(value || "catalog") }, { title: t("apiKeys.actions"), key: "actions", align: "right", render: (_value: unknown, row: Record<string, unknown>) => row._custom ? <Button type="link" danger size="small" onClick={() => modelMutation.mutate({ action: "remove", modelId: String(row.id) })}>{t("providers.delete")}</Button> : null }]}
              />
            </Card>,
          },
          {
            key: "behavior",
            label: t("providerEditor.requestBehavior"),
            children: <Space direction="vertical" size={16} style={{ width: "100%" }}>
              <Card title={t("providers.parameterFilters")} extra={<Space><Button size="small" onClick={() => { void providersApi.deleteParamFilters(id!).then(() => { setParamFiltersText(JSON.stringify({ block: [], allow: [], autoLearn: false }, null, 2)); void paramFiltersQuery.refetch(); }); }}>{t("providers.reset")}</Button><Button size="small" type="primary" loading={saveDetailConfig.isPending} onClick={() => saveDetailConfig.mutate({ kind: "params", text: paramFiltersText })}>{t("providers.save")}</Button></Space>}>
                <Input.TextArea value={paramFiltersText} onChange={(event) => setParamFiltersText(event.target.value)} autoSize={{ minRows: 5, maxRows: 12 }} />
              </Card>
              <Card title={t("providers.webInterceptionRules")} extra={<Space><Button size="small" onClick={() => { void providersApi.deleteInterceptionRules(id!).then(() => { setInterceptionRulesText(JSON.stringify({ interceptSearch: undefined, interceptFetch: undefined }, null, 2)); void interceptionQuery.refetch(); }); }}>{t("providers.reset")}</Button><Button size="small" type="primary" loading={saveDetailConfig.isPending} onClick={() => saveDetailConfig.mutate({ kind: "interception", text: interceptionRulesText })}>{t("providers.save")}</Button></Space>}>
                <Input.TextArea value={interceptionRulesText} onChange={(event) => setInterceptionRulesText(event.target.value)} autoSize={{ minRows: 5, maxRows: 12 }} />
              </Card>
            </Space>,
          },
        ]}
      />}
    </div>
  );
}
