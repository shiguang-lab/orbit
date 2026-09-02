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
import { webhooksApi, type WebhookSubscription } from "@/entities/api";
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

export function WebhooksPage() {
  const { styles } = useStyles();

  const whQuery = useQuery({
    queryKey: ["webhooks-list"],
    queryFn: () => webhooksApi.list(),
  });

  if (whQuery.isLoading) {
    return <PageSkeleton />;
  }

  const webhooks = whQuery.data ?? [];

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
                background: "rgba(236, 72, 153, 0.12)",
                color: "#ec4899",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="webhook" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  Webhook 事件回调管理 (Webhooks)
                </Title>
                <Tag color="pink">异步事件分发</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                订阅网关关键事件（配额预警、节点故障降级、鉴权失败、审计日志异常），实时推送到 Slack、飞书或自建 SIEM。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Webhooks Table */}
      <Card title="已注册 Webhook 订阅通道" className={styles.sectionCard} size="small">
        <Table<WebhookSubscription>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={webhooks}
          columns={[
            {
              title: "回调接收地址 (Target URL)",
              dataIndex: "url",
              key: "url",
              render: (url) => <code style={{ fontSize: 12 }}>{url}</code>,
            },
            {
              title: "订阅事件",
              dataIndex: "events",
              key: "events",
              render: (evs: string[]) => (
                <Flex gap={4} wrap>
                  {evs.map((e) => (
                    <Tag key={e} color="blue" style={{ margin: 0, fontSize: 10 }}>
                      {e}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: "投递成功率",
              dataIndex: "successRate",
              key: "successRate",
              render: (rate) => <Tag color="green">{rate}%</Tag>,
            },
            {
              title: "最近投递时间",
              dataIndex: "lastDeliveredAt",
              key: "lastDeliveredAt",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (st) => <Tag color={st === "active" ? "success" : "error"}>{st.toUpperCase()}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default WebhooksPage;
