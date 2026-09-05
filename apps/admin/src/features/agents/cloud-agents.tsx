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

export function CloudAgentsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

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
                  {tt("云端智能体服务集群", "Cloud Agent Service Cluster")}
                </Title>
                <Tag color="cyan">{tt("远程智能体协同", "Remote Agent Swarm")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "注册与调度托管在云端、Serverless 或 GitHub / Sentry Webhook 回调的远程 AI 智能体。",
                  "Register and coordinate remote AI agents hosted on Cloud, Serverless, or Webhooks."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Table */}
      <Card title={tt("云端智能体服务实例", "Cloud Agent Instances")} className={styles.sectionCard} size="small">
        <Table<CloudAgentItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={agents}
          columns={[
            {
              title: tt("智能体名称与类型", "Agent Name & Type"),
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
              title: tt("运行区域", "Region"),
              dataIndex: "region",
              key: "region",
              render: (region) => <Tag color="geekblue">{region}</Tag>,
            },
            {
              title: tt("已处理任务数", "Tasks Processed"),
              dataIndex: "tasksProcessed",
              key: "tasksProcessed",
              render: (tasks) => <Text strong>{tasks.toLocaleString()} {tt("次", "tasks")}</Text>,
            },
            {
              title: tt("状态", "Status"),
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
