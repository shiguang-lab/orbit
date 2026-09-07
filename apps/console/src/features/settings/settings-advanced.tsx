import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Row,
  Select,
  Space,
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
  statCard: {
    borderRadius: 8,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    padding: "8px 12px",
  },
  codeEditor: {
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 1.5,
    borderRadius: 6,
  },
}));

const EMPTY_PAYLOAD_RULES_TEMPLATE = {
  default: [],
  override: [],
  filter: [],
  defaultRaw: [],
};

const SAMPLE_PAYLOAD_RULES = {
  default: [
    {
      match: { model: "claude-*" },
      set: { max_tokens: 4096 },
    },
  ],
  override: [
    {
      match: { provider: "openai" },
      set: { stream: true },
    },
  ],
  filter: [
    {
      match: { model: "gpt-4*" },
      remove: ["thinking"],
    },
  ],
  defaultRaw: [],
};

export function SettingsAdvancedPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  const [activeTab, setActiveTab] = useState<string>("core");
  const [coreForm] = Form.useForm();
  const [cliproxyForm] = Form.useForm();

  const [payloadRulesText, setPayloadRulesText] = useState(
    JSON.stringify(EMPTY_PAYLOAD_RULES_TEMPLATE, null, 2)
  );
  const [importingAuth, setImportingAuth] = useState(false);

  // Queries
  const settingsQuery = useQuery({
    queryKey: ["settings-advanced-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const thinkingBudgetQuery = useQuery({
    queryKey: ["settings-thinking-budget"],
    queryFn: () => settingsApi.getThinkingBudget(),
  });

  const payloadRulesQuery = useQuery({
    queryKey: ["settings-payload-rules"],
    queryFn: () => settingsApi.getPayloadRules(),
  });

  // Sync settings
  useEffect(() => {
    if (settingsQuery.data) {
      const s = settingsQuery.data as any;
      coreForm.setFieldsValue({
        debugMode: s.debugMode === true,
        logToolSources: s.logToolSources === true,
        maxBodySizeMb: typeof s.maxBodySizeMb === "number" ? s.maxBodySizeMb : 50,
        requestTimeoutSec: typeof s.requestTimeoutSec === "number" ? s.requestTimeoutSec : 120,
      });
      cliproxyForm.setFieldsValue({
        cliproxyapi_fallback_enabled: s.cliproxyapi_fallback_enabled === true,
        cliproxyapi_url: s.cliproxyapi_url || "http://127.0.0.1:8317",
        cliproxyapi_fallback_codes: s.cliproxyapi_fallback_codes || "429,500,502,503,504",
      });
    }
  }, [settingsQuery.data, coreForm, cliproxyForm]);

  useEffect(() => {
    if (thinkingBudgetQuery.data) {
      const tb = thinkingBudgetQuery.data;
      coreForm.setFieldsValue({
        thinkingMode: tb.mode || "passthrough",
        thinkingCustomBudget: tb.customBudget || 10240,
        thinkingEffortLevel: tb.effortLevel || "medium",
      });
    }
  }, [thinkingBudgetQuery.data, coreForm]);

  useEffect(() => {
    if (payloadRulesQuery.data) {
      try {
        setPayloadRulesText(JSON.stringify(payloadRulesQuery.data, null, 2));
      } catch {
        setPayloadRulesText(JSON.stringify(EMPTY_PAYLOAD_RULES_TEMPLATE, null, 2));
      }
    }
  }, [payloadRulesQuery.data]);

  // JSON Rule Validation & Counts
  const parsedRules = useMemo(() => {
    try {
      const parsed = JSON.parse(payloadRulesText);
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return { valid: false, error: tt("规则配置必须是 JSON 对象", "Rules must be a JSON object") };
      }
      return {
        valid: true,
        error: null,
        counts: {
          default: Array.isArray(parsed.default) ? parsed.default.length : 0,
          override: Array.isArray(parsed.override) ? parsed.override.length : 0,
          filter: Array.isArray(parsed.filter) ? parsed.filter.length : 0,
          defaultRaw: Array.isArray(parsed.defaultRaw) ? parsed.defaultRaw.length : 0,
        },
      };
    } catch (err: any) {
      return { valid: false, error: err?.message || tt("JSON 语法解析错误", "Invalid JSON syntax") };
    }
  }, [payloadRulesText, tt]);

  // Mutations
  const saveSettingsMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("高级参数配置已保存并生效", "Advanced settings saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-advanced-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存设置失败", "Failed to save settings")),
  });

  const saveThinkingBudgetMutation = useMutation({
    mutationFn: (values: { mode: string; customBudget: number; effortLevel: string }) =>
      settingsApi.updateThinkingBudget(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["settings-thinking-budget"] });
    },
  });

  const savePayloadRulesMutation = useMutation({
    mutationFn: (rules: Record<string, unknown>) => settingsApi.updatePayloadRules(rules),
    onSuccess: () => {
      messageApi.success(tt("载荷改写规则已保存并应用", "Payload rewrite rules saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-payload-rules"] });
    },
    onError: () => messageApi.error(tt("保存载荷改写规则失败", "Failed to save payload rules")),
  });

  if (settingsQuery.isLoading && thinkingBudgetQuery.isLoading) {
    return <PageSkeleton />;
  }

  const handleSaveCore = async (values: any) => {
    try {
      await saveSettingsMutation.mutateAsync({
        debugMode: values.debugMode,
        logToolSources: values.logToolSources,
        maxBodySizeMb: values.maxBodySizeMb,
        requestTimeoutSec: values.requestTimeoutSec,
      });
      await saveThinkingBudgetMutation.mutateAsync({
        mode: values.thinkingMode,
        customBudget: values.thinkingCustomBudget,
        effortLevel: values.thinkingEffortLevel,
      });
      messageApi.success(tt("内核与思考预算设置已保存", "Core and thinking budget settings saved"));
    } catch (err: any) {
      messageApi.error(err?.message || tt("保存失败", "Failed to save"));
    }
  };

  const handleSaveCliproxy = async (values: any) => {
    try {
      await saveSettingsMutation.mutateAsync({
        cliproxyapi_fallback_enabled: values.cliproxyapi_fallback_enabled,
        cliproxyapi_url: values.cliproxyapi_url,
        cliproxyapi_fallback_codes: values.cliproxyapi_fallback_codes,
      });
      messageApi.success(tt("CLI Proxy 回退设置已保存", "CLI Proxy fallback settings saved"));
    } catch (err: any) {
      messageApi.error(err?.message || tt("保存失败", "Failed to save"));
    }
  };

  const handleSavePayloadRules = () => {
    if (!parsedRules.valid) {
      messageApi.error(parsedRules.error || tt("规则格式错误", "Invalid rules format"));
      return;
    }
    try {
      const json = JSON.parse(payloadRulesText);
      savePayloadRulesMutation.mutate(json);
    } catch {
      messageApi.error(tt("JSON 语法解析失败", "JSON parse error"));
    }
  };

  const handleImportCliproxy = async () => {
    setImportingAuth(true);
    try {
      const res = await fetch("/api/oauth/cliproxy-import", { method: "POST" });
      const data = await res.json();
      if (res.ok) {
        messageApi.success(
          tt(
            `成功导入 CLI 凭据：已导入 ${data.imported || 0} 个连接，扫描 ${data.scanned || 0} 个`,
            `Imported ${data.imported || 0} connections, scanned ${data.scanned || 0}`
          )
        );
      } else {
        messageApi.warning(data.error || tt("导入完成或未发现有效凭证", "Import complete or no valid credentials found"));
      }
    } catch {
      messageApi.error(tt("导入 CLI 凭证请求失败", "Failed to import CLI credentials"));
    } finally {
      setImportingAuth(false);
    }
  };

  // Tab 1: 内核诊断与传输控制
  const tabCore = (
    <Form form={coreForm} layout="vertical" onFinish={handleSaveCore}>
      <Flex vertical gap={12}>
        {/* 调试诊断 */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="bug_report" size={18} />
              <span>{tt("调试与调用诊断 (Debugging & Diagnostics)", "Debugging & Diagnostics")}</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Flex justify="space-between" align="center" style={{ padding: "8px 0" }}>
                <div>
                  <Text strong>{tt("全局详细调试模式 (Debug Mode)", "Global Verbose Debug Mode")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("开启后记录完整 HTTP 报文请求响应头与未过滤 Payload 日志。", "Log full HTTP headers and raw request/response payloads.")}
                  </Text>
                </div>
                <Form.Item name="debugMode" valuePropName="checked" noStyle>
                  <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                </Form.Item>
              </Flex>
            </Col>

            <Col xs={24} sm={12}>
              <Flex justify="space-between" align="center" style={{ padding: "8px 0" }}>
                <div>
                  <Text strong>{tt("记录工具源信息 (Log Tool Sources)", "Log Tool Call Sources")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("在调用日志中捕获并记录发起工具调用的来源上下文与执行者元数据。", "Capture and record tool call source contexts in request logs.")}
                  </Text>
                </div>
                <Form.Item name="logToolSources" valuePropName="checked" noStyle>
                  <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                </Form.Item>
              </Flex>
            </Col>
          </Row>
        </Card>

        {/* 传输限制 */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="speed" size={18} />
              <span>{tt("请求传输与超时控制 (Transmission Limits)", "Request Limits & Thresholds")}</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("最大请求体限制 (Request Body Limit)", "Max Request Body Size")}
                name="maxBodySizeMb"
                tooltip={tt("允许上游转发与解析的最大请求体大小，范围 1MB - 500MB", "Max payload size allowed for upstream proxying (1MB - 500MB)")}
              >
                <InputNumber min={1} max={500} style={{ width: "100%" }} addonAfter="MB" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("上游响应超时时间 (Request Timeout)", "Upstream Request Timeout")}
                name="requestTimeoutSec"
                tooltip={tt("单个模型请求等待首字与完整输出的最长等待时间", "Maximum timeout period before upstream request aborts")}
              >
                <InputNumber min={10} max={600} style={{ width: "100%" }} addonAfter={tt("秒", "s")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 思考预算 */}
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="psychology" size={18} />
              <span>{tt("思考预算与推理策略 (Thinking Budget)", "Thinking Budget & Reasoning Strategy")}</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("思考预算控制模式", "Thinking Budget Mode")}
                name="thinkingMode"
                initialValue="passthrough"
              >
                <Select
                  options={[
                    { label: tt("透传客户端指定 (Passthrough - 默认)", "Passthrough (Default)"), value: "passthrough" },
                    { label: tt("智能自动预算 (Auto)", "Auto Budget"), value: "auto" },
                    { label: tt("自定义固定预算 (Custom)", "Custom Fixed"), value: "custom" },
                    { label: tt("动态自适应预算 (Adaptive)", "Adaptive"), value: "adaptive" },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={6}>
              <Form.Item
                label={tt("自定义预算 (Custom Budget)", "Custom Budget Tokens")}
                name="thinkingCustomBudget"
                initialValue={10240}
              >
                <InputNumber min={1024} max={128000} step={1024} style={{ width: "100%" }} addonAfter="Tokens" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={6}>
              <Form.Item
                label={tt("推理强度级别 (Effort)", "Reasoning Effort Level")}
                name="thinkingEffortLevel"
                initialValue="medium"
              >
                <Select
                  options={[
                    { label: tt("无 (None)", "None"), value: "none" },
                    { label: tt("低强度 (Low)", "Low"), value: "low" },
                    { label: tt("中等强度 (Medium)", "Medium"), value: "medium" },
                    { label: tt("高强度 (High)", "High"), value: "high" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        <Flex justify="flex-end">
          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveSettingsMutation.isPending || saveThinkingBudgetMutation.isPending}
            onClick={() => coreForm.submit()}
          >
            {tt("保存内核与思考预算设置", "Save Core Settings")}
          </Button>
        </Flex>
      </Flex>
    </Form>
  );

  // Tab 2: 载荷规则与动态改写
  const tabPayloadRules = (
    <Flex vertical gap={12}>
      {/* 规则统计卡片 */}
      <Row gutter={[12, 12]}>
        {[
          { key: "default", label: tt("Default 默认注入", "Default Rules"), count: parsedRules.counts?.default ?? 0, color: "blue" },
          { key: "override", label: tt("Override 强制覆写", "Override Rules"), count: parsedRules.counts?.override ?? 0, color: "green" },
          { key: "filter", label: tt("Filter 字段过滤", "Filter Rules"), count: parsedRules.counts?.filter ?? 0, color: "orange" },
          { key: "defaultRaw", label: tt("DefaultRaw 原始报文", "Raw Injections"), count: parsedRules.counts?.defaultRaw ?? 0, color: "purple" },
        ].map((item) => (
          <Col xs={12} sm={6} key={item.key}>
            <div className={styles.statCard}>
              <Flex justify="space-between" align="center">
                <Text style={{ fontSize: 12 }}>{item.label}</Text>
                <Tag color={item.color} style={{ margin: 0, fontWeight: 600 }}>
                  {item.count}
                </Tag>
              </Flex>
            </div>
          </Col>
        ))}
      </Row>

      {/* 语法错误提示 */}
      {!parsedRules.valid && (
        <Alert
          type="error"
          showIcon
          message={tt("JSON 语法校验未通过", "Invalid JSON")}
          description={parsedRules.error}
        />
      )}

      {/* 编辑器主卡片 */}
      <Card
        title={
          <Flex justify="space-between" align="center" wrap gap={8}>
            <Flex align="center" gap={8}>
              <MaterialIcon name="code" size={18} />
              <span>{tt("载荷动态改写规则配置 (Payload Rules JSON)", "Payload Transform & Override Rules")}</span>
            </Flex>
            <Space wrap>
              <Button
                size="small"
                onClick={() => setPayloadRulesText(JSON.stringify(SAMPLE_PAYLOAD_RULES, null, 2))}
              >
                {tt("填入示例规则", "Load Sample")}
              </Button>
              <Button
                size="small"
                onClick={() => setPayloadRulesText(JSON.stringify(EMPTY_PAYLOAD_RULES_TEMPLATE, null, 2))}
              >
                {tt("重置为空模板", "Reset Template")}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  try {
                    const obj = JSON.parse(payloadRulesText);
                    setPayloadRulesText(JSON.stringify(obj, null, 2));
                    messageApi.success(tt("格式化完成", "Formatted successfully"));
                  } catch {
                    messageApi.error(tt("无法格式化非法 JSON", "Cannot format invalid JSON"));
                  }
                }}
              >
                {tt("格式化代码", "Format")}
              </Button>
            </Space>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <TextArea
          rows={14}
          value={payloadRulesText}
          onChange={(e) => setPayloadRulesText(e.target.value)}
          className={styles.codeEditor}
          placeholder={JSON.stringify(EMPTY_PAYLOAD_RULES_TEMPLATE, null, 2)}
        />

        <Divider style={{ margin: "14px 0 10px 0" }} />

        <Flex justify="space-between" align="center" wrap gap={8}>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {tt(
              "支持通过 match 匹配 model、provider，并在 set 中设置/覆写参数，或在 remove 中剔除特定字段。",
              "Match by model or provider to inject, override, or filter parameters dynamically."
            )}
          </Text>
          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={savePayloadRulesMutation.isPending}
            disabled={!parsedRules.valid}
            onClick={handleSavePayloadRules}
          >
            {tt("保存载荷改写规则", "Save Payload Rules")}
          </Button>
        </Flex>
      </Card>
    </Flex>
  );

  // Tab 3: CLI Proxy API 兼容集成
  const tabCliproxy = (
    <Form form={cliproxyForm} layout="vertical" onFinish={handleSaveCliproxy}>
      <Flex vertical gap={12}>
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="electrical_services" size={18} />
              <span>{tt("CLI Proxy API 故障回退与服务桥接", "CLI Proxy API Fallback & Bridging")}</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item
                label={tt("启用 CLI Proxy 自动回退", "Enable CLI Proxy Fallback")}
                name="cliproxyapi_fallback_enabled"
                valuePropName="checked"
                tooltip={tt("当上游提供商返回故障状态码时，自动尝试通过本地运行的 CLI Proxy API 兜底", "Route traffic to local CLI Proxy when upstream fails")}
              >
                <Switch checkedChildren={tt("开启回退", "Enabled")} unCheckedChildren={tt("关闭", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label={tt("CLI Proxy 服务地址", "CLI Proxy Endpoint URL")}
                name="cliproxyapi_url"
              >
                <Input placeholder="http://127.0.0.1:8317" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item
                label={tt("触发回退的状态码", "Trigger Status Codes")}
                name="cliproxyapi_fallback_codes"
                tooltip={tt("英文逗号分隔的 HTTP 状态码列表", "Comma-separated HTTP status codes")}
              >
                <Input placeholder="429,500,502,503,504" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 凭据导入 */}
        <Card
          title={
            <Flex justify="space-between" align="center">
              <Flex align="center" gap={8}>
                <MaterialIcon name="folder_open" size={18} />
                <span>{tt("本地 CLI 登录凭据一键导入", "Local CLI Proxy Auth Importer")}</span>
              </Flex>
              <Button
                type="primary"
                size="small"
                icon={<MaterialIcon name="download" size={14} />}
                loading={importingAuth}
                onClick={handleImportCliproxy}
              >
                {tt("从 ~/.cli-proxy-api 导入凭据", "Import CLI Auth Files")}
              </Button>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <Text type="secondary" style={{ fontSize: 12 }}>
            {tt(
              "自动扫描本地路径 ~/.cli-proxy-api 下存储的 Claude CLI、OpenAI CLI 及 Cursor 凭据并将其转换为 智枢 供应商连接。",
              "Scan local ~/.cli-proxy-api storage directory to import existing OAuth tokens and credentials."
            )}
          </Text>
        </Card>

        <Flex justify="flex-end">
          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={saveSettingsMutation.isPending}
            onClick={() => cliproxyForm.submit()}
          >
            {tt("保存 CLI Proxy 设置", "Save CLI Proxy Settings")}
          </Button>
        </Flex>
      </Flex>
    </Form>
  );

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Card */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(100, 116, 139, 0.12)",
                color: "#475569",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="engineering" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("网关高级内核与传输控制 (Advanced Settings)", "Advanced Gateway Core Settings")}
                </Title>
                <Tag color="geekblue">{tt("生产级调优", "Production")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置全局详细调试诊断、工具调用源追踪、请求体上限、报文载荷动态重写规则、思考预算及本地代理服务回退机制。",
                  "Configure verbose debug diagnostics, tool call origins, body limits, payload rewrite rules, thinking budget, and CLI proxy fallbacks."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Sub-Tabs */}
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: "core",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="speed" size={16} />
                <span>{tt("内核诊断与传输控制", "Core Diagnostics & Limits")}</span>
              </Flex>
            ),
            children: tabCore,
          },
          {
            key: "payload",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="code" size={16} />
                <span>{tt("载荷改写与规则过滤", "Payload Transform Rules")}</span>
              </Flex>
            ),
            children: tabPayloadRules,
          },
          {
            key: "cliproxy",
            label: (
              <Flex align="center" gap={6}>
                <MaterialIcon name="electrical_services" size={16} />
                <span>{tt("CLI Proxy 回退与兼容", "CLI Proxy Fallback")}</span>
              </Flex>
            ),
            children: tabCliproxy,
          },
        ]}
      />
    </div>
  );
}

export default SettingsAdvancedPage;
