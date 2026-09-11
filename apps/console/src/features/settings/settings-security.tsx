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

  const [ipFilterForm] = Form.useForm();
  const [newCidr, setNewCidr] = useState("");
  const [newKeyword, setNewKeyword] = useState("");

  // Queries
  const settingsQuery = useQuery({
    queryKey: ["settings-security-all"],
    queryFn: () => settingsApi.getSettings(),
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

  // Init form
  useEffect(() => {
    if (ipFilterQuery.data) {
      ipFilterForm.setFieldsValue({
        enabled: ipFilterQuery.data.enabled === true,
        mode: ipFilterQuery.data.mode || "blacklist",
      });
    }
  }, [ipFilterQuery.data, ipFilterForm]);

  if (settingsQuery.isLoading || ipFilterQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};
  const ipFilterInfo = ipFilterQuery.data || { whitelist: [], blacklist: [] };
  const bannedKeywords: string[] = Array.isArray(s.bannedKeywords) ? s.bannedKeywords : [];

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
                  "配置 IP CIDR 黑白名单网络防火墙与请求违禁词拦截体系。",
                  "Configure IP CIDR network firewall rules and prompt banned keywords filtering."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      <Alert type="info" showIcon message={tt("登录与账户权限由统一 SSO 管理", "Sign-in and account permissions are managed by SSO")} />

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
                {tt("添加", "Add")}
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
              {tt("添加", "Add")}
            </Button>
          </Space>
        </Flex>
      </Card>

    </div>
  );
}

export default SettingsSecurityPage;
