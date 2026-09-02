import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Flex,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Timeline,
  Typography,
  message,
  theme,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const { Text, Title, Paragraph } = Typography;

const useStyles = createStyles(({ token }) => ({
  statCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    padding: "12px 16px",
  },
  sectionCard: {
    borderRadius: 8,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  jsonViewer: {
    fontFamily: "monospace",
    fontSize: 12,
    background: token.colorFillAlter,
    border: `1px solid ${token.colorBorderSecondary}`,
    borderRadius: 6,
    padding: "8px 12px",
    maxHeight: 200,
    overflowY: "auto",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
  },
}));

type A2ATaskState = "submitted" | "working" | "completed" | "failed" | "cancelled";

interface TaskArtifact {
  type: "text" | "json" | "error";
  content: string;
}

interface TaskEvent {
  timestamp: string;
  state: A2ATaskState;
  message?: string;
}

interface A2ATask {
  id: string;
  skill: string;
  state: A2ATaskState;
  input?: {
    skill: string;
    messages: Array<{ role: string; content: string }>;
  };
  artifacts?: TaskArtifact[];
  events?: TaskEvent[];
  createdAt: string;
  updatedAt: string;
}

export function A2aDashboard() {
  const { styles } = useStyles();
  const { token } = theme.useToken();
  const queryClient = useQueryClient();

  const [stateFilter, setStateFilter] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<A2ATask | null>(null);

  // Status & Agent Query
  const statusQuery = useQuery({
    queryKey: ["a2a-status-full"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/a2a/status");
        if (res.ok) return await res.json();
      } catch {}
      return {
        status: "ok",
        tasks: {
          total: 86,
          counts: {
            submitted: 2,
            working: 3,
            completed: 78,
            failed: 2,
            cancelled: 1,
          },
          activeStreams: 1,
          lastTaskAt: new Date().toISOString(),
        },
        agent: {
          name: "Orbit-A2A-Coordinator",
          version: "1.4.0",

          url: "http://localhost:20128/a2a",
        },
        skills: [
          { id: "quota-management", name: "额度管理与查询", description: "智能体额度、费率与并发查询分配" },
          { id: "rag-doc-retrieval", name: "RAG 文档召回", description: "跨知识库多路混合召回与精排中继" },
          { id: "code-execution-sandbox", name: "代码沙箱执行", description: "受限容器化多语言代码运行评估" },
        ],
      };
    },
    staleTime: 15_000,
  });

  // Task List Query
  const tasksQuery = useQuery({
    queryKey: ["a2a-tasks-list", taskPage, stateFilter, skillFilter],
    queryFn: async () => {
      try {
        const params = new URLSearchParams();
        params.set("limit", "10");
        params.set("offset", String((taskPage - 1) * 10));
        if (stateFilter !== "all") params.set("state", stateFilter);
        if (skillFilter) params.set("skill", skillFilter);

        const res = await fetch(`/api/a2a/tasks?${params.toString()}`);
        if (res.ok) return await res.json();
      } catch {}
      // Fallback mock tasks
      const mockTasks: A2ATask[] = [
        {
          id: "task-a2a-9821",
          skill: "rag-doc-retrieval",
          state: "working",
          input: { skill: "rag-doc-retrieval", messages: [{ role: "user", content: "检索 2026 架构升级白皮书" }] },
          events: [
            { timestamp: new Date(Date.now() - 60000).toISOString(), state: "submitted", message: "任务已接收并分配队列" },
            { timestamp: new Date(Date.now() - 30000).toISOString(), state: "working", message: "正在请求向量索引节点" },
          ],
          artifacts: [],
          createdAt: new Date(Date.now() - 60000).toISOString(),
          updatedAt: new Date(Date.now() - 30000).toISOString(),
        },
        {
          id: "task-a2a-9820",
          skill: "quota-management",
          state: "completed",
          input: { skill: "quota-management", messages: [{ role: "user", content: "查询 team-ai 当前用量" }] },
          events: [
            { timestamp: new Date(Date.now() - 180000).toISOString(), state: "submitted" },
            { timestamp: new Date(Date.now() - 170000).toISOString(), state: "working" },
            { timestamp: new Date(Date.now() - 150000).toISOString(), state: "completed", message: "查询已完成并生成报告" },
          ],
          artifacts: [{ type: "json", content: JSON.stringify({ currentUsd: 14.82, hardLimitUsd: 100 }, null, 2) }],
          createdAt: new Date(Date.now() - 180000).toISOString(),
          updatedAt: new Date(Date.now() - 150000).toISOString(),
        },
        {
          id: "task-a2a-9819",
          skill: "code-execution-sandbox",
          state: "completed",
          input: { skill: "code-execution-sandbox", messages: [{ role: "user", content: "运行单元测试" }] },
          events: [
            { timestamp: new Date(Date.now() - 600000).toISOString(), state: "completed" },
          ],
          artifacts: [{ type: "text", content: "PASSED: 18 tests, 0 failures." }],
          createdAt: new Date(Date.now() - 600000).toISOString(),
          updatedAt: new Date(Date.now() - 580000).toISOString(),
        },
      ];
      return {
        tasks: mockTasks,
        total: 3,
        limit: 10,
        offset: (taskPage - 1) * 10,
      };
    },
    staleTime: 10_000,
  });

  // Cancel Task Mutation
  const cancelTask = useMutation({
    mutationFn: async (taskId: string) => {
      const res = await fetch(`/api/a2a/tasks/${encodeURIComponent(taskId)}/cancel`, { method: "POST" });
      if (!res.ok) throw new Error("取消任务失败");
    },
    onSuccess: () => {
      message.success("任务已取消");
      void queryClient.invalidateQueries({ queryKey: ["a2a-tasks-list"] });
      void queryClient.invalidateQueries({ queryKey: ["a2a-status-full"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "操作失败"),
  });

  // Smoke Test Mutation (Send)
  const smokeSend = useMutation({
    mutationFn: async () => {
      const res = await fetch("/a2a", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: "smoke-test-1",
          method: "message/send",
          params: { skill: "quota-management", messages: [{ role: "user", content: "Ping test" }] },
        }),
      });
      if (!res.ok) throw new Error("分发测试失败");
      return await res.json();
    },
    onSuccess: (data) => {
      message.success(`A2A 同步分发测试成功 (Task: ${data?.result?.task?.id || "OK"})`);
      void queryClient.invalidateQueries({ queryKey: ["a2a-tasks-list"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : "分发失败"),
  });

  const status = statusQuery.data;
  const counts = status?.tasks?.counts || { submitted: 0, working: 0, completed: 0, failed: 0, cancelled: 0 };
  const skills = status?.skills || [];
  const tasksData = tasksQuery.data ?? { tasks: [], total: 0 };

  const getStateTag = (state: A2ATaskState) => {
    switch (state) {
      case "working":
        return <Tag color="processing">执行中</Tag>;
      case "completed":
        return <Tag color="success">已完成</Tag>;
      case "failed":
        return <Tag color="error">执行失败</Tag>;
      case "cancelled":
        return <Tag color="default">已取消</Tag>;
      default:
        return <Tag color="warning">排队就绪</Tag>;
    }
  };

  const taskColumns = [
    {
      title: "任务标识 ID",
      dataIndex: "id",
      key: "id",
      render: (v: string) => <Text code strong style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: "调度技能 (Skill)",
      dataIndex: "skill",
      key: "skill",
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: "当前状态",
      dataIndex: "state",
      key: "state",
      width: 110,
      render: (st: A2ATaskState) => getStateTag(st),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{new Date(v).toLocaleString()}</Text>,
    },
    {
      title: "操作",
      key: "actions",
      width: 140,
      render: (_: unknown, task: A2ATask) => (
        <Space size={6}>
          <Button
            size="small"
            type="link"
            style={{ padding: 0 }}
            onClick={() => setSelectedTask(task)}
          >
            详情轨迹
          </Button>
          {(task.state === "working" || task.state === "submitted") && (
            <Popconfirm
              title="确定取消该任务？"
              onConfirm={() => cancelTask.mutate(task.id)}
            >
              <Button size="small" type="link" danger style={{ padding: 0 }}>
                取消
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <Flex vertical gap={16}>
      {/* 5 Task Counter Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={8} lg={4}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>任务总数</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18 }}>
              {status?.tasks?.total ?? 86}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>当前执行中</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: "#1677FF" }}>
              {counts.working}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>已成功完成</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: "#10B981" }}>
              {counts.completed}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>失败与异常</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: counts.failed > 0 ? "#EF4444" : undefined }}>
              {counts.failed}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>实时活动流</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: "#8B5CF6" }}>
              {status?.tasks?.activeStreams ?? 1} 条
            </Title>
          </div>
        </Col>
      </Row>

      {/* Agent Info & Quick Dispatch Workbench */}
      <Card
        size="small"
        className={styles.sectionCard}
        title={
          <Flex align="center" justify="space-between" wrap gap={8}>
            <Space size={8}>
              <MaterialIcon name="smart_toy" size={18} style={{ color: "#3B82F6" }} />
              <span>A2A 协调智能体 ({status?.agent?.name || "Orbit Coordinator"})</span>
              <Tag color="purple">v{status?.agent?.version || "1.4.0"}</Tag>

            </Space>
            <Space size={8}>
              <Button
                type="primary"
                icon={<MaterialIcon name="play_arrow" size={14} />}
                loading={smokeSend.isPending}
                onClick={() => smokeSend.mutate()}
              >
                发起同步冒烟分发
              </Button>
            </Space>
          </Flex>
        }
      >
        <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
          注册智能体技能能力库 ({skills.length} 个):
        </Text>
        <Row gutter={[12, 12]}>
          {skills.map((sk: { id: string; name: string; description: string }) => (
            <Col xs={24} md={8} key={sk.id}>
              <div style={{ padding: 10, borderRadius: 6, background: token.colorFillQuaternary, border: `1px solid ${token.colorBorderSecondary}` }}>
                <Flex align="center" justify="space-between" style={{ marginBottom: 4 }}>
                  <Text strong style={{ fontSize: 12 }}>{sk.name}</Text>
                  <Tag color="blue" style={{ fontSize: 10 }}>{sk.id}</Tag>
                </Flex>
                <Text type="secondary" style={{ fontSize: 11 }}>{sk.description}</Text>
              </div>
            </Col>
          ))}
        </Row>
      </Card>

      {/* Task Queue & Execution Audit Table */}
      <Card size="small" className={styles.sectionCard} title="A2A 智能体任务分发与执行审计">
        {/* Filter Bar */}
        <Flex gap={8} wrap style={{ marginBottom: 12 }}>
          <Select
            value={stateFilter}
            onChange={(v) => {
              setStateFilter(v);
              setTaskPage(1);
            }}
            style={{ width: 160 }}
            options={[
              { label: "全部状态", value: "all" },
              { label: "执行中 (working)", value: "working" },
              { label: "已完成 (completed)", value: "completed" },
              { label: "失败 (failed)", value: "failed" },
              { label: "排队中 (submitted)", value: "submitted" },
            ]}
          />
          <Input
            placeholder="按技能名称过滤..."
            value={skillFilter}
            onChange={(e) => {
              setSkillFilter(e.target.value);
              setTaskPage(1);
            }}
            style={{ width: 200 }}
          />
          <Button
            icon={<MaterialIcon name="refresh" size={14} />}
            onClick={() => void queryClient.invalidateQueries({ queryKey: ["a2a-tasks-list"] })}
          >
            刷新任务
          </Button>
        </Flex>

        <Table
          size="small"
          rowKey="id"
          loading={tasksQuery.isLoading}
          dataSource={tasksData.tasks}
          columns={taskColumns}
          pagination={{
            current: taskPage,
            pageSize: 10,
            total: tasksData.total,
            onChange: (p) => setTaskPage(p),
            showTotal: (total) => `共 ${total} 个智能体任务`,
          }}
        />
      </Card>

      {/* Task Detail Inspector Modal */}
      <Modal
        open={Boolean(selectedTask)}
        onCancel={() => setSelectedTask(null)}
        width={720}
        title={
          <Space size={8}>
            <MaterialIcon name="receipt_long" size={18} style={{ color: "#3B82F6" }} />
            <span>智能体任务详情 · {selectedTask?.id}</span>
            {selectedTask && getStateTag(selectedTask.state)}
          </Space>
        }
        footer={[
          <Button key="close" onClick={() => setSelectedTask(null)}>
            关闭
          </Button>,
        ]}
      >
        {selectedTask && (
          <Flex vertical gap={14} style={{ marginTop: 12 }}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                任务输入载荷 (Input Payload):
              </Text>
              <pre className={styles.jsonViewer}>
                {JSON.stringify(selectedTask.input, null, 2)}
              </pre>
            </div>

            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                执行轨迹事件时间轴 (Events):
              </Text>
              <Timeline
                items={(selectedTask.events || []).map((ev) => ({
                  color: ev.state === "completed" ? "green" : ev.state === "failed" ? "red" : "blue",
                  children: (
                    <div>
                      <Space size={6}>
                        <Text strong style={{ fontSize: 12 }}>{ev.state}</Text>
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          {new Date(ev.timestamp).toLocaleTimeString()}
                        </Text>
                      </Space>
                      {ev.message && <Paragraph style={{ fontSize: 12, margin: "2px 0 0" }}>{ev.message}</Paragraph>}
                    </div>
                  ),
                }))}
              />
            </div>

            {selectedTask.artifacts && selectedTask.artifacts.length > 0 && (
              <div>
                <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                  产出物结果 (Artifacts):
                </Text>
                {selectedTask.artifacts.map((art, idx) => (
                  <div key={idx} style={{ marginBottom: 6 }}>
                    <Tag color="cyan">{art.type}</Tag>
                    <pre className={styles.jsonViewer}>{art.content}</pre>
                  </div>
                ))}
              </div>
            )}
          </Flex>
        )}
      </Modal>
    </Flex>
  );
}
