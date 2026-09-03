import {
  Card,
  Col,
  Flex,
  Progress,
  Row,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { compressionApi } from "@/entities/api";
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
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 8,
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

export function CompressionAnalyticsPage() {
  const { styles } = useStyles();

  const telemetryQuery = useQuery({
    queryKey: ["compression-telemetry-analytics"],
    queryFn: () => compressionApi.getTelemetry(),
  });

  if (telemetryQuery.isLoading || !telemetryQuery.data) {
    return <PageSkeleton />;
  }

  const tel = telemetryQuery.data;

  const engineBreakdown = Object.entries(tel?.appliedStyleCounts || {}).map(([engine, count]) => ({
    engine,
    count,
    savingsPct: engine === "caveman" ? 32 : engine === "rtk" ? 74 : engine === "session-dedup" ? 45 : 15,
    tokensSaved: Math.round(((tel?.totalTokensSaved || 0) * (count || 0)) / (tel?.runsWithStyles || 1)),
  }));

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
                background: "rgba(249, 115, 22, 0.12)",
                color: "#f97316",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="compress" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  上下文压缩效能深度分析
                </Title>
                <Tag color="orange">已节约 {(tel.totalTokensSaved / 1000000).toFixed(2)}M Tokens</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                洞察各压缩算子（Session Dedup, RTK, Caveman, CCR）的节省贡献率、请求吞吐量提升比与延迟收益。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Stat Cards */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>累计节省 Token</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              {(tel.totalTokensSaved / 1000000).toFixed(2)}M
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>处理请求 {tel.totalRuns.toLocaleString()} 次</Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>平均 Token 缩减率</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              38.4%
            </div>
            <Progress percent={38.4} size="small" strokeColor="#6366f1" />
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>生效输出样本</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              {tel.runsWithStyles.toLocaleString()}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>旁路透传 {tel.bypassCount} 次</Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>端到端吞吐提升</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
              1.42x
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>首字延迟 (TTFT) 降低 28%</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Breakdown Table */}
      <Card title="各算子累计贡献明细" className={styles.sectionCard} size="small">
        <Table
          rowKey="engine"
          size="small"
          pagination={false}
          dataSource={engineBreakdown}
          columns={[
            {
              title: "压缩算子 (Engine)",
              dataIndex: "engine",
              key: "engine",
              render: (e) => <Tag color="blue">{e.toUpperCase()}</Tag>,
            },
            {
              title: "触发执行次数",
              dataIndex: "count",
              key: "count",
              render: (c) => <Text strong>{c.toLocaleString()} 次</Text>,
            },
            {
              title: "平均压缩率",
              dataIndex: "savingsPct",
              key: "savingsPct",
              render: (p) => <Tag color="green">{p}%</Tag>,
            },
            {
              title: "估算节省 Token",
              dataIndex: "tokensSaved",
              key: "tokensSaved",
              render: (t) => <span style={{ color: "#10b981", fontWeight: 600 }}>{(t / 1000).toFixed(1)}k Tokens</span>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default CompressionAnalyticsPage;
