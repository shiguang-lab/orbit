import { useEffect } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Radio,
  Row,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { systemProxyApi, type OutboundProxyConfig } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;
type ProxyFormValues = OutboundProxyConfig & { enabled: boolean };

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 12,
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
  },
}));

export function SystemProxyPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm<ProxyFormValues>();
  const enabled = Form.useWatch("enabled", form);

  const proxyQuery = useQuery({
    queryKey: ["system-proxy-config"],
    queryFn: () => systemProxyApi.getConfig(),
  });

  useEffect(() => {
    if (proxyQuery.data) {
      form.setFieldsValue({
        enabled: proxyQuery.data.global !== null,
        type: proxyQuery.data.global?.type ?? "http",
        host: proxyQuery.data.global?.host ?? "",
        port: proxyQuery.data.global?.port,
        username: proxyQuery.data.global?.username ?? "",
        password: proxyQuery.data.global?.password ?? "",
      });
    }
  }, [proxyQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: ({ enabled, type, host, port, username, password }: ProxyFormValues) =>
      systemProxyApi.updateConfig(enabled ? { type, host, port, username, password } : null),
    onSuccess: () => {
      messageApi.success(tt("全局代理设置已保存", "Global proxy settings saved"));
      void queryClient.invalidateQueries({ queryKey: ["system-proxy-config"] });
    },
    onError: (error) => messageApi.error(error.message),
  });

  if (proxyQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (proxyQuery.isError) {
    return <Alert type="error" showIcon title={tt("代理设置加载失败", "Failed to load proxy settings")} description={proxyQuery.error.message} action={<Button onClick={() => void proxyQuery.refetch()}>{tt("重试", "Retry")}</Button>} />;
  }
  const config = proxyQuery.data?.global;

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
                background: "rgba(163, 230, 53, 0.12)",
                color: "#a3e635",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="dns" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("系统出站网络代理", "System outbound proxy")}
                </Title>
                <Tag color={config ? "success" : "default"}>
                  {config ? tt("全局代理已配置", "Global proxy configured") : tt("全局代理未配置", "No global proxy configured")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("配置网关访问上游提供者时使用的全局出站代理。", "Configure the global outbound proxy used to access upstream providers.")}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={updateMutation.isPending}
            onClick={() => form.submit()}
          >
            {tt("保存代理设置", "Save proxy settings")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Form */}
      <Card title={tt("出站代理服务器与认证配置", "Proxy server and authentication")} className={styles.sectionCard}>
        <Form form={form} layout="vertical" onFinish={(v) => updateMutation.mutate(v)}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="enabled" valuePropName="checked" label={tt("配置全局代理", "Configure global proxy")}>
                <Switch checkedChildren={tt("开启", "On")} unCheckedChildren={tt("关闭", "Off")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="type" label={tt("代理协议类型", "Proxy protocol")}>
                <Radio.Group disabled={!enabled}>
                  <Radio.Button value="http">HTTP</Radio.Button>
                  <Radio.Button value="https">HTTPS</Radio.Button>
                  <Radio.Button value="socks5">SOCKS5</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={16}>
              <Form.Item name="host" label={tt("代理服务器地址", "Proxy host")} rules={[{ required: enabled, whitespace: true, message: tt("请输入代理主机", "Enter a proxy host") }]}>
                <Input disabled={!enabled} placeholder="proxy.internal.corp" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="port" label={tt("代理端口", "Proxy port")} rules={[{ required: enabled, message: tt("请输入端口", "Enter a port") }]}>
                <InputNumber disabled={!enabled} min={1} max={65535} style={{ width: "100%" }} placeholder="7890" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="username" label={tt("代理用户名", "Proxy username")}>
            <Input disabled={!enabled} autoComplete="off" />
          </Form.Item>
          <Form.Item name="password" label={tt("代理密码", "Proxy password")}>
            <Input.Password disabled={!enabled} autoComplete="new-password" />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default SystemProxyPage;
