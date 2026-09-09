import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  evalsApi,
  type EvalRun,
  type EvalResult,
} from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  statCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    height: "100%",
  },
  codeSnippet: {
    fontFamily: "monospace",
    fontSize: 12,
    background: "rgba(0, 0, 0, 0.04)",
    padding: "4px 8px",
    borderRadius: 6,
    display: "block",
    whiteSpace: "pre-wrap",
    wordBreak: "break-word",
  },
}));

export function EvalsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();

  const [selectedSuiteId, setSelectedSuiteId] = useState<string>("golden-set");
  const [selectedTargetKey, setSelectedTargetKey] = useState<string>("suite-default:__default__");
  const [compareTargetKey, setCompareTargetKey] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form] = Form.useForm();

  // 1. Load Evals Dashboard data
  const dashboardQuery = useQuery({
    queryKey: ["evals-dashboard"],
    queryFn: () => evalsApi.getDashboard(),
  });

  // 2. Mutations
  const runSuiteMutation = useMutation({
    mutationFn: (params: { suiteId: string; target?: any; compareTarget?: any }) =>
      evalsApi.runSuite(params),
    onSuccess: () => {
      message.success("评估测试执行完成");
      queryClient.invalidateQueries({ queryKey: ["evals-dashboard"] });
    },
    onError: (err: any) => {
      message.error(err.message || "测试执行失败");
    },
  });

  const saveSuiteMutation = useMutation({
    mutationFn: (suite: any) => evalsApi.saveSuite(suite),
    onSuccess: () => {
      message.success("测试套件保存成功");
      setIsModalOpen(false);
      form.resetFields();
      queryClient.invalidateQueries({ queryKey: ["evals-dashboard"] });
    },
    onError: (err: any) => {
      message.error(err.message || "保存套件失败");
    },
  });

  const deleteSuiteMutation = useMutation({
    mutationFn: (suiteId: string) => evalsApi.deleteSuite(suiteId),
    onSuccess: () => {
      message.success("测试套件已删除");
      queryClient.invalidateQueries({ queryKey: ["evals-dashboard"] });
    },
    onError: (err: any) => {
      message.error(err.message || "删除失败");
    },
  });

  if (dashboardQuery.isLoading) {
    return <PageSkeleton />;
  }

  const data = dashboardQuery.data || {
    suites: [],
    recentRuns: [],
    scorecard: null,
    targets: [],
    apiKeys: [],
  };

  const suites = data.suites;
  const recentRuns = data.recentRuns;
  const scorecard = data.scorecard;
  const targets = data.targets;

  const currentSuite = suites.find((s) => s.id === selectedSuiteId) || suites[0];

  const filteredCases = (currentSuite?.cases || []).filter((c) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      c.name.toLowerCase().includes(query) ||
      (c.model || "").toLowerCase().includes(query) ||
      (c.expected?.value || "").toLowerCase().includes(query)
    );
  });

  const targetOptions = targets.map((t) => ({
    label: `${t.label} - ${t.description}`,
    value: t.key,
  }));

  const handleRunCurrent = () => {
    if (!currentSuite) return;
    const [rawType, ...rawId] = selectedTargetKey.split(":");
    const target = {
      type: rawType as "suite-default" | "model" | "combo",
      id: rawId.join(":") || null,
    };

    let compareTarget: any = undefined;
    if (compareTargetKey) {
      const [cType, ...cId] = compareTargetKey.split(":");
      compareTarget = {
        type: cType as "suite-default" | "model" | "combo",
        id: cId.join(":") || null,
      };
    }

    runSuiteMutation.mutate({
      suiteId: currentSuite.id,
      target,
      compareTarget,
    });
  };

  return (
    <div className={styles.page}>
      {/* 1. Header Card */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={14}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(167, 139, 250, 0.12)",
                color: "#8b5cf6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="labs" size={26} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                  模型评估与测试套件 (Evals)
                </Title>
                <Tag color="purple">自动化质量验证</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 13 }}>
                对大模型终端、路由组合及提示词质量进行 Golden Set 基准测试、多模型对比与回归校验。
              </Text>
            </div>
          </Flex>

          <Space wrap>
            <Button
              type="primary"
              style={{ background: "#8b5cf6" }}
              icon={<MaterialIcon name="play_arrow" size={16} />}
              loading={runSuiteMutation.isPending}
              onClick={handleRunCurrent}
            >
              运行当前测试套件
            </Button>
            <Button
              icon={<MaterialIcon name="add" size={16} />}
              onClick={() => {
                form.resetFields();
                setIsModalOpen(true);
              }}
            >
              新建
            </Button>
          </Space>
        </Flex>

        {/* Top KPIs */}
        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Card size="small" className={styles.statCard}>
              <Text type="secondary" style={{ fontSize: 12 }}>测试套件总数</Text>
              <Title level={3} style={{ margin: "4px 0 0 0", color: "#8b5cf6" }}>
                {suites.length}
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Card size="small" className={styles.statCard}>
              <Text type="secondary" style={{ fontSize: 12 }}>Golden Set 用例总数</Text>
              <Title level={3} style={{ margin: "4px 0 0 0" }}>
                {scorecard?.totalCases || suites.reduce((sum, s) => sum + (s.cases?.length || s.caseCount || 0), 0)}
              </Title>
            </Card>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Card size="small" className={styles.statCard}>
              <Text type="secondary" style={{ fontSize: 12 }}>总体通过率 (Pass Rate)</Text>
              <Flex align="center" gap={8} style={{ marginTop: 4 }}>
                <Title level={3} style={{ margin: 0, color: "#10b981" }}>
                  {scorecard ? `${scorecard.overallPassRate}%` : "100%"}
                </Title>
                <Progress percent={scorecard?.overallPassRate || 100} size="small" showInfo={false} strokeColor="#10b981" style={{ flex: 1, margin: 0 }} />
              </Flex>
            </Card>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <Card size="small" className={styles.statCard}>
              <Text type="secondary" style={{ fontSize: 12 }}>最近运行记录</Text>
              <Title level={3} style={{ margin: "4px 0 0 0" }}>
                {recentRuns.length} 次
              </Title>
            </Card>
          </Col>
        </Row>
      </Card>

      {/* 2. Target Selector & Suite Switcher */}
      <Card className={styles.sectionCard} styles={{ body: { padding: "16px 20px" } }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} md={8}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>选择测试套件：</Text>
            <Select
              style={{ width: "100%" }}
              value={selectedSuiteId}
              onChange={(val) => setSelectedSuiteId(val)}
              options={suites.map((s) => ({
                label: `${s.name} (${s.cases?.length || s.caseCount || 0} 用例) ${s.source === "custom" ? "· 自定义" : ""}`,
                value: s.id,
              }))}
            />
          </Col>

          <Col xs={24} md={8}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>主执行目标 (Target)：</Text>
            <Select
              style={{ width: "100%" }}
              value={selectedTargetKey}
              onChange={(val) => setSelectedTargetKey(val)}
              options={targetOptions}
            />
          </Col>

          <Col xs={24} md={8}>
            <Text strong style={{ display: "block", marginBottom: 6 }}>对照对比目标 (可选 A/B 对比)：</Text>
            <Select
              style={{ width: "100%" }}
              placeholder="不对比（单目标执行）"
              allowClear
              value={compareTargetKey}
              onChange={(val) => setCompareTargetKey(val)}
              options={targetOptions.filter((t) => t.value !== selectedTargetKey)}
            />
          </Col>
        </Row>
      </Card>

      {/* 3. Suite Cases Table */}
      <Card
        className={styles.sectionCard}
        title={
          <Flex justify="space-between" align="center" wrap gap={8}>
            <div>
              <Text strong style={{ fontSize: 16 }}>{currentSuite?.name}</Text>
              <Text type="secondary" style={{ fontSize: 12, marginLeft: 8 }}>
                {currentSuite?.description || "标准评测用例集"}
              </Text>
            </div>
            {currentSuite?.source === "custom" && (
              <Popconfirm
                title="确定删除此测试套件？"
                onConfirm={() => deleteSuiteMutation.mutate(currentSuite.id)}
              >
                <Button danger type="link">删除此套件</Button>
              </Popconfirm>
            )}
          </Flex>
        }
        extra={
          <Input
            placeholder="搜索用例名称/模型/预期..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: 240 }}
            allowClear
          />
        }
      >
        <Table
          rowKey="id"
          dataSource={filteredCases}
          pagination={{ pageSize: 8 }}
          columns={[
            {
              title: "用例 ID 与名称",
              key: "name",
              width: 220,
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", fontFamily: "monospace" }}>
                    {record.id}
                  </div>
                </div>
              ),
            },
            {
              title: "目标模型",
              dataIndex: "model",
              key: "model",
              width: 180,
              render: (m) => <Tag color="geekblue">{m || "默认目标"}</Tag>,
            },
            {
              title: "测试输入 Prompt",
              key: "input",
              render: (_, record) => {
                const userMsg = record.input?.messages?.find((m) => m.role === "user")?.content || "";
                return (
                  <div className={styles.codeSnippet}>
                    {userMsg}
                  </div>
                );
              },
            },
            {
              title: "校验策略与预期值",
              key: "expected",
              width: 220,
              render: (_, record) => (
                <div>
                  <Tag color={record.expected?.strategy === "exact" ? "green" : record.expected?.strategy === "regex" ? "orange" : "blue"}>
                    {record.expected?.strategy || "contains"}
                  </Tag>
                  <Text code style={{ fontSize: 12 }}>{record.expected?.value || "—"}</Text>
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* 4. Recent Runs History */}
      <Card className={styles.sectionCard} title="最近测试运行报告与诊断">
        {recentRuns.length === 0 ? (
          <Empty description="暂无测试运行记录，点击顶部「运行当前测试套件」发起测试" />
        ) : (
          <Table<EvalRun>
            rowKey="id"
            dataSource={recentRuns}
            pagination={{ pageSize: 5 }}
            expandable={{
              expandedRowRender: (record) => (
                <div style={{ padding: "8px 0" }}>
                  <Text strong style={{ marginBottom: 8, display: "block" }}>详细单项用例测试结果：</Text>
                  <Table<EvalResult>
                    rowKey="caseId"
                    dataSource={record.results}
                    pagination={false}
                    size="small"
                    columns={[
                      { title: "用例名称", dataIndex: "caseName", key: "caseName" },
                      {
                        title: "验证状态",
                        dataIndex: "passed",
                        key: "passed",
                        width: 100,
                        render: (p) => (p ? <Tag color="success">✓ 通过</Tag> : <Tag color="error">✕ 失败</Tag>),
                      },
                      { title: "耗时", dataIndex: "durationMs", key: "durationMs", width: 100, render: (d) => `${d}ms` },
                      {
                        title: "实际输出摘要",
                        key: "actual",
                        render: (_, r) => (
                          <Text code style={{ fontSize: 11 }}>
                            {r.details?.actualSnippet || r.details?.actual || "—"}
                          </Text>
                        ),
                      },
                    ]}
                  />
                </div>
              ),
            }}
            columns={[
              {
                title: "套件与目标",
                key: "suite",
                render: (_, record) => (
                  <div>
                    <Text strong>{record.suiteName}</Text>
                    <div style={{ fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                      执行目标: <Tag>{record.target?.label || "默认"}</Tag>
                    </div>
                  </div>
                ),
              },
              {
                title: "平均延迟",
                dataIndex: "avgLatencyMs",
                key: "latency",
                width: 120,
                render: (ms) => <Text strong style={{ color: "#8b5cf6" }}>{ms} ms</Text>,
              },
              {
                title: tt("通过率", "Pass Rate"),
                key: "summary",
                width: 200,
                render: (_, record) => (
                  <div>
                    <Flex justify="space-between" style={{ fontSize: 12 }}>
                      <Text>{record.summary.passed} / {record.summary.total} {tt("通过", "passed")}</Text>
                      <Text strong style={{ color: record.summary.passRate === 100 ? "#10b981" : "#f59e0b" }}>
                        {record.summary.passRate}%
                      </Text>
                    </Flex>
                    <Progress
                      percent={record.summary.passRate}
                      size="small"
                      showInfo={false}
                      strokeColor={record.summary.passRate === 100 ? "#10b981" : "#f59e0b"}
                    />
                  </div>
                ),
              },
              {
                title: "测试时间",
                dataIndex: "createdAt",
                key: "createdAt",
                width: 180,
                render: (time) => new Date(time).toLocaleString(),
              },
            ]}
          />
        )}
      </Card>

      {/* 5. Create Custom Suite Modal */}
      <Modal
        title="创建自定义评估测试套件"
        open={isModalOpen}
        onCancel={() => setIsModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={saveSuiteMutation.isPending}
        width={680}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            saveSuiteMutation.mutate({
              name: values.name,
              description: values.description,
              cases: [
                {
                  name: values.caseName || "默认测试用例",
                  model: values.model || "gpt-4o",
                  userPrompt: values.userPrompt,
                  strategy: values.strategy || "contains",
                  expectedValue: values.expectedValue,
                },
              ],
            });
          }}
        >
          <Form.Item name="name" label="套件名称" rules={[{ required: true, message: "请输入套件名称" }]}>
            <Input placeholder="例如：客服场景回复准确性测试集" />
          </Form.Item>
          <Form.Item name="description" label="套件描述">
            <Input.TextArea placeholder="简要描述该评测用例集的测试目标..." rows={2} />
          </Form.Item>

          <Card title="初始测试用例" size="small" style={{ background: "rgba(0, 0, 0, 0.02)" }}>
            <Form.Item name="caseName" label="用例名称" initialValue="用例 1">
              <Input placeholder="用例名称" />
            </Form.Item>
            <Form.Item name="model" label="测试模型" initialValue="gpt-4o">
              <Input placeholder="gpt-4o / claude-sonnet-4 等" />
            </Form.Item>
            <Form.Item name="userPrompt" label="用户测试输入 Prompt" rules={[{ required: true, message: "请输入 Prompt" }]}>
              <Input.TextArea placeholder="输入要发送给模型的测试 Prompt..." rows={3} />
            </Form.Item>
            <Row gutter={12}>
              <Col span={12}>
                <Form.Item name="strategy" label="预期校验策略" initialValue="contains">
                  <Select
                    options={[
                      { label: "包含子串 (Contains)", value: "contains" },
                      { label: "完全一致 (Exact Match)", value: "exact" },
                      { label: "正则表达式 (Regex)", value: "regex" },
                    ]}
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="expectedValue" label="预期匹配内容" rules={[{ required: true, message: "请输入预期值" }]}>
                  <Input placeholder="期望匹配的文本或正则" />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Form>
      </Modal>
    </div>
  );
}

export default EvalsPage;
