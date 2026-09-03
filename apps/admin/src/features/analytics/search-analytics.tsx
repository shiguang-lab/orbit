import {
  Alert,
  Button,
  Card,
  Col,
  Empty,
  Flex,
  Progress,
  Row,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { searchAnalyticsApi } from "@/entities/api";
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
  providerRow: {
    padding: "10px 0",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": {
      borderBottom: "none",
    },
  },
}));

export function SearchAnalyticsPage() {
  const { styles } = useStyles();

  const {
    data: stats,
    isLoading,
    isError,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["search-analytics-data"],
    queryFn: () => searchAnalyticsApi.getData(),
  });

  if (isLoading) {
    return <PageSkeleton />;
  }

  if (isError || !stats) {
    return (
      <div className={styles.page}>
        <Alert
          type="error"
          showIcon
          message="加载搜索分析失败"
          description={error instanceof Error ? error.message : "无法获取搜索聚合统计，请检查后端网络与服务状态。"}
          action={
            <Button size="small" type="primary" danger onClick={() => refetch()}>
              重试
            </Button>
          }
        />
      </div>
    );
  }

  const providers = Object.entries(stats.byProvider || {}).sort(
    ([, a], [, b]) => (b?.count ?? 0) - (a?.count ?? 0),
  );

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
                background: "rgba(56, 189, 248, 0.12)",
                color: "#38bdf8",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="manage_search" size={24} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                搜索分析 (Search Analytics)
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                来自调用日志（request_type = 'search'）的搜索请求度量、提供商分布、缓存命中率与成本总览。
              </Text>
            </div>
          </Flex>
          <Button
            icon={<MaterialIcon name="refresh" size={16} />}
            loading={isFetching}
            onClick={() => refetch()}
          >
            刷新
          </Button>
        </Flex>
      </Card>

      {/* 2. KPI Cards */}
      <Row gutter={[12, 12]}>
        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="manage_search" size={18} />
              <span>搜索请求总量</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#38bdf8" }}>
              {stats.total.toLocaleString()}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              今日 {stats.today.toLocaleString()} 次
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="cached" size={18} />
              <span>缓存命中率</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#10b981" }}>
              {stats.cacheHitRate}%
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stats.cached.toLocaleString()} 次命中缓存
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="attach_money" size={18} />
              <span>搜索累计成本</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#f59e0b" }}>
              ${stats.totalCostUsd.toFixed(4)}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              外部搜索 API 费用
            </Text>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <Card className={styles.statCard} styles={{ body: { padding: 16 } }}>
            <Flex align="center" gap={6} style={{ color: "var(--ant-color-text-secondary)", fontSize: 13, marginBottom: 4 }}>
              <MaterialIcon name="timer" size={18} />
              <span>平均响应延迟</span>
            </Flex>
            <div style={{ fontSize: 24, fontWeight: 700, color: "#a855f7" }}>
              {stats.avgDurationMs}ms
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {stats.errors > 0 ? `${stats.errors} 次错误` : "无异常"}
            </Text>
          </Card>
        </Col>
      </Row>

      {/* 3. Provider Breakdown */}
      {providers.length > 0 && (
        <Card
          title={
            <Flex align="center" gap={8}>
              <MaterialIcon name="hub" size={20} style={{ color: "#38bdf8" }} />
              <span>提供商用量分布 (Provider Breakdown)</span>
            </Flex>
          }
          className={styles.sectionCard}
          size="small"
        >
          <div style={{ display: "flex", flexDirection: "column" }}>
            {providers.map(([provider, pData]) => {
              const count = pData?.count ?? 0;
              const cost = pData?.costUsd ?? 0;
              const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
              return (
                <div key={provider} className={styles.providerRow}>
                  <Flex justify="space-between" align="center" style={{ marginBottom: 4 }}>
                    <Text strong>{provider}</Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {count.toLocaleString()} 次请求 · ${cost.toFixed(4)}
                    </Text>
                  </Flex>
                  <Progress percent={pct} size="small" strokeColor="#38bdf8" />
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* 4. Empty State */}
      {stats.total === 0 && (
        <Card className={styles.sectionCard} styles={{ body: { padding: 32 } }}>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={
              <div>
                <Text strong style={{ fontSize: 15 }}>尚无搜索请求</Text>
                <div style={{ marginTop: 4, fontSize: 12, color: "var(--ant-color-text-secondary)" }}>
                  使用 <code>/v1/search</code> 接口发起搜索请求后，相关指标将在此实时呈现。
                </div>
              </div>
            }
          />
        </Card>
      )}

      {/* 5. Free Tier Banner */}
      <Alert
        type="info"
        showIcon
        icon={<MaterialIcon name="check_circle" size={18} style={{ color: "#10b981" }} />}
        message="内置免费搜索额度"
        description="Serper (2,500 次/月), Brave (2,000 次/月), Exa (1,000 次/月), Tavily (1,000 次/月) —— 每月合计支持 6,500+ 次免费搜索，配置对应 Key 后即可自动路由与容灾切换。"
      />
    </div>
  );
}

export default SearchAnalyticsPage;
