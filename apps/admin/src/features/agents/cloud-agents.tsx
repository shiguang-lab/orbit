import {
  Card,
  Flex,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { cloudAgentsApi, type CloudAgentItem } from "@/entities/api";
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

export function CloudAgentsPage() {
  const { styles } = useStyles();

  const cloudQuery = useQuery({
    queryKey: ["cloud-agents-list"],
    queryFn: () => cloudAgentsApi.list(),
  });

  if (cloudQuery.isLoading) {
    return <PageSkeleton />;
  }

  const agents = cloudQuery.data ?? [];

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
                background: "rgba(125, 211, 252, 0.12)",
                color: "#7dd3fc",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="cloud" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  云端智能体服务集群
                </Title>
                <Tag color="cyan">远程智能体协同</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                注册与调度托管在云端、Serverless 或 GitHub / Sentry Webhook 回调的远程 AI 智能体。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Table */}
      <Card title="云端智能体服务实例" className={styles.sectionCard} size="small">
        <Table<CloudAgentItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={agents}
          columns={[
            {
              title: "智能体名称与类型",
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="purple">{String(record.type || "agent").toUpperCase()}</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    {record.endpoint}
                  </code>
                </div>
              ),
            },
            {
              title: "运行区域",
              dataIndex: "region",
              key: "region",
              render: (region) => <Tag color="geekblue">{region}</Tag>,
            },
            {
              title: "已处理任务数",
              dataIndex: "tasksProcessed",
              key: "tasksProcessed",
              render: (tasks) => <Text strong>{tasks.toLocaleString()} 次</Text>,
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "active" ? "success" : "default"}>
                  {String(status || "idle").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default CloudAgentsPage;
