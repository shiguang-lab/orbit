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
import { providerStatsApi, type ProviderStatRow } from "@/entities/api";
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
  statBox: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

export function ProviderStatsPage() {
  const { styles } = useStyles();

  const statsQuery = useQuery({
    queryKey: ["provider-stats-list"],
    queryFn: () => providerStatsApi.getStats(),
  });

  if (statsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const rows = statsQuery.data ?? [];

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
                background: "rgba(251, 191, 36, 0.12)",
                color: "#fbbf24",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="speed" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  提供商性能统计与延迟天梯
                </Title>
                <Tag color="gold">模型端到端测速</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                多维度度量各上游提供商与具体模型的 P50 / P95 / P99 响应延迟、Token 生成速率 (TPS) 与可用性。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Leaderboard Table */}
      <Card title="各上游模型实时性能指标排行榜" className={styles.sectionCard} size="small">
        <Table<ProviderStatRow>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={rows}
          columns={[
            {
              title: "提供商与模型",
              key: "model",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.model}</Text>
                    <Tag color="blue">{record.provider}</Tag>
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    累计调用量: {record.totalCalls.toLocaleString()} 次
                  </div>
                </div>
              ),
            },
            {
              title: "延迟分位数 (P50 / P95 / P99)",
              key: "latencies",
              render: (_, record) => (
                <Flex gap={4}>
                  <Tag color="green" style={{ margin: 0 }}>P50: {record.p50LatencyMs}ms</Tag>
                  <Tag color="blue" style={{ margin: 0 }}>P95: {record.p95LatencyMs}ms</Tag>
                  <Tag color="orange" style={{ margin: 0 }}>P99: {record.p99LatencyMs}ms</Tag>
                </Flex>
              ),
            },
            {
              title: "生成速率 (TPS)",
              dataIndex: "tokensPerSec",
              key: "tps",
              render: (tps) => <Tag color="purple">{tps} tokens/s</Tag>,
            },
            {
              title: "错误率",
              dataIndex: "errorRate",
              key: "errorRate",
              render: (err) => <Tag color={err > 1 ? "error" : "default"}>{err}%</Tag>,
            },
            {
              title: "可用率 SLA",
              dataIndex: "availability",
              key: "sla",
              render: (sla) => <Tag color="success">{sla}%</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default ProviderStatsPage;
