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
import { api } from "@/entities/api";
import { useI18n } from "@/i18n";

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
  const { tt } = useI18n();
  const queryClient = useQueryClient();

  const [stateFilter, setStateFilter] = useState<string>("all");
  const [skillFilter, setSkillFilter] = useState("");
  const [taskPage, setTaskPage] = useState(1);
  const [selectedTask, setSelectedTask] = useState<A2ATask | null>(null);

  // Status & Agent Query
  const statusQuery = useQuery({
    queryKey: ["a2a-status-full"],
    queryFn: async () => {
      const res = await fetch("/api/a2a/status");
      if (!res.ok) throw new Error(tt("A2A 状态不可用", "A2A status unavailable"));
      return await res.json();
    },
    staleTime: 15_000,
  });

  // Task List Query
  const tasksQuery = useQuery({
    queryKey: ["a2a-tasks-list", taskPage, stateFilter, skillFilter],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set("limit", "10");
      params.set("offset", String((taskPage - 1) * 10));
      if (stateFilter !== "all") params.set("state", stateFilter);
      if (skillFilter) params.set("skill", skillFilter);

      const res = await fetch(`/api/a2a/tasks?${params.toString()}`);
      if (!res.ok) throw new Error(tt("A2A 任务列表不可用", "A2A task list unavailable"));
      return await res.json();
    },
    staleTime: 10_000,
  });

  // Cancel Task Mutation
  const cancelTask = useMutation({
    mutationFn: async (taskId: string) => {
      await api(`/a2a/tasks/${encodeURIComponent(taskId)}/cancel`, { method: "POST" });
    },
    onSuccess: () => {
      message.success(tt("任务已取消", "Task cancelled"));
      void queryClient.invalidateQueries({ queryKey: ["a2a-tasks-list"] });
      void queryClient.invalidateQueries({ queryKey: ["a2a-status-full"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : tt("操作失败", "Operation failed")),
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
      if (!res.ok) throw new Error(tt("分发测试失败", "Dispatch test failed"));
      return await res.json();
    },
    onSuccess: (data) => {
      message.success(tt(`A2A 同步分发测试成功 (Task: ${data?.result?.task?.id || "OK"})`, `A2A smoke dispatch test succeeded (Task: ${data?.result?.task?.id || "OK"})`));
      void queryClient.invalidateQueries({ queryKey: ["a2a-tasks-list"] });
    },
    onError: (err) => message.error(err instanceof Error ? err.message : tt("分发失败", "Dispatch failed")),
  });

  const status = statusQuery.data;
  const counts = status?.tasks?.counts;
  const skills = status?.skills || [];
  const tasksData = tasksQuery.data ?? { tasks: [], total: 0 };

  const getStateTag = (state: A2ATaskState) => {
    switch (state) {
      case "working":
        return <Tag color="processing">{tt("执行中", "Working")}</Tag>;
      case "completed":
        return <Tag color="success">{tt("已完成", "Completed")}</Tag>;
      case "failed":
        return <Tag color="error">{tt("执行失败", "Failed")}</Tag>;
      case "cancelled":
        return <Tag color="default">{tt("已取消", "Cancelled")}</Tag>;
      default:
        return <Tag color="warning">{tt("排队就绪", "Submitted")}</Tag>;
    }
  };

  const taskColumns = [
    {
      title: tt("任务标识 ID", "Task ID"),
      dataIndex: "id",
      key: "id",
      render: (v: string) => <Text code strong style={{ fontSize: 12 }}>{v}</Text>,
    },
    {
      title: tt("调度技能", "Skill"),
      dataIndex: "skill",
      key: "skill",
      render: (v: string) => <Tag color="blue">{v}</Tag>,
    },
    {
      title: tt("当前状态", "Status"),
      dataIndex: "state",
      key: "state",
      width: 110,
      render: (st: A2ATaskState) => getStateTag(st),
    },
    {
      title: tt("创建时间", "Created At"),
      dataIndex: "createdAt",
      key: "createdAt",
      width: 170,
      render: (v: string) => <Text style={{ fontSize: 12 }}>{new Date(v).toLocaleString()}</Text>,
    },
    {
      title: tt("操作", "Actions"),
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
            {tt("详情轨迹", "Details")}
          </Button>
          {(task.state === "working" || task.state === "submitted") && (
            <Popconfirm
              title={tt("确定取消该任务？", "Confirm canceling this task?")}
              onConfirm={() => cancelTask.mutate(task.id)}
            >
              <Button size="small" type="link" danger style={{ padding: 0 }}>
                {tt("取消", "Cancel")}
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
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("任务总数", "Total Tasks")}</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18 }}>
              {status?.tasks?.total ?? "—"}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("当前执行中", "Working")}</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: "#1677FF" }}>
              {counts?.working ?? "—"}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("已成功完成", "Completed")}</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: "#10B981" }}>
              {counts?.completed ?? "—"}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("失败与异常", "Failed")}</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: (counts?.failed ?? 0) > 0 ? "#EF4444" : undefined }}>
              {counts?.failed ?? "—"}
            </Title>
          </div>
        </Col>

        <Col xs={12} sm={8} lg={5}>
          <div className={styles.statCard}>
            <Text type="secondary" style={{ fontSize: 11 }}>{tt("实时活动流", "Active Streams")}</Text>
            <Title level={3} style={{ margin: "4px 0 0", fontSize: 18, color: "#8B5CF6" }}>
              {status?.tasks?.activeStreams ?? "—"} {status?.tasks?.activeStreams != null ? tt("条", "") : ""}
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
              <span>{tt("A2A 协调智能体", "A2A Coordinator Agent")} ({status?.agent?.name || "—"})</span>
              <Tag color="purple">v{status?.agent?.version || "—"}</Tag>
            </Space>
            <Space size={8}>
              <Button
                type="primary"
                icon={<MaterialIcon name="play_arrow" size={14} />}
                loading={smokeSend.isPending}
                onClick={() => smokeSend.mutate()}
              >
                {tt("发起同步冒烟分发", "Run Smoke Test Dispatch")}
              </Button>
            </Space>
          </Flex>
        }
      >
        <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
          {tt(`注册智能体技能能力库 (${skills.length} 个):`, `Registered Agent Skills (${skills.length}):`)}
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
      <Card size="small" className={styles.sectionCard} title={tt("A2A 智能体任务分发与执行审计", "A2A Task Dispatch & Execution Logs")}>
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
              { label: tt("全部状态", "All States"), value: "all" },
              { label: tt("执行中", "Working"), value: "working" },
              { label: tt("已完成", "Completed"), value: "completed" },
              { label: tt("失败", "Failed"), value: "failed" },
              { label: tt("排队中", "Submitted"), value: "submitted" },
            ]}
          />
          <Input
            placeholder={tt("按技能名称过滤...", "Filter by skill...")}
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
            {tt("刷新任务", "Refresh")}
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
            showTotal: (total) => tt(`共 ${total} 个智能体任务`, `Total ${total} agent tasks`),
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
            <span>{tt("智能体任务详情", "Agent Task Details")} · {selectedTask?.id}</span>
            {selectedTask && getStateTag(selectedTask.state)}
          </Space>
        }
        footer={[
          <Button key="close" onClick={() => setSelectedTask(null)}>
            {tt("关闭", "Close")}
          </Button>,
        ]}
      >
        {selectedTask && (
          <Flex vertical gap={14} style={{ marginTop: 12 }}>
            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 4 }}>
                {tt("任务输入载荷:", "Input Payload:")}
              </Text>
              <pre className={styles.jsonViewer}>
                {JSON.stringify(selectedTask.input, null, 2)}
              </pre>
            </div>

            <div>
              <Text strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>
                {tt("执行轨迹事件时间轴:", "Execution Events Timeline:")}
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
                  {tt("产出物结果:", "Output Artifacts:")}
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
