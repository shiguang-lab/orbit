import {
  Alert,
  Button,
  Card,
  Empty,
  Flex,
  Progress,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { utilizationApi, type UtilizationProviderMetric } from "@/entities/api";
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
}));

export function UtilizationPage() {
  const { styles } = useStyles();

  const utilQuery = useQuery({
    queryKey: ["utilization-metrics"],
    queryFn: () => utilizationApi.getMetrics(),
    refetchInterval: 15000,
  });

  if (utilQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (utilQuery.isError || !utilQuery.data) {
    return (
      <div className={styles.page}>
        <Alert
          type="error"
          showIcon
          message="加载资源利用率监控失败"
          description={utilQuery.error instanceof Error ? utilQuery.error.message : "无法从网关获取提供商配额水位与利用率快照。"}
          action={
            <Button size="small" type="primary" danger onClick={() => utilQuery.refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const metrics = utilQuery.data ?? [];

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
              <MaterialIcon name="bar_chart" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  资源利用率与吞吐负载 (Utilization)
                </Title>
                <Tag color="gold">配额与速率水位</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                来自真实配额快照与调用聚合的提供商利用率、RPM 与 TPM 负载水位。
              </Text>
            </div>
          </Flex>
          <Button
            icon={<MaterialIcon name="refresh" size={16} />}
            loading={utilQuery.isFetching}
            onClick={() => utilQuery.refetch()}
          >
            刷新
          </Button>
        </Flex>
      </Card>

      {/* 2. Metrics Table */}
      <Card title="提供者即时利用率与速率监控" className={styles.sectionCard} size="small">
        {metrics.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无活跃提供商配额与利用率数据。发起调用或配置配额规则后将在此展示水位。"
            style={{ margin: "24px 0" }}
          />
        ) : (
          <Table<UtilizationProviderMetric>
            rowKey="providerId"
            size="small"
            pagination={false}
            dataSource={metrics}
            columns={[
              {
                title: "提供者名称",
                dataIndex: "providerName",
                key: "name",
                render: (name) => <Text strong>{name}</Text>,
              },
              {
                title: "RPM 利用率 (Requests/min)",
                key: "rpm",
                render: (_, record) => (
                  <div>
                    <Flex align="center" gap={8}>
                      <Progress percent={record.rpmUtilization} size="small" style={{ width: 100, margin: 0 }} />
                      <Text style={{ fontSize: 11 }}>{record.currentRpm} / {record.maxRpm}</Text>
                    </Flex>
                  </div>
                ),
              },
              {
                title: "TPM 利用率 (Tokens/min)",
                key: "tpm",
                render: (_, record) => (
                  <div>
                    <Flex align="center" gap={8}>
                      <Progress percent={record.tpmUtilization} size="small" strokeColor="#6366f1" style={{ width: 100, margin: 0 }} />
                      <Text style={{ fontSize: 11 }}>{(record.currentTpm / 1000).toFixed(0)}k / {(record.maxTpm / 1000).toFixed(0)}k</Text>
                    </Flex>
                  </div>
                ),
              },
              {
                title: "预算消耗率",
                dataIndex: "budgetUtilization",
                key: "budget",
                render: (b) => <Tag color={b > 80 ? "error" : b > 50 ? "warning" : "green"}>{b}%</Tag>,
              },
              {
                title: "水位趋势",
                dataIndex: "trend",
                key: "trend",
                render: (trend) => (
                  <Tag color={trend === "improving" ? "green" : trend === "stable" ? "blue" : "orange"}>
                    {String(trend || "stable").toUpperCase()}
                  </Tag>
                ),
              },
            ]}
          />
        )}
      </Card>
    </div>
  );
}

export default UtilizationPage;
