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
import { a2aApi, type A2aSessionItem } from "@/entities/api";
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

export function A2aPage() {
  const { styles } = useStyles();

  const a2aQuery = useQuery({
    queryKey: ["a2a-sessions-list"],
    queryFn: () => a2aApi.list(),
  });

  if (a2aQuery.isLoading) {
    return <PageSkeleton />;
  }

  const sessions = a2aQuery.data ?? [];

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
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="device_hub" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  A2A 智能体互联协议总线
                </Title>
                <Tag color="purple">异步消息总线</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                支持多智能体之间点对点 (P2P) 与发布订阅 (Pub/Sub) 模式的结构化通信与协同任务流转。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Sessions Table */}
      <Card title="活跃 A2A 跨智能体协作会话" className={styles.sectionCard} size="small">
        <Table<A2aSessionItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={sessions}
          columns={[
            {
              title: "会话主题与标识",
              key: "topic",
              render: (_, record) => (
                <div>
                  <Text strong>{record.topic}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    ID: {record.id} · 协议: {record.protocol}
                  </div>
                </div>
              ),
            },
            {
              title: "发起方 → 协作目标 (Initiator → Target)",
              key: "agents",
              render: (_, record) => (
                <Flex align="center" gap={6}>
                  <Tag color="blue">{record.initiatorAgent}</Tag>
                  <span>→</span>
                  <Tag color="purple">{record.targetAgent}</Tag>
                </Flex>
              ),
            },
            {
              title: "流转消息数",
              dataIndex: "messagesCount",
              key: "messages",
              render: (count) => <Tag color="cyan">{count} 条报文</Tag>,
            },
            {
              title: "最近活跃时间",
              dataIndex: "lastActive",
              key: "lastActive",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: "会话状态",
              dataIndex: "status",
              key: "status",
              render: (st) => (
                <Tag color={st === "active" ? "processing" : "default"}>
                  {String(st || "active").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default A2aPage;
