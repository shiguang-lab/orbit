import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  Modal,
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

export function SettingsSecurityPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();

  const [passwordForm] = Form.useForm();
  const [ipFilterForm] = Form.useForm();
  const [newCidr, setNewCidr] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  // Require Login Modal
  const [requireLoginModalOpen, setRequireLoginModalOpen] = useState(false);
  const [pendingRequireLogin, setPendingRequireLogin] = useState<boolean | null>(null);

  // Queries
  const settingsQuery = useQuery({
    queryKey: ["settings-security-all"],
    queryFn: () => settingsApi.getSettings(),
  });

  const requireLoginQuery = useQuery({
    queryKey: ["settings-require-login"],
    queryFn: async () => {
      const res = await fetch("/api/settings/require-login");
      if (!res.ok) throw new Error("Failed to load require-login status");
      return res.json();
    },
  });

  const ipFilterQuery = useQuery({
    queryKey: ["settings-ip-filter"],
    queryFn: async () => {
      const res = await fetch("/api/settings/ip-filter");
      if (!res.ok) throw new Error("Failed to load IP filter");
      return res.json();
    },
  });

  // Mutations
  const updateSettingsMutation = useMutation({
    mutationFn: (patch: Record<string, unknown>) => settingsApi.updateSettings(patch),
    onSuccess: () => {
      messageApi.success(tt("安全设置已保存并生效", "Security settings saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings-security-all"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存安全设置失败", "Failed to save security settings")),
  });

  const updateRequireLoginMutation = useMutation({
    mutationFn: async (requireLogin: boolean) => {
      const res = await fetch("/api/settings/require-login", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requireLogin }),
      });
      if (!res.ok) throw new Error("Failed to update require-login");
      return res.json();
    },
    onSuccess: () => {
      setRequireLoginModalOpen(false);
      messageApi.success(tt("登录强制鉴权策略已更新", "Require login policy updated"));
      void queryClient.invalidateQueries({ queryKey: ["settings-require-login"] });
    },
    onError: () => messageApi.error(tt("更新登录鉴权策略失败", "Failed to update require login")),
  });

  const updateIpFilterMutation = useMutation({
    mutationFn: async (body: any) => {
      const res = await fetch("/api/settings/ip-filter", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("Failed to update IP filter");
      return res.json();
    },
    onSuccess: () => {
      messageApi.success(tt("IP 访问控制规则已保存", "IP filter rules saved"));
      void queryClient.invalidateQueries({ queryKey: ["settings-ip-filter"] });
    },
    onError: () => messageApi.error(tt("保存 IP 过滤规则失败", "Failed to save IP filter")),
  });

  const changePasswordMutation = useMutation({
    mutationFn: async (values: any) => {
      const res = await fetch("/api/settings/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: values.newPassword }),
      });
      if (!res.ok) throw new Error("Failed to change password");
      return res.json();
    },
    onSuccess: () => {
      passwordForm.resetFields();
      messageApi.success(tt("管理密码已成功修改", "Management password updated successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-require-login"] });
    },
    onError: () => messageApi.error(tt("修改管理密码失败", "Failed to change password")),
  });

  // Init form
  useEffect(() => {
    if (ipFilterQuery.data) {
      ipFilterForm.setFieldsValue({
        enabled: ipFilterQuery.data.enabled === true,
        mode: ipFilterQuery.data.mode || "blacklist",
      });
    }
  }, [ipFilterQuery.data, ipFilterForm]);

  if (settingsQuery.isLoading || requireLoginQuery.isLoading || ipFilterQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};
  const requireLoginInfo = requireLoginQuery.data || {};
  const ipFilterInfo = ipFilterQuery.data || { whitelist: [], blacklist: [] };
  const bannedKeywords: string[] = Array.isArray(s.bannedKeywords) ? s.bannedKeywords : [];

  const handleToggleRequireLogin = (checked: boolean) => {
    if (requireLoginInfo.hasPassword) {
      setPendingRequireLogin(checked);
      setRequireLoginModalOpen(true);
    } else {
      updateRequireLoginMutation.mutate(checked);
    }
  };

  const handleAddCidr = () => {
    if (!newCidr.trim()) return;
    const mode = ipFilterForm.getFieldValue("mode") || "blacklist";
    const currentList = mode === "whitelist" ? (ipFilterInfo.whitelist || []) : (ipFilterInfo.blacklist || []);
    if (currentList.includes(newCidr.trim())) {
      messageApi.warning(tt("该 IP/CIDR 规则已存在", "IP/CIDR already exists"));
      return;
    }
    const updated = [...currentList, newCidr.trim()];
    updateIpFilterMutation.mutate({
      ...ipFilterInfo,
      enabled: ipFilterForm.getFieldValue("enabled"),
      mode,
      [mode]: updated,
    });
    setNewCidr("");
  };

  const handleRemoveCidr = (cidr: string) => {
    const mode = ipFilterForm.getFieldValue("mode") || "blacklist";
    const currentList = mode === "whitelist" ? (ipFilterInfo.whitelist || []) : (ipFilterInfo.blacklist || []);
    const updated = currentList.filter((item: string) => item !== cidr);
    updateIpFilterMutation.mutate({
      ...ipFilterInfo,
      enabled: ipFilterForm.getFieldValue("enabled"),
      mode,
      [mode]: updated,
    });
  };

  const handleAddKeyword = () => {
    if (!newKeyword.trim()) return;
    if (bannedKeywords.includes(newKeyword.trim())) {
      messageApi.warning(tt("该违禁词已存在", "Keyword already exists"));
      return;
    }
    const updated = [...bannedKeywords, newKeyword.trim()];
    updateSettingsMutation.mutate({ bannedKeywords: updated });
    setNewKeyword("");
  };

  const handleRemoveKeyword = (keyword: string) => {
    const updated = bannedKeywords.filter((k) => k !== keyword);
    updateSettingsMutation.mutate({ bannedKeywords: updated });
  };

  return (
    <div className={styles.page}>
      {contextHolder}

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
                  {tt("网关安全防护与鉴权设置", "Gateway Security & Access Control")}
                </Title>
                <Tag color="red">{tt("零信任安全", "Zero Trust")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置管理端强制密码鉴权、安全密码重置、IP CIDR 黑白名单网络防火墙与请求违禁词拦截体系。",
                  "Configure management password authentication, IP CIDR network firewall rules, and prompt banned keywords filtering."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Login Requirement & Management Password */}
      <Row gutter={[12, 12]}>
        <Col xs={24} md={12}>
          <Card
            title={tt("管理后台强制密码登录", "Management Login Authentication")}
            className={styles.sectionCard}
            style={{ height: "100%" }}
            styles={{ body: { display: "flex", flexDirection: "column", height: "calc(100% - 39px)", justifyContent: "space-between" } }}
            size="small"
          >
            <Flex vertical gap={12}>
              <Flex justify="space-between" align="center">
                <div>
                  <Text strong>{tt("启用登录密码验证 (Require Login)", "Require Password Login")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("访问控制台与管理接口必须验证密码凭据", "Require authentication for dashboard and admin APIs")}
                  </Text>
                </div>
                <Switch
                  checked={requireLoginInfo.requireLogin !== false}
                  onChange={handleToggleRequireLogin}
                  loading={updateRequireLoginMutation.isPending}
                />
              </Flex>

              <Alert
                type={requireLoginInfo.hasPassword ? "success" : "warning"}
                showIcon
                icon={<MaterialIcon name={requireLoginInfo.hasPassword ? "verified_user" : "gpp_maybe"} size={16} />}
                message={
                  requireLoginInfo.hasPassword
                    ? tt("已配置管理员主密码（安全保护中）", "Master password is set and protecting console")
                    : tt("尚未配置主密码，建议尽快在右侧设置", "No password configured. Please set one on the right.")
                }
                style={{ fontSize: 12, padding: "8px 12px" }}
              />
            </Flex>

            <Text type="secondary" style={{ fontSize: 11, marginTop: 12, display: "block" }}>
              {tt("💡 提示：开启登录验证后，Cookie 会话默认维持 7 天活跃状态。", "Tip: Active sessions are maintained for 7 days upon login.")}
            </Text>
          </Card>
        </Col>

        <Col xs={24} md={12}>
          <Card
            title={tt("重置管理密码", "Change Management Password")}
            className={styles.sectionCard}
            style={{ height: "100%" }}
            size="small"
          >
            <Form
              form={passwordForm}
              layout="vertical"
              onFinish={(v) => changePasswordMutation.mutate(v)}
            >
              <Form.Item
                label={tt("新管理密码", "New Password")}
                name="newPassword"
                rules={[{ required: true, min: 6, message: tt("密码至少 6 位", "Password must be >= 6 characters") }]}
                style={{ marginBottom: 16 }}
              >
                <Input.Password placeholder="••••••••" />
              </Form.Item>
              <Button
                type="primary"
                htmlType="submit"
                loading={changePasswordMutation.isPending}
                icon={<MaterialIcon name="key" size={14} />}
              >
                {tt("更新密码", "Update Password")}
              </Button>
            </Form>
          </Card>
        </Col>
      </Row>

      {/* 3. IP Access Control (IP Filter) */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <Flex align="center" gap={8}>
              <MaterialIcon name="fence" size={18} />
              <span>{tt("IP 访问控制网络防火墙 (IP Filter)", "IP Access Control & CIDR Firewall")}</span>
            </Flex>
            <Button
              type="primary"
              size="small"
              loading={updateIpFilterMutation.isPending}
              onClick={() => {
                const vals = ipFilterForm.getFieldsValue();
                updateIpFilterMutation.mutate({
                  ...ipFilterInfo,
                  enabled: vals.enabled,
                  mode: vals.mode,
                });
              }}
            >
              {tt("保存防火墙状态", "Save Filter State")}
            </Button>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Form form={ipFilterForm} layout="vertical">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("启用 IP 防火墙", "Enable IP Filter")} name="enabled" valuePropName="checked">
                <Switch checkedChildren={tt("开启", "Enabled")} unCheckedChildren={tt("关闭", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={16}>
              <Form.Item label={tt("过滤模式", "Filter Mode")} name="mode">
                <Radio.Group>
                  <Radio.Button value="blacklist">{tt("黑名单模式 (Block listed)", "Blacklist")}</Radio.Button>
                  <Radio.Button value="whitelist">{tt("白名单模式 (Allow only listed)", "Whitelist")}</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "10px 0" }} />

          <Flex vertical gap={8}>
            <Text strong>{tt("规则列表 (IP / CIDR)", "Rules List")}</Text>
            <Space wrap>
              {((ipFilterForm.getFieldValue("mode") === "whitelist"
                ? ipFilterInfo.whitelist
                : ipFilterInfo.blacklist) || []
              ).map((cidr: string) => (
                <Tag
                  key={cidr}
                  closable
                  onClose={() => handleRemoveCidr(cidr)}
                  color={ipFilterForm.getFieldValue("mode") === "whitelist" ? "green" : "red"}
                >
                  {cidr}
                </Tag>
              ))}
            </Space>

            <Space style={{ marginTop: 8 }}>
              <Input
                placeholder="192.168.1.0/24 or 10.0.0.1"
                value={newCidr}
                onChange={(e) => setNewCidr(e.target.value)}
                onPressEnter={handleAddCidr}
                style={{ width: 260 }}
              />
              <Button icon={<MaterialIcon name="add" size={14} />} onClick={handleAddCidr}>
                {tt("添加规则", "Add Rule")}
              </Button>
            </Space>
          </Flex>
        </Form>
      </Card>

      {/* 4. Banned Keywords */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="block" size={18} />
            <span>{tt("请求违禁词内容审查 (Banned Keywords)", "Banned Keywords & Prompt Interception")}</span>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 10 }}>
          {tt(
            "当客户端提示词中包含命中词时，网关将立即拒绝请求并返回合规性拦截错误。",
            "Requests containing banned keywords will be blocked immediately by gateway."
          )}
        </Text>

        <Flex vertical gap={8}>
          <Space wrap>
            {bannedKeywords.length === 0 ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("暂无违禁词规则", "No banned keywords defined")}
              </Text>
            ) : (
              bannedKeywords.map((word) => (
                <Tag key={word} closable onClose={() => handleRemoveKeyword(word)} color="volcano">
                  {word}
                </Tag>
              ))
            )}
          </Space>

          <Space style={{ marginTop: 8 }}>
            <Input
              placeholder={tt("输入违禁词...", "Enter keyword...")}
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              onPressEnter={handleAddKeyword}
              style={{ width: 240 }}
            />
            <Button icon={<MaterialIcon name="add" size={14} />} onClick={handleAddKeyword}>
              {tt("添加违禁词", "Add Keyword")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* Require Login Confirmation Modal */}
      <Modal
        title={tt("确认修改登录鉴权策略？", "Confirm Require Login Change?")}
        open={requireLoginModalOpen}
        onCancel={() => setRequireLoginModalOpen(false)}
        confirmLoading={updateRequireLoginMutation.isPending}
        onOk={() => pendingRequireLogin !== null && updateRequireLoginMutation.mutate(pendingRequireLogin)}
        okText={tt("确认修改", "Confirm")}
      >
        <Alert
          type="info"
          showIcon
          style={{ marginBottom: 12 }}
          message={tt(
            pendingRequireLogin
              ? "开启后访问控制台将必须输入管理密码"
              : "关闭后任何人无需密码即可直接访问网关控制台",
            pendingRequireLogin
              ? "Enabling require login will enforce password checks for dashboard access"
              : "Disabling require login allows unauthenticated dashboard access"
          )}
        />
      </Modal>
    </div>
  );
}

export default SettingsSecurityPage;
