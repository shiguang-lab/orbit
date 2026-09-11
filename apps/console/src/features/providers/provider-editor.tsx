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
import { getWebSessionCredentialRequirement } from "@orbit/contracts/config/webSessionCredentials";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const useStyles = createStyles(({ token }) => ({
  page: { maxWidth: 860, margin: "0 auto" },
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
  const { id, providerId } = useParams<{ id?: string; providerId?: string }>();
  const [searchParams] = useSearchParams();
  const [form] = Form.useForm<ProviderFormValues>();
  const watchedProvider = Form.useWatch("provider", form);
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
  const currentProvider = watchedProvider || connectionQuery.data?.connection?.provider || providerId || providerHint;
  const webSessionReq = useMemo(() => getWebSessionCredentialRequirement(currentProvider), [currentProvider]);
  const webSessionRequirement = webSessionReq && webSessionReq.kind !== "none" ? webSessionReq : null;
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
        <Button icon={<MaterialIcon name="arrow_back" />} onClick={() => navigate(currentProvider ? `/dashboard/providers/${currentProvider}` : "/dashboard/providers")}>{t("providerEditor.back")}</Button>
        {isEdit && <Button danger icon={<MaterialIcon name="delete" />} loading={deleteMutation.isPending} onClick={() => {
          Modal.confirm({ title: t("providerEditor.deleteConfirm"), content: t("providerEditor.deleteDescription"), okText: t("providers.delete"), okButtonProps: { danger: true }, cancelText: t("providers.cancel"), onOk: () => deleteMutation.mutateAsync() });
        }}>{t("providers.delete")}</Button>}
      </div>
      <Card title={isEdit ? t("providerEditor.edit") : kind ? t("providerEditor.addCompatible", { type: kind.includes("anthropic") ? "Anthropic" : kind.includes("openai") ? "OpenAI" : "CC" }) : t("providerEditor.add")}>
        <Typography.Paragraph className={styles.hint}>
          {t("providerEditor.hint")}
        </Typography.Paragraph>
        {currentProvider === "deepseek-web" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="DeepSeek Web 会话凭据 (userToken) 获取说明"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>1. 打开并登录 <a href="https://chat.deepseek.com" target="_blank" rel="noreferrer">chat.deepseek.com</a>。</div>
                <div>2. 按 F12 打开开发者工具 → <b>Application</b>（应用程序）→ <b>Storage</b> → <b>Local Storage</b> → <code>https://chat.deepseek.com</code>。</div>
                <div>3. 找到 <b><code>userToken</code></b> 并复制其 Value，填入下方的凭据输入框。</div>
                <div style={{ marginTop: 4 }}>💡 <b>双 Token 说明</b>：系统后端已内置自动换票和刷新机制，<b>仅需填写此单个 userToken</b>，后端会自动换取临时 accessToken，无需也不需要提供双 Token。</div>
                {isEdit && <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>编辑提示：下方输入框留空表示保留现有已保存的 userToken。</div>}
              </div>
            }
          />
        ) : currentProvider === "kimi-web" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Kimi Web 会话凭据 (双 Token 自动续期) 说明"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>1. 打开并登录 <a href="https://www.kimi.com" target="_blank" rel="noreferrer">www.kimi.com</a>。</div>
                <div>2. 按 F12 打开开发者工具 → <b>Application</b> → <b>Storage</b> → <b>Local Storage</b> → <code>https://www.kimi.com</code>。</div>
                <div>3. 复制 <b><code>access_token</code></b> 填入下方的凭据输入框。</div>
                <div>4. <b>双 Token 自动续期（推荐）</b>：复制 <b><code>refresh_token</code></b>，写入下方 Provider 专属配置：<code>{`{ "refreshToken": "..." }`}</code>。</div>
                <div style={{ marginTop: 4, color: "var(--ant-color-success)" }}>⚡ <b>自动续期优势</b>：配置 refresh_token 后，系统将在 access_token 到期前自动换票轮换，实现长效保活。</div>
                {isEdit && <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>编辑提示：下方输入框留空表示保留现有已保存凭据。</div>}
              </div>
            }
          />
        ) : currentProvider === "zai-web" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Z.ai Web 会话凭证 (token) 获取说明"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>1. 打开并登录 <a href="https://chat.z.ai" target="_blank" rel="noreferrer">chat.z.ai</a>。</div>
                <div>2. 按 F12 打开开发者工具 → <b>Application</b> → <b>Storage</b> → <b>Local Storage</b> → <code>https://chat.z.ai</code>。</div>
                <div>3. 找到 <b><code>token</code></b> 并仅复制其 Value 粘贴到下方。切勿复制 Cookie 请求头。</div>
                {isEdit && <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>编辑提示：下方输入框留空表示保留现有已保存凭据。</div>}
              </div>
            }
          />
        ) : currentProvider === "grok-web" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="Grok Web 会话凭据 (sso & sso-rw) 说明"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>1. 打开并登录 <a href="https://grok.com" target="_blank" rel="noreferrer">grok.com</a>。</div>
                <div>2. 按 F12 打开开发者工具 → <b>Network</b> 面板刷新，从任一发往 grok.com 的请求头中复制包含 <b><code>sso</code></b> 和 <b><code>sso-rw</code></b> 的 Cookie 字符串。</div>
                <div style={{ marginTop: 4, color: "var(--ant-color-warning)" }}>💡 <b>指纹说明</b>：Cloudflare 将验证绑定到浏览器的 IP、User-Agent 和 TLS 指纹，建议配合代理与同 UA 使用。</div>
                {isEdit && <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>编辑提示：下方输入框留空表示保留现有已保存凭据。</div>}
              </div>
            }
          />
        ) : currentProvider === "chatgpt-web" ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message="ChatGPT Web 会话凭据 (Playwright storageState) 说明"
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                <div>1. 在专用浏览器环境中登录 <a href="https://chatgpt.com" target="_blank" rel="noreferrer">chatgpt.com</a>。</div>
                <div>2. 导出该环境的 Playwright 兼容 <b>storageState</b> JSON（包含 cookies 与 origins）并完整粘贴到下方凭据框。</div>
                {isEdit && <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>编辑提示：下方输入框留空表示保留现有已保存凭据。</div>}
              </div>
            }
          />
        ) : webSessionRequirement ? (
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`${currentProvider} Web 会话凭据获取说明`}
            description={
              <div style={{ fontSize: 13, lineHeight: 1.6 }}>
                {webSessionRequirement.guideSteps && webSessionRequirement.guideSteps.length > 0 ? (
                  webSessionRequirement.guideSteps.map((step: string, idx: number) => (
                    <div key={idx}>{idx + 1}. {step}</div>
                  ))
                ) : (
                  <>
                    <div>1. 打开并登录 {currentProvider} 官网。</div>
                    <div>2. 按 F12 打开开发者工具，切换到 Application 或 Network 面板。</div>
                    <div>
                      3. {webSessionRequirement.kind === "token"
                        ? `从 Local Storage 中复制 ${webSessionRequirement.credentialName} 的 Value。`
                        : `从 Cookies 中复制包含 ${webSessionRequirement.credentialName} 的完整 Cookie。`}
                    </div>
                  </>
                )}
                {webSessionRequirement.hintFallback && <div style={{ marginTop: 4, color: "var(--ant-color-warning)" }}>💡 {webSessionRequirement.hintFallback}</div>}
                {webSessionRequirement.guideNote && <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>📌 {webSessionRequirement.guideNote}</div>}
                {isEdit && <div style={{ marginTop: 4, color: "var(--ant-color-text-tertiary)" }}>编辑提示：下方输入框留空表示保留现有已保存凭据。</div>}
              </div>
            }
          />
        ) : null}
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
          <Form.Item
            name="apiKey"
            label={
              currentProvider === "deepseek-web"
                ? "userToken (Web 会话凭据)"
                : webSessionRequirement?.credentialName
                ? `${webSessionRequirement.credentialName} (${webSessionRequirement.kind === "token" ? "Web 会话令牌" : "Web 会话凭据"})`
                : "API Key"
            }
            extra={
              currentProvider === "deepseek-web"
                ? "系统会自动换取并刷新 accessToken，仅需在此填入 userToken（无需双 Token）。"
                : currentProvider === "kimi-web"
                ? "主凭据填写 access_token。如需开启静默长效自动续期，可在下方 Provider 专属配置中加入 {\"refreshToken\": \"...\"}。"
                : undefined
            }
          >
            <Input.Password
              placeholder={
                currentProvider === "deepseek-web"
                  ? (isEdit ? "留空保持现有 userToken" : "userToken=... 或直接粘贴 userToken")
                  : webSessionRequirement?.placeholder
                  ? (isEdit ? `留空保持现有凭据 (${webSessionRequirement.credentialName})` : webSessionRequirement.placeholder)
                  : (isEdit ? t("providerEditor.keepApiKey") : t("providerEditor.enterApiKey"))
              }
            />
          </Form.Item>
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
