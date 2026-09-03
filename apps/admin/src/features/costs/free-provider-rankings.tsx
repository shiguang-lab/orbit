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
import { freeTiersApi, type FreeTierItem } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

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

export function FreeProviderRankingsPage() {
  const { styles } = useStyles();

  const freeQuery = useQuery({
    queryKey: ["free-tiers-list"],
    queryFn: () => freeTiersApi.list(),
  });

  if (freeQuery.isLoading) {
    return <PageSkeleton />;
  }

  const tiers = freeQuery.data ?? [];

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
              <MaterialIcon name="leaderboard" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  免费提供商排行与性价比天梯
                </Title>
                <Tag color="purple">社区免费额度排行</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                对比各大 AI 服务商提供的免费额度慷慨度、请求上限、RPM 限制与网络稳定性排行榜。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Rankings Table */}
      <Card title="全球公有云 LLM 免费额度天梯榜" className={styles.sectionCard} size="small">
        <Table<FreeTierItem>
          rowKey={(r) => `${r.provider}-${r.model}`}
          size="small"
          pagination={false}
          dataSource={tiers}
          columns={[
            {
              title: "排行",
              key: "rank",
              width: 70,
              render: (_, __, index) => (
                <Tag color={index === 0 ? "gold" : index === 1 ? "blue" : index === 2 ? "cyan" : "default"}>
                  #{index + 1}
                </Tag>
              ),
            },
            {
              title: "提供者与主力免费模型",
              key: "model",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.provider}</Text>
                    <Tag color="purple">{record.model}</Tag>
                  </Flex>
                </div>
              ),
            },
            {
              title: "日免费请求配额",
              dataIndex: "dailyFreeRequests",
              key: "daily",
              render: (reqs) => <Tag color="blue">{reqs.toLocaleString()} req/天</Tag>,
            },
            {
              title: "月免费 Token 配额",
              dataIndex: "monthlyFreeTokens",
              key: "monthly",
              render: (tokens) => <Text style={{ color: "#10b981", fontWeight: 600 }}>{(tokens / 1000000).toFixed(0)}M Tokens/月</Text>,
            },
            {
              title: "重置周期",
              dataIndex: "resetTime",
              key: "reset",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default FreeProviderRankingsPage;
