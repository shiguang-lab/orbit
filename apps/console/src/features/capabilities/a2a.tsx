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

export function A2aPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

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
                  {tt("A2A 智能体互联协议总线", "A2A Agent Bus & Interconnect")}
                </Title>
                <Tag color="purple">{tt("异步消息总线", "Async Message Bus")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "支持多智能体之间点对点与发布订阅模式的结构化通信与协同任务流转。",
                  "Support peer-to-peer and pub/sub structured communication and workflow orchestration across agents."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Sessions Table */}
      <Card title={tt("活跃 A2A 跨智能体协作会话", "Active A2A Collaboration Sessions")} className={styles.sectionCard} size="small">
        <Table<A2aSessionItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={sessions}
          columns={[
            {
              title: tt("会话主题与标识", "Session Topic & ID"),
              key: "topic",
              render: (_, record) => (
                <div>
                  <Text strong>{record.topic}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    ID: {record.id} · {tt("协议", "Protocol")}: {record.protocol}
                  </div>
                </div>
              ),
            },
            {
              title: tt("发起方 → 协作目标", "Initiator → Target"),
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
              title: tt("流转消息数", "Messages"),
              dataIndex: "messagesCount",
              key: "messages",
              render: (count) => <Tag color="cyan">{count} {tt("条报文", "msgs")}</Tag>,
            },
            {
              title: tt("最近活跃时间", "Last Active"),
              dataIndex: "lastActive",
              key: "lastActive",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: tt("会话状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: (st) => (
                <Tag color={st === "active" ? "success" : "default"}>
                  {String(st || "unknown").toUpperCase()}
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
