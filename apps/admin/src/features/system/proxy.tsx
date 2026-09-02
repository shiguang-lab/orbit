import { useEffect } from "react";
import {
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
import { systemProxyApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    minHeight: 0,
    overflowY: "auto",
    paddingRight: 2,
    "&::-webkit-scrollbar": {
      width: 6,
    },
    "&::-webkit-scrollbar-thumb": {
      backgroundColor: token.colorBorderSecondary,
      borderRadius: 3,
    },
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
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const proxyQuery = useQuery({
    queryKey: ["system-proxy-config"],
    queryFn: () => systemProxyApi.getConfig(),
  });

  useEffect(() => {
    if (proxyQuery.data) {
      form.setFieldsValue({
        ...proxyQuery.data,
        bypassHosts: proxyQuery.data.bypassHosts.join("\n"),
      });
    }
  }, [proxyQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: (values: any) =>
      systemProxyApi.updateConfig({
        ...values,
        bypassHosts: typeof values.bypassHosts === "string" ? values.bypassHosts.split("\n").filter(Boolean) : values.bypassHosts,
      }),
    onSuccess: () => {
      messageApi.success("出站代理网络设置已保存并生效");
      void queryClient.invalidateQueries({ queryKey: ["system-proxy-config"] });
    },
    onError: () => messageApi.error("保存出站代理失败"),
  });

  if (proxyQuery.isLoading) {
    return <PageSkeleton />;
  }

  const config = proxyQuery.data;

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
                  系统出站网络代理 (Outbound System Proxy)
                </Title>
                <Tag color={config?.enabled ? "success" : "default"}>
                  {config?.enabled ? "● 代理连接池运行中" : "已直连"}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                配置网关向国外 LLM 上游提供商（OpenAI, Claude, DeepSeek, Gemini）发送请求时使用的 HTTP/SOCKS5 出站代理隧道。
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="save" size={16} />}
            loading={updateMutation.isPending}
            onClick={() => form.submit()}
          >
            保存代理设置
          </Button>
        </Flex>
      </Card>

      {/* 2. Form */}
      <Card title="出站代理服务器与认证配置" className={styles.sectionCard} size="small">
        <Form form={form} layout="vertical" onFinish={(v) => updateMutation.mutate(v)}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="enabled" valuePropName="checked" label="启用出站代理">
                <Switch checkedChildren="已开启" unCheckedChildren="已直连" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item name="type" label="代理协议类型">
                <Radio.Group>
                  <Radio.Button value="http">HTTP</Radio.Button>
                  <Radio.Button value="https">HTTPS</Radio.Button>
                  <Radio.Button value="socks5">SOCKS5</Radio.Button>
                </Radio.Group>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={16}>
              <Form.Item name="server" label="代理服务器地址 (Host / IP)" rules={[{ required: true, message: "请输入代理主机" }]}>
                <Input placeholder="127.0.0.1 或 proxy.internal.corp" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item name="port" label="代理端口 (Port)" rules={[{ required: true, message: "请输入端口" }]}>
                <InputNumber min={1} max={65535} style={{ width: "100%" }} placeholder="7890" />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="bypassHosts" label="绕过代理的目标主机列表 (NO_PROXY，每行一个)">
            <Input.TextArea rows={4} placeholder={`localhost\n127.0.0.1\n*.internal\n192.168.*`} />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default SystemProxyPage;
