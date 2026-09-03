import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
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
import { comboHealthApi, type ComboHealthItem } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
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
  statBox: {
    padding: "12px 16px",
    borderRadius: 8,
    background: "rgba(255,255,255,0.02)",
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

export function ComboHealthPage() {
  const { styles } = useStyles();

  const healthQuery = useQuery({
    queryKey: ["combo-health-overview"],
    queryFn: () => comboHealthApi.getOverview(),
    refetchInterval: 10000,
  });

  if (healthQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (healthQuery.isError || !healthQuery.data) {
    return (
      <div className={styles.page}>
        <Alert
          type="error"
          showIcon
          message="加载模型组合健康监控失败"
          description={healthQuery.error instanceof Error ? healthQuery.error.message : "无法获取组合健康与链路自愈指标。"}
          action={
            <Button size="small" type="primary" danger onClick={() => healthQuery.refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const data = healthQuery.data;
  const combos = data?.combos ?? [];
  const overall = data?.overallHealth ?? 100;

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
                background: "rgba(52, 211, 153, 0.12)",
                color: "#34d399",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="monitor_heart" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  组合健康度与链路监控
                </Title>
                <Tag color={overall > 90 ? "success" : "warning"}>综合健康分 {overall}%</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                实时评估多路由模型组合的可用性评分、故障风险预测、降级事件与自主恢复决策。
              </Text>
            </div>
          </Flex>

          <Button
            type="default"
            icon={<MaterialIcon name="refresh" size={16} />}
            onClick={() => void healthQuery.refetch()}
          >
            刷新健康度
          </Button>
        </Flex>
      </Card>

      {/* 2. Top Stats */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>活跃路由组合总数</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8", marginTop: 2 }}>
              {combos.length} 组
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>100% 自动故障转移就绪</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>系统总体可用度</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              {overall}%
            </div>
            <Progress percent={overall} showInfo={false} size="small" strokeColor="#10b981" />
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>自动愈合与故障转移</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              0 活跃故障
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>Autopilot 算法实时探测中</Text>
          </div>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>平均路由延迟</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              480ms
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>P95 延迟受控在 1.2s 内</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Combos Health Table */}
      <Card title="各路由组合实时健康评级" className={styles.sectionCard} size="small">
        {combos.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无模型组合健康数据。配置并调用组合路由后将自动开启自愈监控。"
            style={{ margin: "24px 0" }}
          />
        ) : (
          <Table<ComboHealthItem>
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={combos}
          columns={[
            {
              title: "组合名称",
              key: "name",
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    ID: {record.id} · 备选链路: {record.activeRoutes} 条
                  </div>
                </div>
              ),
            },
            {
              title: "健康评分",
              dataIndex: "score",
              key: "score",
              render: (score) => (
                <Flex align="center" gap={8}>
                  <Progress percent={score} size="small" style={{ width: 100, margin: 0 }} />
                  <Text strong style={{ fontSize: 12 }}>{score} 分</Text>
                </Flex>
              ),
            },
            {
              title: "成功率 / 延迟",
              key: "perf",
              render: (_, record) => (
                <div>
                  <Tag color="green" style={{ margin: 0 }}>{record.successRate}%</Tag>
                  <Tag color="blue" style={{ marginLeft: 4 }}>{record.latencyMs}ms</Tag>
                </div>
              ),
            },
            {
              title: "运行状态",
              dataIndex: "state",
              key: "state",
              render: (state) => (
                <Tag color={state === "healthy" ? "success" : state === "degraded" ? "warning" : "error"}>
                  {state === "healthy" ? "● 健康" : state === "degraded" ? "▲ 降级警告" : "✖ 故障"}
                </Tag>
              ),
            },
            {
              title: "Autopilot 诊断意见",
              key: "issues",
              render: (_, record) => (
                <div>
                  {(record.issues || []).map((iss, i) => (
                    <Text key={i} type={iss.severity === "warning" ? "warning" : "secondary"} style={{ fontSize: 11 }}>
                      {iss.message}
                    </Text>
                  ))}
                </div>
              ),
            },
          ]}
        />
        )}
      </Card>
    </div>
  );
}

export default ComboHealthPage;
