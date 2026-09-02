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
import { evalsApi, type EvalBenchmarkResult } from "@/entities/api";
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

export function EvalsPage() {
  const { styles } = useStyles();

  const evalsQuery = useQuery({
    queryKey: ["evals-benchmark-list"],
    queryFn: () => evalsApi.list(),
  });

  if (evalsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const results = evalsQuery.data ?? [];

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
                background: "rgba(167, 139, 250, 0.12)",
                color: "#a78bfa",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="labs" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  评估、盲测与基准测试 (Evals & Benchmarks)
                </Title>
                <Tag color="purple">A/B 盲测基准</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                多模型输出质量 A/B 盲测评分、压缩算法前后语义保真度测试 (Exact Match & AST) 与性能跑分。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Evals Table */}
      <Card title="已完成基准测试与盲测对比报告" className={styles.sectionCard} size="small">
        <Table<EvalBenchmarkResult>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={results}
          columns={[
            {
              title: "基准测试名称与数据集",
              key: "name",
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    数据集: {record.dataset} · 样本量: {record.totalSamples}
                  </div>
                </div>
              ),
            },
            {
              title: "对抗对比模型 (Model A vs Model B)",
              key: "models",
              render: (_, record) => (
                <div>
                  <Tag color="blue" style={{ margin: 0 }}>{record.modelA}</Tag>
                  <span style={{ margin: "0 4px", fontSize: 11 }}>VS</span>
                  <Tag color="purple" style={{ margin: 0 }}>{record.modelB}</Tag>
                </div>
              ),
            },
            {
              title: "胜率分布 (Win Rates)",
              key: "winrate",
              width: 220,
              render: (_, record) => (
                <div>
                  <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                    <span>A: {record.winRateA}%</span>
                    <span>平: {record.tieRate}%</span>
                    <span>B: {record.winRateB}%</span>
                  </Flex>
                  <Progress
                    percent={record.winRateA}
                    success={{ percent: record.winRateA + record.tieRate }}
                    size="small"
                    showInfo={false}
                  />
                </div>
              ),
            },
            {
              title: "评测指标与得分",
              key: "metric",
              render: (_, record) => (
                <div>
                  <Text style={{ fontSize: 12 }}>A: {record.avgScoreA} | B: {record.avgScoreB}</Text>
                  <div style={{ fontSize: 10, color: "var(--ant-color-text-secondary)" }}>{record.metric}</div>
                </div>
              ),
            },
            {
              title: "完成时间",
              dataIndex: "completedAt",
              key: "completedAt",
              render: (t) => <Text type="secondary" style={{ fontSize: 12 }}>{t}</Text>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default EvalsPage;
