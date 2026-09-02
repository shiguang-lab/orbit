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
  Space,
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

export function SettingsSecurityPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [keyVisible, setKeyVisible] = useState(false);
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-security-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("安全合规与防火墙策略已成功保存", "Security and firewall policies saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-security-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存安全设置失败", "Failed to save security settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
  };

  const handleCopyKey = () => {
    navigator.clipboard.writeText(s.managementApiKey || "management-key-not-configured");
    messageApi.success(tt("管理端 API Key 已复制到剪贴板", "Management API key copied to clipboard"));
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
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="shield" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("网关安全防御与合规管控", "Gateway Security & Compliance")}
                </Title>
                <Tag color="red">{tt("零信任与 PII 隐私脱敏", "Zero Trust & PII")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置管理员鉴权凭证、IP 访问黑白名单、敏感信息脱敏与反越狱防注入规则。",
                  "Configure admin master key, IP whitelist/blacklist, PII masking, and anti-jailbreak guardrails."
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
            {tt("保存安全设置", "Save Security Settings")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          ipFilterMode: s.ipFilterMode || "whitelist",
          ipFilterList: s.ipFilterList || "127.0.0.1/32\n192.168.0.0/16\n10.0.0.0/8",
          ipFilterEnabled: s.ipFilterEnabled ?? false,
          promptGuardEnabled: s.promptGuardEnabled ?? true,
          piiMaskingEnabled: s.piiMaskingEnabled ?? true,
          maskPhoneNumbers: s.maskPhoneNumbers ?? true,
          maskEmails: s.maskEmails ?? true,
          maskCreditCards: s.maskCreditCards ?? true,
          maskIdCards: s.maskIdCards ?? true,
          bruteForceProtection: s.bruteForceProtection ?? true,
          maxRpmPerIp: s.maxRpmPerIp || 120,
          maxTpmPerIp: s.maxTpmPerIp || 500000,
          corsOrigins: s.corsOrigins || "*",
          enforceHttps: s.enforceHttps ?? false,
        }}
        onFinish={handleSave}
      >
        {/* 2. Management Auth Key */}
        <Card title={tt("管理员主鉴权凭证 (Management API Key)", "Management Master API Key")} className={styles.sectionCard} size="small">
          <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt(
                "用于调用网关 /api/* 管理端点与 CLI 远程配额控制的最高权限凭证",
                "Root credential for invoking gateway /api/* control plane and CLI management"
              )}
            </Text>
            <Space>
              <Button size="small" icon={<MaterialIcon name={keyVisible ? "visibility_off" : "visibility"} size={14} />} onClick={() => setKeyVisible((v) => !v)}>
                {keyVisible ? tt("隐藏", "Hide") : tt("查看", "View")}
              </Button>
              <Button size="small" icon={<MaterialIcon name="content_copy" size={14} />} onClick={handleCopyKey}>
                {tt("复制", "Copy")}
              </Button>
            </Space>
          </Flex>
          <Input
            value={keyVisible ? (s.managementApiKey || "management-key-not-configured") : "••••••••••••••••"}
            readOnly
            style={{ fontFamily: "monospace" }}
          />
        </Card>

        {/* 3. IP Filter & Firewall */}
        <Card title={tt("IP 访问控制与黑白名单", "IP Access Control & Firewall")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("启用 IP 过滤防火墙", "Enable IP Firewall")} name="ipFilterEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启", "Enabled")} unCheckedChildren={tt("停用 (允许所有 IP)", "Disabled (Allow All)")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("过滤模式", "Filter Mode")} name="ipFilterMode">
                <Radio.Group buttonStyle="solid">
                  <Radio.Button value="whitelist">{tt("白名单模式 (仅允许列表 IP 访问)", "Whitelist (Allow only listed)")}</Radio.Button>
                  <Radio.Button value="blacklist">{tt("黑名单模式 (阻断列表 IP 访问)", "Blacklist (Block listed)")}</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label={tt("IP / CIDR 网段规则列表 (每行一条)", "IP / CIDR Rules (One per line)")}
            name="ipFilterList"
            tooltip={tt("支持单 IP (如 1.2.3.4) 或标准 CIDR 格式 (如 192.168.1.0/24)", "Supports single IPs (e.g. 1.2.3.4) or CIDR blocks (e.g. 192.168.1.0/24)")}
          >
            <Input.TextArea rows={3} placeholder="127.0.0.1/32&#10;192.168.1.0/24&#10;10.0.0.0/8" />
          </Form.Item>
        </Card>

        {/* 4. Sensitive Data Masking (PII) */}
        <Card title={tt("敏感数据自动脱敏 (PII Masking & Privacy)", "PII Masking & Privacy Guardrails")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("全局启用 PII 脱敏拦截管道", "Enable PII Masking Pipeline")} name="piiMaskingEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启脱敏", "Enabled")} unCheckedChildren={tt("未启用", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("Prompt 注入与越狱恶意行为防御", "Prompt Injection & Jailbreak Defense")} name="promptGuardEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("开启实时扫描", "Enabled")} unCheckedChildren={tt("关闭", "Disabled")} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "10px 0" }} />

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("手机号码脱敏 (138****1234)", "Mask Phone Numbers")} name="maskPhoneNumbers" valuePropName="checked">
                <Switch checkedChildren={tt("脱敏", "Mask")} unCheckedChildren={tt("放行", "Pass")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("电子邮箱脱敏 (a***@domain)", "Mask Email Addresses")} name="maskEmails" valuePropName="checked">
                <Switch checkedChildren={tt("脱敏", "Mask")} unCheckedChildren={tt("放行", "Pass")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("银行卡号脱敏 (6222 **** **** 1234)", "Mask Credit Cards")} name="maskCreditCards" valuePropName="checked">
                <Switch checkedChildren={tt("脱敏", "Mask")} unCheckedChildren={tt("放行", "Pass")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("身份证件号码脱敏", "Mask ID Numbers")} name="maskIdCards" valuePropName="checked">
                <Switch checkedChildren={tt("脱敏", "Mask")} unCheckedChildren={tt("放行", "Pass")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 5. Rate Limits & Network */}
        <Card title={tt("客户端速率限制与跨域安全", "Rate Limiting & Network Security")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("单 IP 每分钟最大请求数 (RPM 阈值)", "Max Requests Per Minute per IP (RPM)")} name="maxRpmPerIp">
                <InputNumber min={10} max={10000} style={{ width: "100%" }} addonAfter="RPM" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("单 IP 每分钟最大 Token 吞吐 (TPM 阈值)", "Max Tokens Per Minute per IP (TPM)")} name="maxTpmPerIp">
                <InputNumber min={1000} max={10000000} step={10000} style={{ width: "100%" }} addonAfter="TPM" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("跨域 CORS 允许的域名 (Origins)", "CORS Allowed Origins")} name="corsOrigins">
                <Input placeholder="* or https://app.example.com" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("强制 HTTPS / TLS 加密通道", "Enforce HTTPS / TLS")} name="enforceHttps" valuePropName="checked">
                <Switch checkedChildren={tt("强制 HTTPS", "Enforce HTTPS")} unCheckedChildren={tt("允许 HTTP", "Allow HTTP")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </div>
  );
}

export default SettingsSecurityPage;
