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

export function SettingsResiliencePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-resilience-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("系统弹性与重试断路器策略已成功保存", "Resilience and retry policies saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-resilience-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存弹性设置失败", "Failed to save resilience settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

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
          maxRetries: s.maxRetries ?? 3,
          initialBackoffMs: s.initialBackoffMs || 300,
          maxBackoffMs: s.maxBackoffMs || 5000,
          backoffMultiplier: s.backoffMultiplier || 2.0,
          retryJitter: s.retryJitter ?? true,
          retryableStatusCodes: s.retryableStatusCodes || ["429", "500", "502", "503", "504"],
          circuitBreakerEnabled: s.circuitBreakerEnabled ?? true,
          circuitFailureThresholdPct: s.circuitFailureThresholdPct || 40,
          circuitSlidingWindowRequests: s.circuitSlidingWindowRequests || 50,
          circuitCooldownSec: s.circuitCooldownSec || 30,
          halfOpenProbeCount: s.halfOpenProbeCount || 3,
          requestHedgingEnabled: s.requestHedgingEnabled ?? false,
          hedgingDelayMs: s.hedgingDelayMs || 1500,
        }}
        onFinish={handleSave}
      >
        {/* 2. Retry & Exponential Backoff */}
        <Card title={tt("失败自动重试与指数退避 (Retry & Backoff)", "Automated Retries & Exponential Backoff")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("单次请求最大重试次数", "Max Retries per Request")} name="maxRetries">
                <InputNumber min={0} max={10} style={{ width: "100%" }} addonAfter={tt("次", "times")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("初始退避基数 (Initial Backoff)", "Initial Backoff")} name="initialBackoffMs">
                <InputNumber min={50} max={5000} step={50} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("最大退避上限 (Max Backoff)", "Max Backoff Limit")} name="maxBackoffMs">
                <InputNumber min={500} max={30000} step={500} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("退避倍数 (Multiplier)", "Backoff Multiplier")} name="backoffMultiplier">
                <Select
                  options={[
                    { label: "1.5x", value: 1.5 },
                    { label: "2.0x", value: 2.0 },
                    { label: "3.0x", value: 3.0 },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("添加随机抖动 (Jitter - 避免雷鸣群体效应)", "Full Jitter (Prevent thundering herd)")} name="retryJitter" valuePropName="checked">
                <Switch checkedChildren={tt("已开启随机抖动", "Enabled")} unCheckedChildren={tt("固定退避", "Fixed")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={8}>
              <Form.Item label={tt("允许自动重试的 HTTP 状态码", "Retryable HTTP Status Codes")} name="retryableStatusCodes">
                <Select
                  mode="tags"
                  options={[
                    { label: "429 (Too Many Requests)", value: "429" },
                    { label: "500 (Internal Server Error)", value: "500" },
                    { label: "502 (Bad Gateway)", value: "502" },
                    { label: "503 (Service Unavailable)", value: "503" },
                    { label: "504 (Gateway Timeout)", value: "504" },
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 3. Circuit Breaker Configuration */}
        <Card title={tt("智能断路器与熔断隔离 (Circuit Breaker)", "Circuit Breakers & Outlier Isolation")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("启用节点级智能断路器", "Enable Circuit Breaker")} name="circuitBreakerEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启熔断保护", "Enabled")} unCheckedChildren={tt("已关闭", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("滑动评估窗口请求数样本", "Sliding Window Sample Count")} name="circuitSlidingWindowRequests">
                <InputNumber min={10} max={500} step={10} style={{ width: "100%" }} addonAfter={tt("次请求", "requests")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("触发熔断错误率阈值 (Failure Rate %)", "Failure Rate Threshold %")}
                name="circuitFailureThresholdPct"
                tooltip={tt("在滑动窗口内异常比例超过该百分比时自动切断此连接流量", "Trips circuit breaker when failure rate in sliding window exceeds this")}
              >
                <Slider min={10} max={90} step={5} marks={{ 20: "20%", 40: "40%", 60: "60%", 80: "80%" }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("熔断隔离冷却时长", "Isolation Cooldown")} name="circuitCooldownSec">
                <InputNumber min={5} max={300} style={{ width: "100%" }} addonAfter={tt("秒", "s")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("半开状态探测放行数", "Half-Open Probe Count")} name="halfOpenProbeCount">
                <InputNumber min={1} max={10} style={{ width: "100%" }} addonAfter={tt("次", "probes")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 4. Request Hedging (Advanced Resilience) */}
        <Card title={tt("对冲竞速请求机制 (Request Hedging)", "Request Hedging & Tail Latency")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("启用对冲请求 (对长尾高延迟请求并行打向备用节点)", "Enable Request Hedging on Tail Latency")}
                name="requestHedgingEnabled"
                valuePropName="checked"
                tooltip={tt("当主节点在预设延迟时间内未返回首包时，并发向备用节点发送对冲请求，先到先用", "Sends parallel duplicate request to backup node when primary response is delayed")}
              >
                <Switch checkedChildren={tt("开启对冲竞速", "Enabled")} unCheckedChildren={tt("关闭", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("触发对冲延迟等待阈值", "Hedging Delay Threshold")} name="hedgingDelayMs">
                <InputNumber min={500} max={10000} step={500} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Form>
    </div>
  );
}

export default SettingsResiliencePage;
