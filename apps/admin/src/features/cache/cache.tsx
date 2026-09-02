import {
  Button,
  Card,
  Col,
  Flex,
  Popconfirm,
  Progress,
  Row,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { cacheAnalyticsApi } from "@/entities/api";
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

export function CachePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();

  const cacheQuery = useQuery({
    queryKey: ["cache-stats"],
    queryFn: () => cacheAnalyticsApi.getStats(),
  });

  const clearMutation = useMutation({
    mutationFn: () => cacheAnalyticsApi.clearCache(),
    onSuccess: () => {
      messageApi.success("缓存数据已全部清除");
      void queryClient.invalidateQueries({ queryKey: ["cache-stats"] });
    },
    onError: () => messageApi.error("清除缓存失败"),
  });

  if (cacheQuery.isLoading || !cacheQuery.data) {
    return <PageSkeleton />;
  }

  const stats = cacheQuery.data;

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(132, 204, 22, 0.12)",
                color: "#84cc16",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="cached" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  缓存中心与推理缓存 (Cache & Reasoning Memory)
                </Title>
                <Tag color="success">全局命中率 {stats.hitRate}%</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                管理语义缓存、Prompt 静态前缀缓存与 DeepSeek-R1 / o1 推理链缓存，极大加速响应并降低费用。
              </Text>
            </div>
          </Flex>

          <Popconfirm
            title="确定要清空所有网关缓存吗？"
            onConfirm={() => clearMutation.mutate()}
            okText="立即清空"
            cancelText="取消"
          >
            <Button danger icon={<MaterialIcon name="delete_sweep" size={16} />} loading={clearMutation.isPending}>
              清空全局缓存
            </Button>
          </Popconfirm>
        </Flex>
      </Card>

      {/* 2. Stat Cards */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>缓存节省 Token</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              {(stats.totalTokensSaved / 1000000).toFixed(2)}M
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>直接节约 ${stats.costSavedUsd} 美元</Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>推理链缓存命中率 (Reasoning)</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              {stats.reasoningCacheHitRate}%
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              节约 {(stats.reasoningTokensSaved / 1000000).toFixed(2)}M 思考 Token
            </Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>内存占用水位</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#06b6d4", marginTop: 2 }}>
              {stats.memoryUsedMb} MB / {stats.maxMemoryMb} MB
            </div>
            <Progress percent={Math.round((stats.memoryUsedMb / stats.maxMemoryMb) * 100)} size="small" strokeColor="#06b6d4" />
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>活跃缓存条目</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
              {stats.entriesCount.toLocaleString()} 项
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>
              命中 {stats.totalHits.toLocaleString()} / 未命中 {stats.totalMisses.toLocaleString()}
            </Text>
          </div>
        </Col>
      </Row>
    </div>
  );
}

export default CachePage;
