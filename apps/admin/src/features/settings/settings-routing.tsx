import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
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

interface FallbackChainItem {
  id: string;
  sourceModel: string;
  fallbacks: string[];
  triggers: string[];
  enabled: boolean;
}

export function SettingsRoutingPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [chainForm] = Form.useForm();
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-routing-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const [chains, setChains] = useState<FallbackChainItem[]>([
    {
      id: "1",
      sourceModel: "claude-3-7-sonnet",
      fallbacks: ["claude-3-5-sonnet", "deepseek-reasoner", "gpt-4o"],
      triggers: ["429", "500", "503", "timeout"],
      enabled: true,
    },
    {
      id: "2",
      sourceModel: "deepseek-reasoner",
      fallbacks: ["deepseek-chat", "gpt-4o-mini"],
      triggers: ["429", "503"],
      enabled: true,
    },
  ]);

  const saveMutation = useMutation({
    mutationFn: (values: any) => settingsApi.updateSettings(values),
    onSuccess: () => {
      messageApi.success(tt("智能路由与负载均衡调度策略已成功保存", "Routing and load balancing settings saved successfully"));
      void queryClient.invalidateQueries({ queryKey: ["settings-routing-full"] });
      void queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: () => messageApi.error(tt("保存路由设置失败", "Failed to save routing settings")),
  });

  if (settingsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const s = (settingsQuery.data as any) || {};

  const handleSave = (values: any) => {
    saveMutation.mutate({ ...values, fallbackChains: chains });
  };

  const handleAddChain = (values: any) => {
    const newChain: FallbackChainItem = {
      id: String(Date.now()),
      sourceModel: values.sourceModel.trim(),
      fallbacks: values.fallbacks.split(",").map((f: string) => f.trim()).filter(Boolean),
      triggers: values.triggers || ["429", "500", "503", "timeout"],
      enabled: true,
    };
    setChains((prev) => [...prev, newChain]);
    setChainModalOpen(false);
    chainForm.resetFields();
    messageApi.success(tt("已添加模型降级链规则", "Added fallback chain rule"));
  };

  const handleDeleteChain = (id: string) => {
    setChains((prev) => prev.filter((c) => c.id !== id));
    messageApi.success(tt("已删除降级链规则", "Deleted fallback chain rule"));
  };

  const handleToggleChain = (id: string, enabled: boolean) => {
    setChains((prev) => prev.map((c) => (c.id === id ? { ...c, enabled } : c)));
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
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="route" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("智能路由与负载均衡调度", "Intelligent Routing & Load Balancing")}
                </Title>
                <Tag color="purple">{tt("动态加权与降级链", "Dynamic Weighting & Failover")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置路由选择策略（最低延迟优先、成本最优、加权轮询）及多层级模型自动故障转移链。",
                  "Configure routing strategies (latency-first, cost-optimal, round-robin) and automated fallback chains."
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
            {tt("保存路由设置", "Save Routing Settings")}
          </Button>
        </Flex>
      </Card>

      <Form
        form={form}
        layout="vertical"
        initialValues={{
          routingStrategy: s.routingStrategy || "lowest-latency",
          autoFailover: s.autoFailover ?? true,
          healthCheckIntervalSec: s.healthCheckIntervalSec || 15,
          healthCheckTimeoutMs: s.healthCheckTimeoutMs || 3000,
          unhealthyFailureThreshold: s.unhealthyFailureThreshold || 3,
          recoveryProbeCooldownSec: s.recoveryProbeCooldownSec || 30,
          sessionStickinessWindowMinutes: s.sessionStickinessWindowMinutes || 10,
        }}
        onFinish={handleSave}
      >
        {/* 2. Routing Strategy Options */}
        <Card title={tt("全局路由决策算法", "Global Routing Strategy & Health Probing")} className={styles.sectionCard} size="small">
          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("默认模型调度决策算法", "Default Routing Strategy")} name="routingStrategy">
                <Select
                  options={[
                    { label: tt("最低延迟优先 (Lowest Latency First - 端到端 P50 测速调度)", "Lowest Latency First (P50 Benchmark)"), value: "lowest-latency" },
                    { label: tt("最低成本优先 (Lowest Cost First - 零成本与低单价优先)", "Lowest Cost First (Cost Minimization)"), value: "lowest-cost" },
                    { label: tt("动态加权轮询 (Weighted Round-Robin - 按连接权重分发)", "Weighted Round-Robin"), value: "weighted" },
                    { label: tt("主备热备故障转移 (Strict Priority Failover)", "Strict Priority Failover"), value: "failover" },
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("秒级无感故障转移 (Auto Failover)", "Seamless Auto Failover")} name="autoFailover" valuePropName="checked">
                <Switch checkedChildren={tt("已开启秒级切换", "Enabled")} unCheckedChildren={tt("关闭", "Disabled")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("健康探测心跳间隔", "Health Check Interval")} name="healthCheckIntervalSec">
                <InputNumber min={5} max={300} style={{ width: "100%" }} addonAfter={tt("秒", "s")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("探测请求单次超时", "Health Check Timeout")} name="healthCheckTimeoutMs">
                <InputNumber min={500} max={10000} step={500} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("判定剔除连续失败次数", "Failure Threshold")} name="unhealthyFailureThreshold">
                <InputNumber min={1} max={10} style={{ width: "100%" }} addonAfter={tt("次", "times")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("会话保持粘性窗口 (Stickiness)", "Session Stickiness Window")} name="sessionStickinessWindowMinutes">
                <InputNumber min={0} max={120} style={{ width: "100%" }} addonAfter={tt("分钟", "min")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 3. Dynamic Fallback Chains */}
        <Card
          title={tt("多模型层级故障降级链 (Dynamic Fallback Chains)", "Dynamic Model Fallback Chains")}
          className={styles.sectionCard}
          size="small"
          extra={
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="add" size={14} />}
              onClick={() => setChainModalOpen(true)}
            >
              {tt("新建模型降级链", "Add Fallback Chain")}
            </Button>
          }
        >
          <Table<FallbackChainItem>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={chains}
            columns={[
              {
                title: tt("主请求模型 (Primary Model)", "Primary Model"),
                dataIndex: "sourceModel",
                key: "sourceModel",
                render: (val) => <code>{val}</code>,
              },
              {
                title: tt("降级梯队链路 (Fallback Chain)", "Fallback Chain"),
                dataIndex: "fallbacks",
                key: "fallbacks",
                render: (fbs: string[]) => (
                  <Space size={4}>
                    {fbs.map((f, i) => (
                      <Tag color="cyan" key={f}>
                        #{i + 1} {f}
                      </Tag>
                    ))}
                  </Space>
                ),
              },
              {
                title: tt("触发异常状态码", "Trigger Error Codes"),
                dataIndex: "triggers",
                key: "triggers",
                render: (trigs: string[]) => (
                  <Space size={2}>
                    {trigs.map((t) => (
                      <Tag color="red" key={t} style={{ fontSize: 10 }}>
                        {t}
                      </Tag>
                    ))}
                  </Space>
                ),
              },
              {
                title: tt("状态", "Status"),
                dataIndex: "enabled",
                key: "enabled",
                render: (enabled, record) => (
                  <Switch
                    size="small"
                    checked={enabled}
                    onChange={(checked) => handleToggleChain(record.id, checked)}
                  />
                ),
              },
              {
                title: tt("操作", "Action"),
                key: "action",
                render: (_, record) => (
                  <Popconfirm
                    title={tt("确定删除此降级链吗？", "Delete this fallback chain?")}
                    onConfirm={() => handleDeleteChain(record.id)}
                    okText={tt("删除", "Delete")}
                    cancelText={tt("取消", "Cancel")}
                  >
                    <Button type="text" danger size="small" icon={<MaterialIcon name="delete" size={14} />} />
                  </Popconfirm>
                ),
              },
            ]}
          />
        </Card>
      </Form>

      {/* Add Fallback Chain Modal */}
      <Modal
        title={tt("新建模型故障降级链", "New Fallback Chain")}
        open={chainModalOpen}
        onOk={() => chainForm.submit()}
        onCancel={() => setChainModalOpen(false)}
        okText={tt("确认添加", "Add Chain")}
        cancelText={tt("取消", "Cancel")}
      >
        <Form form={chainForm} layout="vertical" onFinish={handleAddChain} style={{ marginTop: 12 }}>
          <Form.Item
            label={tt("主模型名称 (Primary Model ID)", "Primary Model ID")}
            name="sourceModel"
            rules={[{ required: true, message: tt("请输入主模型名称", "Please enter primary model") }]}
          >
            <Input placeholder="claude-3-7-sonnet" />
          </Form.Item>
          <Form.Item
            label={tt("降级梯队模型列表 (逗号分隔)", "Fallback Models (Comma-separated)")}
            name="fallbacks"
            rules={[{ required: true, message: tt("请输入至少一个备选降级模型", "Please input at least one fallback model") }]}
          >
            <Input placeholder="claude-3-5-sonnet, deepseek-reasoner, gpt-4o" />
          </Form.Item>
          <Form.Item label={tt("触发降级状态码", "Trigger Error Codes")} name="triggers" initialValue={["429", "500", "503", "timeout"]}>
            <Select
              mode="tags"
              options={[
                { label: tt("429 (速率限制/配额耗尽)", "429 (Rate Limit / Quota)"), value: "429" },
                { label: tt("500 (上游服务内部错误)", "500 (Internal Server Error)"), value: "500" },
                { label: tt("502 (网关错误)", "502 (Bad Gateway)"), value: "502" },
                { label: tt("503 (服务暂时不可用)", "503 (Service Unavailable)"), value: "503" },
                { label: tt("504 (上游网关超时)", "504 (Gateway Timeout)"), value: "504" },
                { label: tt("timeout (请求连接超时)", "timeout (Connection Timeout)"), value: "timeout" },
              ]}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SettingsRoutingPage;
