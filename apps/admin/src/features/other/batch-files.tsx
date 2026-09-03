import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
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
import { batchApi, type BatchFileItem } from "@/entities/api";
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

export function BatchFilesPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadForm] = Form.useForm();

  const filesQuery = useQuery({
    queryKey: ["batch-files-list"],
    queryFn: batchApi.listFiles,
  });

  const uploadMutation = useMutation({
    mutationFn: (values: any) => batchApi.uploadFile(values),
    onSuccess: (file) => {
      messageApi.success(tt(`文件 ${file.filename} 上传成功！`, `File ${file.filename} uploaded successfully!`));
      setUploadModalOpen(false);
      uploadForm.resetFields();
      void queryClient.invalidateQueries({ queryKey: ["batch-files-list"] });
    },
    onError: () => messageApi.error(tt("上传文件失败", "Failed to upload file")),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => batchApi.deleteFile(id),
    onSuccess: () => {
      messageApi.success(tt("文件已删除", "File deleted"));
      void queryClient.invalidateQueries({ queryKey: ["batch-files-list"] });
    },
  });

  if (filesQuery.isLoading) {
    return <PageSkeleton />;
  }

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
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="folder" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("批处理 JSONL 文件存储库", "Batch JSONL File Repository")}
                </Title>
                <Tag color="cyan">{tt("用于离线批处理作业", "Batch Input Files")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "管理已上传至网关的批量任务数据集文件，支持自动格式校验与行数解析。",
                  "Upload, validate, and manage JSONL dataset files used for batch offline inference."
                )}
              </Text>
            </div>
          </Flex>

          <Space>
            <Button icon={<MaterialIcon name="arrow_back" size={16} />} onClick={() => navigate("/dashboard/batch")}>
              {tt("返回批处理作业", "Back to Tasks")}
            </Button>
            <Button
              type="primary"
              icon={<MaterialIcon name="upload_file" size={16} />}
              onClick={() => setUploadModalOpen(true)}
            >
              {tt("上传 JSONL 数据集", "Upload File")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* 2. Files Table */}
      <Card
        title={
          <Flex justify="space-between" align="center">
            <span>{tt("已存储文件列表", "Stored JSONL Files")}</span>
            <Tag color="blue">{files.length} {tt("个文件", "Files")}</Tag>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        <Table<BatchFileItem>
          rowKey="id"
          size="small"
          dataSource={files}
          pagination={{ pageSize: 10 }}
          columns={[
            {
              title: tt("文件名称", "Filename"),
              key: "filename",
              render: (_, record) => (
                <Flex align="center" gap={8}>
                  <MaterialIcon name="description" size={18} style={{ color: "#38bdf8" }} />
                  <div>
                    <Text strong>{record.filename}</Text>
                    <br />
                    <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>{record.id}</code>
                  </div>
                </Flex>
              ),
            },
            {
              title: tt("数据行数 / 请求数", "Line Count"),
              dataIndex: "lineCount",
              key: "lines",
              render: (lines) => <Tag color="geekblue">{lines} {tt("行", "lines")}</Tag>,
            },
            {
              title: tt("文件大小", "File Size"),
              dataIndex: "bytes",
              key: "bytes",
              render: (bytes) => <Text style={{ fontFamily: "monospace" }}>{(bytes / 1024).toFixed(1)} KB</Text>,
            },
            {
              title: tt("上传时间", "Uploaded At"),
              dataIndex: "createdAt",
              key: "time",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{new Date(t).toLocaleString()}</Text>,
            },
            {
              title: tt("状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: () => <Tag color="green">Ready</Tag>,
            },
            {
              title: tt("操作", "Actions"),
              key: "actions",
              align: "right",
              render: (_, record) => (
                <Space>
                  <Button size="small" type="link" icon={<MaterialIcon name="download" size={14} />}>
                    {tt("下载", "Download")}
                  </Button>
                  <Popconfirm
                    title={tt("确定删除此批处理文件吗？", "Delete this batch file?")}
                    onConfirm={() => deleteMutation.mutate(record.id)}
                  >
                    <Button size="small" danger type="text" icon={<MaterialIcon name="delete" size={14} />} />
                  </Popconfirm>
                </Space>
              ),
            },
          ]}
        />
      </Card>

      {/* Upload File Modal */}
      <Modal
        title={tt("上传 / 注册批处理 JSONL 数据集", "Upload JSONL Batch Dataset")}
        open={uploadModalOpen}
        onCancel={() => setUploadModalOpen(false)}
        onOk={() => uploadForm.submit()}
        confirmLoading={uploadMutation.isPending}
        okText={tt("确认上传", "Upload")}
        cancelText={tt("取消", "Cancel")}
      >
        <Form form={uploadForm} layout="vertical" onFinish={(v) => uploadMutation.mutate(v)} style={{ marginTop: 12 }}>
          <Form.Item
            label={tt("文件名称 (需以 .jsonl 结尾)", "Filename")}
            name="filename"
            rules={[{ required: true, message: tt("请输入文件名称", "Please enter filename") }]}
            initialValue="dataset_batch_requests.jsonl"
          >
            <Input placeholder="input_prompts.jsonl" />
          </Form.Item>
          <Form.Item
            label={tt("数据集请求总行数 (Lines)", "Total Line Count")}
            name="lineCount"
            rules={[{ required: true, message: tt("请输入行数", "Please enter line count") }]}
            initialValue={250}
          >
            <InputNumber min={1} max={50000} style={{ width: "100%" }} addonAfter={tt("行", "lines")} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default BatchFilesPage;
