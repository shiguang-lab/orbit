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

export function CliAgentsPage() {
  const { styles } = useStyles();
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
      messageApi.success("CLI 智能体已成功拉起");
      setSpawnModalOpen(false);
      form.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["cli-agents-list"] });
    },
    onError: () => messageApi.error("拉起智能体失败"),
  });

  const terminateMutation = useMutation({
    mutationFn: (id: string) => cliAgentsApi.terminate(id),
    onSuccess: () => {
      messageApi.success("智能体进程已终止");
      void queryClient.invalidateQueries({ queryKey: ["cli-agents-list"] });
    },
    onError: () => messageApi.error("终止智能体失败"),
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
                  CLI 智能体管控 (CLI Agents)
                </Title>
                <Tag color="blue">{agents.length} 个活跃智能体</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                监控、拉起与管理宿主机及容器内的命令行智能体（如 agy, cursor-agent, claude-code），统一网关凭证与通讯隧道。
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="add" size={16} />}
            onClick={() => setSpawnModalOpen(true)}
          >
            拉起新智能体
          </Button>
        </Flex>
      </Card>

      {/* 2. Agents Table */}
      <Card title="已注册 CLI 智能体列表" className={styles.sectionCard} size="small">
        <Table<CliAgentSession>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={agents}
          columns={[
            {
              title: "智能体名称与指令",
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
              title: "工作目录",
              dataIndex: "cwd",
              key: "cwd",
              render: (cwd) => <code style={{ fontSize: 11 }}>{cwd}</code>,
            },
            {
              title: "通信协议",
              dataIndex: "protocol",
              key: "protocol",
              render: (proto) => <Tag color="cyan">{proto || "STDIO"}</Tag>,
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "running" ? "success" : status === "idle" ? "processing" : "default"}>
                  {status.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: "最近活动",
              dataIndex: "lastActive",
              key: "lastActive",
              render: (act) => <Text type="secondary" style={{ fontSize: 12 }}>{act}</Text>,
            },
            {
              title: "操作",
              key: "actions",
              width: 120,
              render: (_, record) => (
                <Popconfirm
                  title="确定要终止该 CLI 智能体进程吗？"
                  onConfirm={() => terminateMutation.mutate(record.id)}
                  okText="终止"
                  cancelText="取消"
                >
                  <Button size="small" danger type="text" icon={<MaterialIcon name="stop" size={14} />}>
                    终止
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>

      {/* 3. Spawn Modal */}
      <Modal
        title="拉起新 CLI 智能体"
        open={spawnModalOpen}
        onOk={() => form.submit()}
        confirmLoading={spawnMutation.isPending}
        onCancel={() => setSpawnModalOpen(false)}
      >
        <Form form={form} layout="vertical" onFinish={(v) => spawnMutation.mutate(v)} style={{ marginTop: 12 }}>
          <Form.Item name="name" label="智能体名称" rules={[{ required: true, message: "请输入名称" }]}>
            <Input placeholder="例如：Claude Code Terminal Daemon" />
          </Form.Item>
          <Form.Item name="command" label="执行指令" rules={[{ required: true, message: "请输入启动指令" }]}>
            <Input placeholder="例如：agy coder --port 9000" />
          </Form.Item>
          <Form.Item name="cwd" label="工作目录 (CWD)">
            <Input placeholder="/workspace/my-project" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default CliAgentsPage;
