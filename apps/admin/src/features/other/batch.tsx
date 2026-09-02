import {
  Card,
  Flex,
  Progress,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { batchApi, type BatchTaskItem } from "@/entities/api";
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

export function BatchPage() {
  const { styles } = useStyles();

  const batchQuery = useQuery({
    queryKey: ["batch-tasks-list"],
    queryFn: () => batchApi.list(),
  });

  if (batchQuery.isLoading) {
    return <PageSkeleton />;
  }

  const tasks = batchQuery.data ?? [];

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
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
                  离线批处理推理任务
                </Title>
                <Tag color="blue">享受 50% 离线折扣计费</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                提交异步批量生成任务（JSONL 文件上传），在 24 小时内以半价成本完成全量文本提取与嵌入。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Tasks Table */}
      <Card title="批处理作业清单" className={styles.sectionCard} size="small">
        <Table<BatchTaskItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={tasks}
          columns={[
            {
              title: "批处理任务名称与模型",
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
              title: "处理进度 (Progress)",
              key: "progress",
              width: 240,
              render: (_, record) => {
                const pct = Math.round((record.completedRequests / record.totalRequests) * 100);
                return (
                  <div>
                    <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                      <span>{record.completedRequests} / {record.totalRequests} 请求</span>
                      <span>{pct}%</span>
                    </Flex>
                    <Progress percent={pct} size="small" strokeColor="#3b82f6" />
                  </div>
                );
              },
            },
            {
              title: "折扣优惠",
              dataIndex: "discountPct",
              key: "discount",
              render: (pct) => <Tag color="green">立省 {pct}%</Tag>,
            },
            {
              title: "提交时间",
              dataIndex: "createdAt",
              key: "time",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: "任务状态",
              dataIndex: "status",
              key: "status",
              render: (st) => (
                <Tag color={st === "completed" ? "success" : st === "in_progress" ? "processing" : "default"}>
                  {String(st || "queued").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default BatchPage;
