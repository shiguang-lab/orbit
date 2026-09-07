import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { MaterialIcon } from "@/app/nav";
import { batchApi, modelsApi, type BatchTaskItem } from "@/entities/api";
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

const STATUS_TAGS: Record<string, { color: string; labelZh: string; labelEn: string }> = {
  validating: { color: "gold", labelZh: "校验中", labelEn: "Validating" },
  in_progress: { color: "blue", labelZh: "执行中", labelEn: "In Progress" },
  finalizing: { color: "purple", labelZh: "归档整理", labelEn: "Finalizing" },
  completed: { color: "green", labelZh: "已完成", labelEn: "Completed" },
  failed: { color: "red", labelZh: "执行失败", labelEn: "Failed" },
  cancelled: { color: "default", labelZh: "已取消", labelEn: "Cancelled" },
};

export function BatchPage() {
  const { styles } = useStyles();
  const { isZh, tt } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createForm] = Form.useForm();

  const tasksQuery = useQuery({
    queryKey: ["batch-tasks-list"],
    queryFn: batchApi.list,
  });

  const filesQuery = useQuery({
    queryKey: ["batch-files-list"],
    queryFn: batchApi.listFiles,
  });
  const modelsQuery = useQuery({
    queryKey: ["models-catalog"],
    queryFn: modelsApi.list,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: (values: any) => batchApi.create(values),
    onSuccess: (task) => {
      messageApi.success(tt(`批处理作业创建成功！任务 ID: ${task.id}`, `Batch task created successfully! ID: ${task.id}`));
      setCreateModalOpen(false);
      createForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["batch-tasks-list"] });
    },
    onError: () => messageApi.error(tt("创建批处理作业失败", "Failed to create batch task")),
  });

  const cancelMutation = useMutation({
    mutationFn: (id: string) => batchApi.cancel(id),
    onSuccess: () => {
      messageApi.success(tt("批处理作业已取消", "Batch task cancelled"));
      void queryClient.invalidateQueries({ queryKey: ["batch-tasks-list"] });
    },
  });

  if (tasksQuery.isLoading || filesQuery.isLoading) {
    return <PageSkeleton />;
  }

  const tasks = tasksQuery.data ?? [];
  const files = filesQuery.data ?? [];

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "12px 16px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(20, 184, 166, 0.12)",
                color: "#14b8a6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="view_list" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("离线批处理推理中枢 (Batch API)", "Batch Inference Management")}
                </Title>
                <Tag color="teal">{tt("享受 50% 离线折扣优惠", "50% Off Cost")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "上传 JSONL 任务文件提交大规模异步批量请求，在 24 小时完成窗口内以半价成本完成全量生成。",
                  "Submit asynchronous batch requests via JSONL files with a 24-hour completion window and 50% price discount."
                )}
              </Text>
            </div>
          </Flex>

          <Space>
            <Button icon={<MaterialIcon name="folder" size={16} />} onClick={() => navigate("/dashboard/batch/files")}>
              {tt("管理批处理文件", "Batch Files")}
            </Button>
            <Button
              type="primary"
              icon={<MaterialIcon name="add" size={16} />}
              onClick={() => setCreateModalOpen(true)}
            >
              {tt("创建批处理作业", "New Batch Task")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 2. Tasks Table */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <span>{tt("批处理任务作业清单", "Batch Inference Tasks")}</span>
            <Tag color="blue">{tasks.length} {tt("个作业", "Tasks")}</Tag>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Table<BatchTaskItem>
          rowKey="id"
          size="small"
          dataSource={tasks}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: tt("批处理任务名称与模型", "Task Name & Model"),
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="purple">{record.targetModel}</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>{record.id}</code>
                </div>
              ),
            },
            {
              title: tt("处理进度 (Progress)", "Progress"),
              key: "progress",
              width: 260,
              render: (_, record) => {
                const total = record.totalRequests || 1;
                const completed = record.completedRequests || 0;
                const pct = Math.round((completed / total) * 100);
                return (
                  <div>
                    <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                      <span>{completed} / {total} {tt("请求", "reqs")}</span>
                      <span>{pct}%</span>
                    </Flex>
                    <Progress
                      percent={pct}
                      size="small"
                      status={record.status === "failed" ? "exception" : pct === 100 ? "success" : "active"}
                    />
                  </div>
                );
              },
            },
            {
              title: tt("折扣优惠", "Discount"),
              dataIndex: "discountPct",
              key: "discount",
              render: (pct) => pct == null ? <Text type="secondary">—</Text> : <Tag color="green">{tt(`立省 ${pct}%`, `${pct}% Off`)}</Tag>,
            },
            {
              title: tt("提交时间", "Created"),
              dataIndex: "createdAt",
              key: "time",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(t).toLocaleString()}</Text>,
            },
            {
              title: tt("任务状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: (st) => {
                const conf = STATUS_TAGS[st] || { color: "default", labelZh: st, labelEn: st };
                return <Tag color={conf.color}>{isZh ? conf.labelZh : conf.labelEn}</Tag>;
              },
            },
            {
              title: tt("操作", "Actions"),
              key: "actions",
              align: "right",
              render: (_, record) => (
                <Space>
                  {record.status === "in_progress" && (
                    <Popconfirm
                      title={tt("确定取消此批处理作业吗？", "Cancel this batch task?")}
                      onConfirm={() => cancelMutation.mutate(record.id)}
                    >
                      <Button size="small" danger icon={<MaterialIcon name="cancel" size={14} />}>
                        {tt("取消", "Cancel")}
                      </Button>
                    </Popconfirm>
                  )}
                  {record.status === "completed" && (
                    <Button size="small" type="link" icon={<MaterialIcon name="download" size={14} />}>
                      {tt("下载结果 JSONL", "Download")}
                    </Button>
                  )}
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Create Batch Task Modal */}
      <Modal
        title={tt("提交新批处理推理作业", "Create New Batch Task")}
        open={createModalOpen}
        onCancel={() => setCreateModalOpen(false)}
        onOk={() => createForm.submit()}
        confirmLoading={createMutation.isPending}
        okText={tt("提交作业", "Submit Task")}
        cancelText={tt("取消", "Cancel")}
      >
        <Form form={createForm} layout="vertical" onFinish={(v) => createMutation.mutate(v)} style={{ marginTop: 12 }}>
          <Form.Item label={tt("作业名称 (选填)", "Task Name")} name="name">
            <Input placeholder={tt("如：知识库文本离线分类向量化", "e.g. Offline Document Embeddings")} />
          </Form.Item>
          <Form.Item
            label={tt("选择输入 JSONL 文件", "Select Input File")}
            name="inputFileId"
            rules={[{ required: true, message: tt("请选择输入文件", "Please select input file") }]}
          >
            <Select
              placeholder={tt("选择已上传的 JSONL 文件...", "Select uploaded JSONL file...")}
              options={files.map((f) => ({
                label: `${f.filename} (${f.lineCount != null ? `${f.lineCount} 行 / ` : ""}${(f.bytes / 1024).toFixed(1)} KB)`,
                value: f.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label={tt("目标推理模型", "Target Model")}
            name="targetModel"
            rules={[{ required: true, message: tt("请输入目标模型", "Please input target model") }]}
          >
            <Select
              loading={modelsQuery.isLoading}
              options={(modelsQuery.data?.models ?? []).map((item) => ({ label: item.name || item.id, value: item.id }))}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default BatchPage;
