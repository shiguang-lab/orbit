import { useMemo, useState } from "react";
import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Row,
  Table,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import {
  providerStatsApi,
  type ModelStat,
  type ProviderStat,
} from "@/entities/api";
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
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  statCard: {
    borderRadius: 10,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    height: "100%",
  },
}));

function formatNumber(n: number | null | undefined): string {
  if (n == null) return "0";
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatLatency(ms: number | null | undefined): string {
  if (ms == null) return "—";
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

function formatSuccessRate(successful: number, total: number): string {
  if (!total) return "—";
  return `${((successful / total) * 100).toFixed(1)}%`;
}

export function ProviderStatsPage() {
  const { styles } = useStyles();
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["provider-stats-data"],
    queryFn: async () => {
      const res = await providerStatsApi.getStats();
      setLastRefreshedAt(new Date());
      return res;
    },
    refetchInterval: 30000,
  });

  const providers = data?.providers ?? [];
  const models = data?.models ?? [];
  const toolLatency = data?.toolLatency ?? {};

  // Summary stats
  const totalRequests = useMemo(
    () => providers.reduce((acc, p) => acc + (p.totalRequests || 0), 0),
    [providers],
  );
  const totalSuccessful = useMemo(
    () => providers.reduce((acc, p) => acc + (p.successfulRequests || 0), 0),
    [providers],
  );
  const avgLatency = useMemo(() => {
    if (!providers.length) return 0;
    return Math.round(
      providers.reduce((acc, p) => acc + (p.avgLatencyMs || 0), 0) / providers.length,
    );
  }, [providers]);

  // Group models by provider
  const modelsByProvider = useMemo(() => {
    const map = new Map<string, ModelStat[]>();
    for (const m of models) {
      const list = map.get(m.provider) || [];
      list.push(m);
      map.set(m.provider, list);
    }
    return map;
  }, [models]);

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || !data) {
    return (
      <div className={styles.page}>
        <Alert
          type="error"
          showIcon
          message="加载提供商性能统计失败"
          description={error instanceof Error ? error.message : "无法获取提供商与模型性能聚合数据。"}
          action={
            <Button size="small" type="primary" danger onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const columns: ColumnsType<ProviderStat> = [
    {
      title: "提供商 (Provider)",
      dataIndex: "provider",
      key: "provider",
      render: (text: string) => <Text strong>{text}</Text>,
    },
    {
      title: "总请求数",
      dataIndex: "totalRequests",
      key: "totalRequests",
      sorter: (a, b) => a.totalRequests - b.totalRequests,
      defaultSortOrder: "descend",
      render: (val: number) => formatNumber(val),
    },
    {
      title: "成功率",
      key: "successRate",
      render: (_, r) => {
        const rate = r.totalRequests > 0 ? (r.successfulRequests / r.totalRequests) * 100 : 0;
        const color = rate >= 99 ? "green" : rate >= 90 ? "orange" : "red";
        return <Tag color={color}>{formatSuccessRate(r.successfulRequests, r.totalRequests)}</Tag>;
      },
      sorter: (a, b) => {
        const rateA = a.totalRequests > 0 ? a.successfulRequests / a.totalRequests : 0;
        const rateB = b.totalRequests > 0 ? b.successfulRequests / b.totalRequests : 0;
        return rateA - rateB;
      },
    },
    {
      title: "平均延迟",
      dataIndex: "avgLatencyMs",
      key: "avgLatencyMs",
      sorter: (a, b) => a.avgLatencyMs - b.avgLatencyMs,
      render: (ms: number) => formatLatency(ms),
    },
    {
      title: "输入 Token (In)",
      dataIndex: "totalTokensIn",
      key: "totalTokensIn",
      sorter: (a, b) => (a.totalTokensIn || 0) - (b.totalTokensIn || 0),
      render: (val: number) => formatNumber(val),
    },
    {
      title: "输出 Token (Out)",
      dataIndex: "totalTokensOut",
      key: "totalTokensOut",
      sorter: (a, b) => (a.totalTokensOut || 0) - (b.totalTokensOut || 0),
      render: (val: number) => formatNumber(val),
    },
    {
      title: "工具后首字 (TTFT)",
      key: "toolTtft",
      render: (_, r) => {
        const t = toolLatency[r.provider];
        return t?.avgTtftAfterToolMs ? formatLatency(t.avgTtftAfterToolMs) : "—";
      },
    },
  ];

  const expandedRowRender = (record: ProviderStat) => {
    const subModels = modelsByProvider.get(record.provider) || [];
    if (!subModels.length) {
      return (
        <div style={{ padding: "8px 16px", color: "var(--ant-color-text-secondary)", fontSize: 12 }}>
          暂无该提供商具体模型的详细细分数据
        </div>
      );
    }

    const subColumns: ColumnsType<ModelStat> = [
      {
        title: "模型名称 (Model)",
        dataIndex: "model",
        key: "model",
        render: (name: string) => <Text code>{name}</Text>,
      },
      {
        title: "请求数",
        dataIndex: "requests",
        key: "requests",
        render: (r: number) => formatNumber(r),
      },
      {
        title: "成功率",
        key: "successRate",
        render: (_, m) => (
          <Tag color={m.requests > 0 && m.successfulRequests === m.requests ? "green" : "orange"}>
            {formatSuccessRate(m.successfulRequests, m.requests)}
          </Tag>
        ),
      },
      {
        title: "平均延迟",
        dataIndex: "avgLatencyMs",
        key: "avgLatencyMs",
        render: (ms: number) => formatLatency(ms),
      },
    ];

    return (
      <Table
        rowKey="model"
        size="small"
        pagination={false}
        columns={subColumns}
        dataSource={subModels}
        style={{ margin: "4px 0" }}
      />
    );
  };

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
              <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                提供商性能统计 (Provider Stats)
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                来自真实调用日志聚合的提供商与模型性能表现，包含吞吐量、响应延迟、成功率及工具调用指标。
              </Text>
            </div>
          </Flex>
          <Flex align="center" gap={12}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              上次更新：{lastRefreshedAt.toLocaleTimeString()}
            </Text>
            <Button
              icon={<MaterialIcon name="refresh" size={16} />}
              loading={isFetching}
              onClick={() => refetch()}
            >
              刷新
            </Button>
          </Flex>
        </Flex>
      </Card>

      {/* 2. KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="analytics" size={18} />
              <span>总请求量 (Total Requests)</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#38bdf8" }}>
              {formatNumber(totalRequests)}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              累计已记录的网关请求总数
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="timer" size={18} />
              <span>全局平均延迟</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#a855f7" }}>
              {formatLatency(avgLatency)}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              所有活跃提供商平均响应时间
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="check_circle" size={18} />
              <span>整体成功率</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>
              {formatSuccessRate(totalSuccessful, totalRequests)}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              成功请求：{formatNumber(totalSuccessful)}
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="dns" size={18} />
              <span>活跃提供商数</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#fbbf24" }}>
              {providers.length}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              有流量记录的上游连接数
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 3. Provider Breakdown Table */}
      <Card
        title={
          <Flex align="center" gap={8}>
            <MaterialIcon name="table_chart" size={20} style={{ color: "#38bdf8" }} />
            <span>提供商与模型指标明细 (Provider & Model Breakdown)</span>
          </Flex>
        }
        className={styles.sectionCard}
        size="small"
      >
        {providers.length === 0 ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="暂无提供商调用性能数据。当有流量经过网关后，此处将按提供商与模型自动统计。"
            style={{ margin: "24px 0" }}
          />
        ) : (
          <Table
            rowKey="provider"
            size="small"
            columns={columns}
            dataSource={providers}
            expandable={{
              expandedRowRender,
              rowExpandable: (record) => Boolean(modelsByProvider.get(record.provider)?.length),
            }}
            pagination={{ pageSize: 20, showSizeChanger: true }}
          />
        )}
      </Card>
    </div>
  );
}

export default ProviderStatsPage;
