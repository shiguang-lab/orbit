import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { cliAgentsApi, type CliAgentSession } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

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

export function CliAgentsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const agentsQuery = useQuery({
    queryKey: ["cli-agents-list"],
    queryFn: () => cliAgentsApi.list(),
  });

  const [spawnModalOpen, setSpawnModalOpen] = useState(false);
  const [form] = Form.useForm();

  const spawnMutation = useMutation({
    mutationFn: (values: any) => cliAgentsApi.spawn(values),
    onSuccess: () => {
      messageApi.success(tt("CLI 智能体已成功拉起", "CLI agent spawned successfully"));
      setSpawnModalOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["cli-agents-list"] });
    },
    onError: () => messageApi.error(tt("拉起智能体失败", "Failed to spawn agent")),
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => cliAgentsApi.terminate(id),
    onSuccess: () => {
      messageApi.success(tt("智能体进程已终止", "Agent process terminated"));
      void queryClient.invalidateQueries({ queryKey: ["cli-agents-list"] });
    },
    onError: () => messageApi.error(tt("终止智能体失败", "Failed to terminate agent")),
  });

  if (agentsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const agents = agentsQuery.data ?? [];

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
                background: "rgba(147, 197, 253, 0.12)",
                color: "#93c5fd",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="smart_toy" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("命令行智能体管控", "CLI Agent Management")}
                </Title>
                <Tag color="blue">{tt("本地子进程与终端会话", "Local Processes & Sessions")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "监控、拉起与管理宿主机及容器内的命令行智能体（如 agy, cursor-agent, claude-code），统一网关凭证与通讯隧道。",
                  "Monitor, spawn, and manage host/container CLI agents (agy, cursor-agent, claude-code) with unified gateway tunnels."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={16} />}
            onClick={() => setSpawnModalOpen(true)}
          >
            {tt("新建", "New")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Agents Table */}
      <Card title={tt("已注册 CLI 智能体列表", "Registered CLI Agents")} className={styles.sectionCard} size="small">
        <Table<CliAgentSession>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={agents}
          columns={[
            {
              title: tt("智能体名称与指令", "Agent Name & Command"),
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    {record.pid && <Tag style={{ margin: 0 }}>PID: {record.pid}</Tag>}
                  </Flex>
                  <div style={{ fontFamily: "monospace", fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 2 }}>
                    $ {record.command}
                  </div>
                </div>
              ),
            },
            {
              title: tt("工作目录", "Working Directory"),
              dataIndex: "cwd",
              key: "cwd",
              render: (cwd) => <code style={{ fontSize: 11 }}>{cwd}</code>,
            },
            {
              title: tt("通信协议", "Protocol"),
              dataIndex: "protocol",
              key: "protocol",
              render: (proto) => <Tag color="cyan">{proto || "UNKNOWN"}</Tag>,
            },
            {
              title: tt("状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "running" ? "processing" : "default"}>
                  {String(status || "stopped").toUpperCase()}
                </Tag>
              ),
            },
            {
              title: tt("最近活动", "Last Active"),
              dataIndex: "lastActive",
              key: "lastActive",
              render: (act) => <Text type="secondary" style={{ fontSize: 12 }}>{act}</Text>,
            },
            {
              title: tt("操作", "Actions"),
              key: "actions",
              width: 120,
              render: (_, record) => (
                <Popconfirm
                  title={tt("确定要终止该 CLI 智能体进程吗？", "Confirm terminating this CLI agent process?")}
                  onConfirm={() => terminateMutation.mutate(record.id)}
                  okText={tt("终止", "Terminate")}
                  cancelText={tt("取消", "Cancel")}
                >
                  <Button size="small" danger type="text" icon={<MaterialIcon name="stop" size={14} />}>
                    {tt("终止", "Terminate")}
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      {/* 3. Spawn Modal */}
      <Modal
        title={tt("拉起新 CLI 智能体", "Spawn New CLI Agent")}
        open={spawnModalOpen}
        onOk={() => form.submit()}
        confirmLoading={spawnMutation.isPending}
        onCancel={() => setSpawnModalOpen(false)}
      >
        <Form form={form} layout="vertical" onFinish={(v) => spawnMutation.mutate(v)} style={{ marginTop: 12 }}>
          <Form.Item name="name" label={tt("智能体名称", "Agent Name")} rules={[{ required: true, message: tt("请输入名称", "Please enter name") }]}>
            <Input placeholder={tt("例如：Claude Code Terminal Daemon", "e.g. Claude Code Terminal Daemon")} />
          </Form.Item>
          <Form.Item name="command" label={tt("执行指令", "Command")} rules={[{ required: true, message: tt("请输入启动指令", "Please enter command") }]}>
            <Input placeholder="例如：agy coder --port 9000" />
          </Form.Item>
          <Form.Item name="cwd" label={tt("工作目录", "Working Directory (CWD)")}>
            <Input placeholder="/workspace/my-project" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CliAgentsPage;
