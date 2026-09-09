import { useEffect, useState } from "react";
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

import { Radio } from "antd";
import { combosApi } from "@/entities/api";

interface FallbackChainItem {
  id: string;
  sourceModel: string;
  fallbacks: string[];
  triggers: string[];
  enabled: boolean;
}

interface WildcardAliasItem {
  pattern: string;
  target: string;
}

export function SettingsRoutingPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [chainModalOpen, setChainModalOpen] = useState(false);
  const [chainForm] = Form.useForm();
  const [aliasModalOpen, setAliasModalOpen] = useState(false);
  const [aliasForm] = Form.useForm();
  const { tt } = useI18n();

  const settingsQuery = useQuery({
    queryKey: ["settings-routing-full"],
    queryFn: () => settingsApi.getSettings(),
  });

  const combosQuery = useQuery({
    queryKey: ["combos-for-routing"],
    queryFn: () => combosApi.list(),
  });

  const [chains, setChains] = useState<FallbackChainItem[]>([]);
  const [modelAliases, setModelAliases] = useState<Record<string, string>>({});
  const [wildcardAliases, setWildcardAliases] = useState<WildcardAliasItem[]>([]);

  useEffect(() => {
    if (settingsQuery.data) {
      const d = settingsQuery.data as any;
      if (Array.isArray(d.fallbackChains)) {
        setChains(d.fallbackChains);
      }
      if (d.modelAliases && typeof d.modelAliases === "object") {
        setModelAliases(d.modelAliases);
      }
      if (Array.isArray(d.wildcardAliases)) {
        setWildcardAliases(d.wildcardAliases);
      }
    }
  }, [settingsQuery.data]);

  const saveMutation = useMutation({
    mutationFn: (values: any) =>
      settingsApi.updateSettings({
        ...values,
        fallbackChains: chains,
        modelAliases,
        wildcardAliases,
      }),
    onSuccess: () => {
      messageApi.success(tt("智能路由与调度策略已成功保存", "Routing settings saved successfully"));
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
    saveMutation.mutate(values);
  };

  const handleAddChain = (values: any) => {
    const newChain: FallbackChainItem = {
      id: String(Date.now()),
      sourceModel: values.sourceModel.trim(),
      fallbacks: values.fallbacks.split(",").map((f: string) => f.trim()).filter(Boolean),
      triggers: values.triggers || ["429", "500", "503", "timeout"],
      enabled: true,
    };
    const updated = [...chains, newChain];
    setChains(updated);
    setChainModalOpen(false);
    chainForm.resetFields();
    settingsApi.updateSettings({ fallbackChains: updated });
    messageApi.success(tt("已添加模型降级链规则", "Added fallback chain rule"));
  };

  const handleDeleteChain = (id: string) => {
    const updated = chains.filter((c) => c.id !== id);
    setChains(updated);
    settingsApi.updateSettings({ fallbackChains: updated });
    messageApi.success(tt("已删除降级链规则", "Deleted fallback chain rule"));
  };

  const handleToggleChain = (id: string, enabled: boolean) => {
    const updated = chains.map((c) => (c.id === id ? { ...c, enabled } : c));
    setChains(updated);
    settingsApi.updateSettings({ fallbackChains: updated });
  };

  const handleAddAlias = (values: any) => {
    if (values.type === "wildcard") {
      const updated = [...wildcardAliases, { pattern: values.from.trim(), target: values.to.trim() }];
      setWildcardAliases(updated);
      settingsApi.updateSettings({ wildcardAliases: updated });
    } else {
      const updated = { ...modelAliases, [values.from.trim()]: values.to.trim() };
      setModelAliases(updated);
      settingsApi.updateSettings({ modelAliases: updated });
    }
    setAliasModalOpen(false);
    aliasForm.resetFields();
    messageApi.success(tt("模型别名映射已添加", "Model alias added"));
  };

  const handleDeleteExactAlias = (fromKey: string) => {
    const next = { ...modelAliases };
    delete next[fromKey];
    setModelAliases(next);
    settingsApi.updateSettings({ modelAliases: next });
    messageApi.success(tt("已删除模型别名", "Model alias deleted"));
  };

  const handleDeleteWildcardAlias = (index: number) => {
    const next = wildcardAliases.filter((_, i) => i !== index);
    setWildcardAliases(next);
    settingsApi.updateSettings({ wildcardAliases: next });
    messageApi.success(tt("已删除通配别名", "Wildcard alias deleted"));
  };

  const comboOptions = (combosQuery.data?.combos || []).map((c: any) => ({
    label: `${c.name || c.id} (${c.id})`,
    value: c.id,
  }));

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
                  {tt("智能路由与调度策略 (Routing & Load Balancing)", "Intelligent Routing & Load Balancing")}
                </Title>
                <Tag color="purple">{tt("模型别名 / 默认组合 / 降级链", "Aliases / Combo Defaults / Fallbacks")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置全局路由算法、未匹配请求默认组合分流、统一模型别名重定向与多层级模型故障转移降级链。",
                  "Configure global routing algorithms, default combo fallback, model aliases, and multi-tier failover chains."
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
          defaultComboId: s.defaultComboId || "",
          healthCheckIntervalSec: s.healthCheckIntervalSec || 15,
          healthCheckTimeoutMs: s.healthCheckTimeoutMs || 3000,
          unhealthyFailureThreshold: s.unhealthyFailureThreshold || 3,
          sessionStickinessWindowMinutes: s.sessionStickinessWindowMinutes || 10,
        }}
        onFinish={handleSave}
      >
        <Flex vertical gap={12}>
        {/* 2. Routing Strategy Options */}
        <Card title={tt("全局路由决策调度策略", "Global Routing Strategy & Health Probing")} className={styles.sectionCard} size="small">
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
            <Col xs={24} sm={12}>
              <Form.Item
                label={tt("未配置模型默认路由组合 (Combo Defaults)", "Default Fallback Combo for Unmapped Models")}
                name="defaultComboId"
                tooltip={tt("当客户端请求未在路由表中的模型时，自动转发给此路由组合兜底处理", "Fallback combo when model has no explicit route")}
              >
                <Select
                  allowClear
                  placeholder={tt("选择默认组合...", "Select default combo...")}
                  options={comboOptions}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("健康探测心跳间隔", "Health Check Interval")} name="healthCheckIntervalSec">
                <InputNumber min={5} max={300} style={{ width: "100%" }} addonAfter={tt("秒", "s")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={6}>
              <Form.Item label={tt("判定剔除连续失败次数", "Failure Threshold")} name="unhealthyFailureThreshold">
                <InputNumber min={1} max={10} style={{ width: "100%" }} addonAfter={tt("次", "times")} />
              </Form.Item>
            </Col>
          </Row>
        </Card>

        {/* 3. Model Aliases Unified */}
        <Card
          title={tt("统一模型别名与通配符映射 (Model Aliases)", "Unified Model Aliases & Wildcards")}
          className={styles.sectionCard}
          size="small"
          extra={
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="add" size={14} />}
              onClick={() => {
                aliasForm.resetFields();
                setAliasModalOpen(true);
              }}
            >
              {tt("新建", "New")}
            </Button>
          }
        >
          <Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
            {tt(
              "支持精准映射（如 gpt-4 → openai/gpt-4o）与通配符规则（如 claude-3-7-* → anthropic/claude-3-7-sonnet），无需客户端修改请求模型名称。",
              "Map legacy or custom model names to real backend model IDs."
            )}
          </Text>

          <Table
            rowKey="from"
            size="small"
            pagination={{ pageSize: 5 }}
            dataSource={[
              ...Object.entries(modelAliases).map(([from, to]) => ({
                from,
                to,
                type: "exact",
              })),
              ...wildcardAliases.map((item, index) => ({
                from: item.pattern,
                to: item.target,
                type: "wildcard",
                wildcardIndex: index,
              })),
            ]}
            columns={[
              {
                title: tt("请求输入别名 (Incoming Alias)", "Incoming Alias"),
                dataIndex: "from",
                key: "from",
                render: (text) => <code>{text}</code>,
              },
              {
                title: tt("目标模型 (Target Model)", "Target Model"),
                dataIndex: "to",
                key: "to",
                render: (text) => <Tag color="blue">{text}</Tag>,
              },
              {
                title: tt("规则类型", "Type"),
                dataIndex: "type",
                key: "type",
                render: (type) => (
                  <Tag color={type === "wildcard" ? "orange" : "purple"}>
                    {type === "wildcard" ? tt("通配符规则", "Wildcard") : tt("精确匹配", "Exact")}
                  </Tag>
                ),
              },
              {
                title: tt("操作", "Action"),
                key: "action",
                render: (_, record: any) => (
                  <Popconfirm
                    title={tt("确定删除此别名映射吗？", "Delete this alias?")}
                    onConfirm={() => {
                      if (record.type === "wildcard") {
                        handleDeleteWildcardAlias(record.wildcardIndex);
                      } else {
                        handleDeleteExactAlias(record.from);
                      }
                    }}
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

        {/* 4. Dynamic Fallback Chains */}
        <Card
          title={tt("多模型层级故障降级链 (Dynamic Fallback Chains)", "Dynamic Model Fallback Chains")}
          className={styles.sectionCard}
          size="small"
          extra={
            <Button
              type="primary"
              size="small"
              icon={<MaterialIcon name="add" size={14} />}
              onClick={() => {
                chainForm.resetFields();
                setChainModalOpen(true);
              }}
            >
              {tt("新建", "New")}
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
        </Flex>
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

      {/* Add Alias Modal */}
      <Modal
        title={tt("添加模型别名重定向", "Add Model Alias")}
        open={aliasModalOpen}
        onOk={() => aliasForm.submit()}
        onCancel={() => setAliasModalOpen(false)}
        okText={tt("确认添加", "Add Alias")}
        cancelText={tt("取消", "Cancel")}
      >
        <Form form={aliasForm} layout="vertical" onFinish={handleAddAlias} initialValues={{ type: "exact" }} style={{ marginTop: 12 }}>
          <Form.Item label={tt("匹配类型", "Match Type")} name="type">
            <Radio.Group>
              <Radio.Button value="exact">{tt("精准匹配 (Exact)", "Exact")}</Radio.Button>
              <Radio.Button value="wildcard">{tt("通配符匹配 (Wildcard)", "Wildcard")}</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item
            label={tt("入站别名 / 通配表达式 (From)", "Incoming Alias / Pattern")}
            name="from"
            rules={[{ required: true, message: tt("请输入入站别名", "Please enter alias") }]}
          >
            <Input placeholder="gpt-4 or claude-3-7-*" />
          </Form.Item>
          <Form.Item
            label={tt("重定向目标模型 (Target To)", "Target Model")}
            name="to"
            rules={[{ required: true, message: tt("请输入目标真实模型标识", "Please enter target model") }]}
          >
            <Input placeholder="openai/gpt-4o or anthropic/claude-3-7-sonnet" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default SettingsRoutingPage;
