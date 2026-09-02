import {
  Button,
  Card,
  Col,
  Flex,
  Popconfirm,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import type { TableColumnsType } from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { healthApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
  },
  metricCard: {
    borderRadius: 10,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  sectionCard: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
}));

function formatUptime(seconds: number) {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}天 ${h}小时 ${m}分`;
  if (h > 0) return `${h}小时 ${m}分`;
  return `${m}分钟`;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function HealthPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const healthQuery = useQuery({
    queryKey: ["health-dashboard"],
    queryFn: healthApi.getHealth,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const resetMutation = useMutation({
    mutationFn: healthApi.resetHealth,
    onSuccess: () => {
      messageApi.success("健康统计指标与熔断器状态已重置");
      queryClient.invalidateQueries({ queryKey: ["health-dashboard"] });
    },
    onError: () => messageApi.error("重置失败"),
  });

  const data = healthQuery.data;

  // Circuit Breaker Table Rows
  const cbRows = Object.entries(data?.circuitBreakers ?? {}).map(([provider, val]) => ({
    provider,
    state: val.state,
    successRate: val.successRate,
    failureCount: val.failureCount,
    consecutiveErrors: val.consecutiveErrors,
  }));

  const cbColumns: TableColumnsType<(typeof cbRows)[number]> = [
    {
      title: "提供者 (Provider)",
      key: "provider",
      render: (_, r) => (
        <Space>
          <Tag color="cyan" style={{ fontFamily: "monospace", fontSize: 12 }}>
            {r.provider}
          </Tag>
        </Space>
      ),
    },
    {
      title: "熔断状态 (Circuit Breaker)",
      key: "state",
      render: (_, r) => {
        if (r.state === "CLOSED") {
          return (
            <Tag color="success" style={{ fontWeight: 600 }}>
              🟢 CLOSED (正常服务)
            </Tag>
          );
        }
        if (r.state === "OPEN") {
          return (
            <Tag color="error" style={{ fontWeight: 600 }}>
              🔴 OPEN (熔断隔离)
            </Tag>
          );
        }
        return (
          <Tag color="warning" style={{ fontWeight: 600 }}>
            🟡 HALF_OPEN (探测恢复中)
          </Tag>
        );
      },
    },
    {
      title: "成功率",
      key: "successRate",
      render: (_, r) => (
        <Progress
          percent={Math.round(r.successRate)}
          size="small"
          status={r.successRate < 95 ? "exception" : "normal"}
          style={{ width: 140 }}
        />
      ),
    },
    {
      title: "失败计数",
      dataIndex: "failureCount",
      key: "failureCount",
    },
    {
      title: "连续错误",
      dataIndex: "consecutiveErrors",
      key: "consecutiveErrors",
      render: (v) => <span style={{ color: v > 0 ? "#EF4444" : undefined }}>{v}</span>,
    },
  ];

  if (healthQuery.isLoading && !healthQuery.data) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* Header */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(239, 68, 68, 0.12)",
                color: "#EF4444",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="health_and_safety" size={22} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                健康状态 (Health & Resiliency)
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                监控运行时内核负载、提供商熔断器状态、提示词缓存节省与网络时延指标
              </Text>
            </div>
          </Flex>

          <Space size={8}>
            <Popconfirm
              title="确认重置熔断器与健康统计？"
              onConfirm={() => resetMutation.mutate()}
            >
              <Button danger icon={<MaterialIcon name="restart_alt" size={15} />} loading={resetMutation.isPending}>
                重置状态
              </Button>
            </Popconfirm>

            <Button
              icon={<MaterialIcon name="refresh" size={15} />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ["health-dashboard"] })}
            >
              刷新
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* Overview KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title="运行时间 (Uptime)"
              value={formatUptime(data?.uptimeSeconds ?? 0)}
              valueStyle={{ fontSize: 18, color: "#10B981" }}
              prefix={<MaterialIcon name="timer" size={18} style={{ color: "#10B981" }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title="内存占用 (RSS)"
              value={formatBytes(data?.memory?.rss ?? 0)}
              valueStyle={{ fontSize: 18, color: "#3B82F6" }}
              prefix={<MaterialIcon name="memory" size={18} style={{ color: "#3B82F6" }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title="P90 时延 (Latency)"
              value={`${data?.telemetry?.latencyP90 ?? 0} ms`}
              valueStyle={{ fontSize: 18, color: "#F59E0B" }}
              prefix={<MaterialIcon name="speed" size={18} style={{ color: "#F59E0B" }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title="提示词缓存节省"
              value={`${((data?.promptCache?.savedTokens ?? 0) / 1000).toFixed(1)}k Tokens`}
              valueStyle={{ fontSize: 18, color: "#8B5CF6" }}
              prefix={<MaterialIcon name="savings" size={18} style={{ color: "#8B5CF6" }} />}
            />
          </Card>
        </Col>
      </Row>

      {/* Circuit Breaker Table Card */}
      <Card
        className={styles.sectionCard}
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="shield" size={18} style={{ color: "#EF4444" }} />
            <span>上游提供商熔断器状态 (Circuit Breakers)</span>
          </Flex>
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table
          dataSource={cbRows}
          columns={cbColumns}
          rowKey="provider"
          pagination={false}
          size="middle"
        />
      </Card>
    </div>
  );
}

export default HealthPage;
