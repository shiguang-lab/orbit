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
import { radarApi, type RadarModelRanking } from "@/entities/api";
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

export function RadarPage() {
  const { styles } = useStyles();

  const radarQuery = useQuery({
    queryKey: ["radar-rankings-list"],
    queryFn: () => radarApi.getRankings(),
  });

  if (radarQuery.isLoading) {
    return <PageSkeleton />;
  }

  const rankings = radarQuery.data ?? [];

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
                background: "rgba(239, 68, 68, 0.12)",
                color: "#ef4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="radar" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  大模型市场情报雷达
                </Title>
                <Tag color="red">多维 ELO 综合评估</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                综合编码能力、深度推理能力、生成速度 (TPS) 与计费单价，全景呈现全球前沿模型的性价比雷达。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Radar Table */}
      <Card title="全球大模型多维雷达能力排行榜" className={styles.sectionCard} size="small">
        <Table<RadarModelRanking>
          rowKey="name"
          size="small"
          pagination={false}
          dataSource={rankings}
          columns={[
            {
              title: "排名与模型",
              key: "model",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Tag color={record.rank === 1 ? "gold" : record.rank === 2 ? "blue" : "default"}>
                      #{record.rank}
                    </Tag>
                    <Text strong>{record.name}</Text>
                    <Tag color="purple">{record.provider}</Tag>
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    单价: {record.pricePerM}
                  </div>
                </div>
              ),
            },
            {
              title: "代码能力 (Coding)",
              dataIndex: "codingScore",
              key: "coding",
              render: (score) => (
                <Flex align="center" gap={6}>
                  <Progress percent={score} size="small" style={{ width: 80, margin: 0 }} strokeColor="#3b82f6" />
                  <span style={{ fontSize: 11 }}>{score}</span>
                </Flex>
              ),
            },
            {
              title: "深度推理 (Reasoning)",
              dataIndex: "reasoningScore",
              key: "reasoning",
              render: (score) => (
                <Flex align="center" gap={6}>
                  <Progress percent={score} size="small" style={{ width: 80, margin: 0 }} strokeColor="#8b5cf6" />
                  <span style={{ fontSize: 11 }}>{score}</span>
                </Flex>
              ),
            },
            {
              title: "性价比指数 (Price/Perf)",
              dataIndex: "priceScore",
              key: "price",
              render: (score) => (
                <Flex align="center" gap={6}>
                  <Progress percent={score} size="small" style={{ width: 80, margin: 0 }} strokeColor="#10b981" />
                  <span style={{ fontSize: 11 }}>{score}</span>
                </Flex>
              ),
            },
            {
              title: "综合雷达分 (Composite)",
              dataIndex: "compositeScore",
              key: "composite",
              render: (score) => <Tag color="magenta" style={{ fontSize: 13, fontWeight: 700 }}>{score}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default RadarPage;
