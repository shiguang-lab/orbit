import {
  Alert,
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
import { useI18n } from "@/i18n";

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

export function HealthPage() {
  const { styles } = useStyles();
  const { tt, isZh } = useI18n();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / 86400);
    const h = Math.floor((seconds % 86400) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (isZh) {
      if (d > 0) return `${d}天 ${h}小时 ${m}分`;
      if (h > 0) return `${h}小时 ${m}分`;
      return `${m}分钟`;
    }
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const healthQuery = useQuery({
    queryKey: ["health-dashboard"],
    queryFn: healthApi.getHealth,
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const resetMutation = useMutation({
    mutationFn: healthApi.resetHealth,
    onSuccess: () => {
      messageApi.success(tt("健康统计指标与熔断器状态已重置", "Health metrics and circuit breakers reset"));
      queryClient.invalidateQueries({ queryKey: ["health-dashboard"] });
    },
    onError: () => messageApi.error(tt("重置失败", "Reset failed")),
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
          message={tt("加载系统健康监控失败", "Failed to load health monitoring")}
          description={healthQuery.error instanceof Error ? healthQuery.error.message : tt("无法获取网关健康探针与熔断器指标。", "Unable to retrieve health probe and circuit breaker metrics.")}
          action={
            <Button size="small" type="primary" danger onClick={() => healthQuery.refetch()}>
              {tt("重试", "Retry")}
            </Button>
          }
        />
      </div>
    );
  }

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
      title: tt("提供者", "Provider"),
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
      title: tt("熔断状态", "Circuit Breaker State"),
      key: "state",
      render: (_, r) => {
        if (r.state === "CLOSED") {
          return (
            <Tag color="success" style={{ fontWeight: 600 }}>
              {isZh ? "🟢 CLOSED (正常服务)" : "🟢 CLOSED (Normal)"}
            </Tag>
          );
        }
        if (r.state === "OPEN") {
          return (
            <Tag color="error" style={{ fontWeight: 600 }}>
              {isZh ? "🔴 OPEN (熔断隔离)" : "🔴 OPEN (Isolated)"}
            </Tag>
          );
        }
        return (
          <Tag color="warning" style={{ fontWeight: 600 }}>
            {isZh ? "🟡 HALF_OPEN (探测恢复中)" : "🟡 HALF_OPEN (Probing)"}
          </Tag>
        );
      },
    },
    {
      title: tt("成功率", "Success Rate"),
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
      title: tt("失败计数", "Failure Count"),
      dataIndex: "failureCount",
      key: "failureCount",
    },
    {
      title: tt("连续错误", "Consecutive Errors"),
      dataIndex: "consecutiveErrors",
      key: "consecutiveErrors",
      render: (v) => <span style={{ color: v > 0 ? "#EF4444" : undefined }}>{v}</span>,
    },
  ];

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
                {tt("系统健康与弹性状态", "Health & Resiliency")}
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "监控运行时内核负载、提供商熔断器状态、提示词缓存节省与网络时延指标",
                  "Monitor runtime kernel load, provider circuit breaker states, prompt cache savings, and network latency."
                )}
              </Text>
            </div>
          </Flex>

          <Space size={8}>
            <Popconfirm
              title={tt("确认重置熔断器与健康统计？", "Confirm resetting circuit breakers and health metrics?")}
              onConfirm={() => resetMutation.mutate()}
            >
              <Button danger icon={<MaterialIcon name="restart_alt" size={15} />} loading={resetMutation.isPending}>
                {tt("重置状态", "Reset State")}
              </Button>
            </Popconfirm>

            <Button
              icon={<MaterialIcon name="refresh" size={15} />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ["health-dashboard"] })}
            >
              {tt("刷新", "Refresh")}
            </Button>
          </Space>
        </Flex>
      </Card>

      {/* Overview KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title={tt("运行时间", "Uptime")}
              value={formatUptime(data?.uptimeSeconds ?? 0)}
              valueStyle={{ fontSize: 18, color: "#10B981" }}
              prefix={<MaterialIcon name="timer" size={18} style={{ color: "#10B981" }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title={tt("内存占用", "Memory RSS")}
              value={formatBytes(data?.memory?.rss ?? 0)}
              valueStyle={{ fontSize: 18, color: "#3B82F6" }}
              prefix={<MaterialIcon name="memory" size={18} style={{ color: "#3B82F6" }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title={tt("P90 时延", "P90 Latency")}
              value={`${data?.telemetry?.latencyP90 ?? 0} ms`}
              valueStyle={{ fontSize: 18, color: "#F59E0B" }}
              prefix={<MaterialIcon name="speed" size={18} style={{ color: "#F59E0B" }} />}
            />
          </Card>
        </Col>

        <Col xs={12} sm={6}>
          <Card size="small" className={styles.metricCard}>
            <Statistic
              title={tt("提示词缓存节省", "Prompt Cache Saved")}
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
            <span>{tt("上游提供商熔断器状态", "Upstream Circuit Breaker States")}</span>
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
