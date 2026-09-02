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
import { freeTiersApi, type FreeTierItem } from "@/entities/api";
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

export function FreeTiersPage() {
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
                background: "rgba(59, 130, 246, 0.12)",
                color: "#3b82f6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="request_quote" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  免费额度与零成本配额池
                </Title>
                <Tag color="blue">零成本优先调度</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                聚合 Google AI Studio、Groq、Cloudflare 等公有云免费 Token / 请求配额，最大化实现零费用推理。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Free Tiers Table */}
      <Card title="已挂载免费提供者额度水位" className={styles.sectionCard} size="small">
        <Table<FreeTierItem>
          rowKey={(r) => `${r.provider}-${r.model}`}
          size="small"
          pagination={false}
          dataSource={tiers}
          columns={[
            {
              title: "提供者与免费模型",
              key: "provider",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.model}</Text>
                    <Tag color="purple">{record.provider}</Tag>
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    每日额度重置时间: {record.resetTime}
                  </div>
                </div>
              ),
            },
            {
              title: "今日免费请求数 (Daily Requests)",
              key: "daily",
              render: (_, record) => {
                const pct = Math.round((record.usedToday / record.dailyFreeRequests) * 100);
                return (
                  <div>
                    <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                      <span>{record.usedToday.toLocaleString()} / {record.dailyFreeRequests.toLocaleString()}</span>
                      <span>{pct}%</span>
                    </Flex>
                    <Progress percent={pct} size="small" strokeColor={pct >= 100 ? "#ef4444" : "#3b82f6"} />
                  </div>
                );
              },
            },
            {
              title: "本月免费 Token 额度",
              key: "monthly",
              render: (_, record) => {
                const pct = Math.round((record.monthlyUsedTokens / record.monthlyFreeTokens) * 100);
                return (
                  <div>
                    <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                      <span>{(record.monthlyUsedTokens / 1000000).toFixed(1)}M / {(record.monthlyFreeTokens / 1000000).toFixed(1)}M</span>
                      <span>{pct}%</span>
                    </Flex>
                    <Progress percent={pct} size="small" strokeColor={pct >= 100 ? "#ef4444" : "#10b981"} />
                  </div>
                );
              },
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (st) => (
                <Tag color={st === "available" ? "success" : "error"}>
                  {st === "available" ? "● 额度充裕" : "已耗尽 (等待重置)"}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default FreeTiersPage;
