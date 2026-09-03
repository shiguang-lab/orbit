import { useEffect } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  InputNumber,
  Row,
  Select,
  Slider,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { chaosApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

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

export function ChaosPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();

  const chaosQuery = useQuery({
    queryKey: ["chaos-config"],
    queryFn: () => chaosApi.getConfig(),
  });

  useEffect(() => {
    if (chaosQuery.data) {
      form.setFieldsValue(chaosQuery.data);
    }
  }, [chaosQuery.data, form]);

  const updateMutation = useMutation({
    mutationFn: (values: any) => chaosApi.updateConfig(values),
    onSuccess: () => {
      messageApi.success("混沌工程注入规则已更新生效");
      void queryClient.invalidateQueries({ queryKey: ["chaos-config"] });
    },
    onError: () => messageApi.error("更新混沌配置失败"),
  });

  if (chaosQuery.isLoading) {
    return <PageSkeleton />;
  }

  const cfg = chaosQuery.data;

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
              <MaterialIcon name="blender" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  混沌工程与容灾演练模式
                </Title>
                <Tag color={cfg?.enabled ? "error" : "default"}>
                  {cfg?.enabled ? "● 故障注入活跃中" : "已关闭"}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                向特定上游提供者或模型注入随机延迟、HTTP 429 限流及 500 异常，主动检验熔断器与重试策略的稳健性。
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            danger
            icon={<MaterialIcon name="save" size={16} />}
            loading={updateMutation.isPending}
            onClick={() => form.submit()}
          >
            保存演练配置
          </Button>
        </Flex>
      </Card>

      {/* 2. Form */}
      <Card title="故障注入参数配置" className={styles.sectionCard} size="small">
        <Form form={form} layout="vertical" onFinish={(v) => updateMutation.mutate(v)}>
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="enabled" valuePropName="checked" label="启用混沌演练模式">
                <Switch checkedChildren="演练中" unCheckedChildren="关闭" />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="errorInjectionRatePct" label="故障注入概率 (Error Rate %)">
                <Slider min={0} max={100} marks={{ 0: "0%", 10: "10%", 50: "50%", 100: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item name="injectedLatencyMinMs" label="注入最小延迟 (ms)">
                <InputNumber min={0} max={10000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item name="injectedLatencyMaxMs" label="注入最大延迟 (ms)">
                <InputNumber min={0} max={30000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item name="injectedErrorStatusCodes" label="模拟抛出的 HTTP 错误状态码">
            <Select
              mode="tags"
              style={{ width: "100%" }}
              placeholder="429, 500, 502, 503, 504"
              options={[
                { label: "429 Too Many Requests", value: 429 },
                { label: "500 Internal Server Error", value: 500 },
                { label: "502 Bad Gateway", value: 502 },
                { label: "503 Service Unavailable", value: 503 },
                { label: "504 Gateway Timeout", value: 504 },
              ]}
            />
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}

export default ChaosPage;
