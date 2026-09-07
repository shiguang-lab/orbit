import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  InputNumber,
  Row,
  Switch,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { resilienceApi } from "@/entities/api";
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

export function SettingsResiliencePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-resilience-full"],
    queryFn: () => resilienceApi.get(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => resilienceApi.update(values),
    onSuccess: () => {
      messageApi.success(tt("系统弹性与重试断路器策略已成功保存", "Resilience and retry policies saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-resilience-full"] });
    },
    onError: () => messageApi.error(tt("保存弹性设置失败", "Failed to save resilience settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = settingsQuery.data || {};
  const requestQueue = (s.requestQueue as any) || {};
  const oauthCooldown = ((s.connectionCooldown as any)?.oauth as any) || {};
  const oauthBreaker = ((s.providerBreaker as any)?.oauth as any) || {};
  const waitForCooldown = (s.waitForCooldown as any) || {};
  const comboCooldownWait = (s.comboCooldownWait as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate(values);
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
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="health_and_safety" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("系统弹性与重试策略配置", "System Resilience & Retry Policies")}
                </Title>
                <Tag color="green">{tt("断路器与指数退避", "Circuit Breakers & Backoff")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置自动重试次数、指数退避时间与抖动算法、断路器熔断错误率阈值及半开探测。",
                  "Configure retry attempts, exponential backoff with jitter, circuit breaker failure rates, and probe timeouts."
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
            {tt("保存弹性配置", "Save Resilience Settings")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          maxConsecutiveFailures: oauthBreaker.failureThreshold || 5,
          lockoutCooldownMinutes: Math.round((oauthBreaker.resetTimeoutMs || 900000) / 60000),
          requestsPerMinute: requestQueue.requestsPerMinute || 120,
          concurrentRequests: requestQueue.concurrentRequests || 20,
          globalConcurrentRequests: requestQueue.globalConcurrentRequests || 0,
          maxWaitMs: requestQueue.maxWaitMs || 10000,
          baseCooldownMs: oauthCooldown.baseCooldownMs || 3000,
          useUpstreamRetryHints: oauthCooldown.useUpstreamRetryHints ?? true,
          maxBackoffSteps: oauthCooldown.maxBackoffSteps || 5,
          waitForCooldownEnabled: waitForCooldown.enabled ?? true,
          waitForCooldownMaxRetries: waitForCooldown.maxRetries || 5,
          waitForCooldownMaxWaitSec: waitForCooldown.maxRetryWaitSec || 90,
          comboCooldownWaitEnabled: comboCooldownWait.enabled ?? true,
          comboCooldownMaxWaitMs: comboCooldownWait.maxWaitMs || 90000,
        }}
        onFinish={(v) => {
          handleSave({
            requestQueue: {
              requestsPerMinute: v.requestsPerMinute,
              concurrentRequests: v.concurrentRequests,
              globalConcurrentRequests: v.globalConcurrentRequests,
              maxWaitMs: v.maxWaitMs,
            },
            connectionCooldown: {
              oauth: { baseCooldownMs: v.baseCooldownMs, useUpstreamRetryHints: v.useUpstreamRetryHints, maxBackoffSteps: v.maxBackoffSteps },
              apikey: { baseCooldownMs: v.baseCooldownMs, useUpstreamRetryHints: v.useUpstreamRetryHints, maxBackoffSteps: v.maxBackoffSteps },
            },
            providerBreaker: {
              oauth: { failureThreshold: v.maxConsecutiveFailures, resetTimeoutMs: v.lockoutCooldownMinutes * 60000 },
              apikey: { failureThreshold: v.maxConsecutiveFailures, resetTimeoutMs: v.lockoutCooldownMinutes * 60000 },
            },
            waitForCooldown: {
              enabled: v.waitForCooldownEnabled,
              maxRetries: v.waitForCooldownMaxRetries,
              maxRetryWaitSec: v.waitForCooldownMaxWaitSec,
            },
            comboCooldownWait: {
              enabled: v.comboCooldownWaitEnabled,
              maxWaitMs: v.comboCooldownMaxWaitMs,
            },
          });
        }}
      >
        <Flex vertical gap={12}>
        {/* 2. Provider circuit breaker */}
        <Card title={tt("模型熔断与连续故障隔离 (Model Lockout)", "Model Lockout & Cooldown Protection")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("连续故障触发熔断阈值 (次)", "Consecutive Failure Threshold")}
                name="maxConsecutiveFailures"
                tooltip={tt("单模型连续遭遇故障多少次后触发自动隔离", "Trips circuit breaker after consecutive errors")}
              >
                <InputNumber min={1} max={50} style={{ width: "100%" }} addonAfter={tt("次", "times")} />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("熔断节点自动冷却恢复等待 (分钟)", "Lockout Cooldown Minutes")}
                name="lockoutCooldownMinutes"
                tooltip={tt("隔离期过后自动重新允许试探性请求进入", "Cooldown wait time before probing upstream")}
              >
                <InputNumber min={1} max={1440} style={{ width: "100%" }} addonAfter={tt("分钟", "mins")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 4. Request Queue */}
        <Card title={tt("请求排队与并发流控 (Request Queue)", "Request Queue & Concurrency Limits")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("每分钟最大请求数 (RPM)", "Max Requests per Minute")} name="requestsPerMinute">
                <InputNumber min={10} max={100000} step={50} style={{ width: "100%" }} addonAfter="RPM" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("单提供商最大并发数", "Max Concurrent per Provider")} name="concurrentRequests">
                <InputNumber min={1} max={500} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("全局最大并发连接数", "Global Max Concurrency")} name="globalConcurrentRequests">
                <InputNumber min={5} max={2000} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Form.Item label={tt("排队最长等待时间", "Max Queue Wait Time")} name="maxWaitMs">
                <InputNumber min={500} max={60000} step={500} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 5. Cooldown & Backoff Profile */}
        <Card title={tt("连接冷却与重试退避 (Connection Cooldown)", "Connection Cooldown & Retry Backoff")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("基础冷却时间 (Base Cooldown)", "Base Cooldown")} name="baseCooldownMs">
                <InputNumber min={500} max={30000} step={500} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("使用上游 Retry-After 建议", "Use Upstream Retry Hints")} name="useUpstreamRetryHints" valuePropName="checked">
                <Switch checkedChildren={tt("遵循上游", "Yes")} unCheckedChildren={tt("忽略", "No")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("最大指数退避阶梯数", "Max Backoff Steps")} name="maxBackoffSteps">
                <InputNumber min={1} max={10} style={{ width: "100%" }} addonAfter={tt("阶", "steps")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 6. Per-request cooldown wait */}
        <Card title={tt("请求级冷却等待 (Wait for Cooldown)", "Per-request Cooldown Wait")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("启用请求级等待", "Enable Request-level Wait")} name="waitForCooldownEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("最大重试次数", "Maximum Retries")} name="waitForCooldownMaxRetries">
                <InputNumber min={0} max={20} style={{ width: "100%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("单次最长等待", "Maximum Retry Wait")} name="waitForCooldownMaxWaitSec">
                <InputNumber min={1} max={600} style={{ width: "100%" }} addonAfter={tt("秒", "sec")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 7. Combo Cooldown Wait */}
        <Card title={tt("组合路由冷却等待 (Combo Cooldown Wait)", "Combo Cooldown Wait Settings")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Flex justify="space-between" align="center" style={{ padding: "8px 0" }}>
                <div>
                  <Text strong>{tt("启用冷却等待 (避免立即报失败)", "Wait for Cooldown Instead of Failing")}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {tt("当所有节点处于短暂冷却时挂起请求稍候重试，而非直接抛错", "Hold request briefly until cooldown expires")}
                  </Text>
                </div>
                <Form.Item name="comboCooldownWaitEnabled" valuePropName="checked" noStyle>
                  <Switch checkedChildren={tt("开启", "ON")} unCheckedChildren={tt("关闭", "OFF")} />
                </Form.Item>
              </Flex>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item label={tt("最大等待超时预算", "Max Wait Budget")} name="comboCooldownMaxWaitMs">
                <InputNumber min={1000} max={30000} step={1000} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
        </Flex>
      </Form>
    </div>
  );
}

export default SettingsResiliencePage;
