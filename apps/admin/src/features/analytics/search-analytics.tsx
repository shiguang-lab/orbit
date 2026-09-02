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
import { searchAnalyticsApi } from "@/entities/api";
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

export function SearchAnalyticsPage() {
  const { styles } = useStyles();

  const searchQuery = useQuery({
    queryKey: ["search-analytics-data"],
    queryFn: () => searchAnalyticsApi.getData(),
  });

  if (searchQuery.isLoading || !searchQuery.data) {
    return <PageSkeleton />;
  }

  const data = searchQuery.data;

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
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  语义搜索与向量召回分析
                </Title>
                <Tag color="cyan">向量与搜索分析</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                分析语义向量检索（Vector Search）与 BM25 关键词检索的查询延迟、高频搜索词热度与知识库匹配度。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Stat Cards */}
      <Row gutter={[10, 10]}>
        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>检索请求总量</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#38bdf8", marginTop: 2 }}>
              {data.totalQueries.toLocaleString()}
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>知识检索平均延迟 {data.avgLatencyMs}ms</Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>混合召回准确率</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#10b981", marginTop: 2 }}>
              {data.hybridHitRate}%
            </div>
            <Progress percent={data.hybridHitRate} size="small" strokeColor="#10b981" />
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>代码库向量索引量</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#6366f1", marginTop: 2 }}>
              48.2k Vectors
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>分块覆盖 100% 仓库文件</Text>
          </div>
        </Col>

        <Col xs={24} sm={12} md={6}>
          <div className={styles.statBox}>
            <Text type="secondary" style={{ fontSize: 12 }}>API 文档索引量</Text>
            <div style={{ fontSize: 20, fontWeight: 700, color: "#f59e0b", marginTop: 2 }}>
              18.6k Vectors
            </div>
            <Text type="secondary" style={{ fontSize: 11 }}>6,050 次辅助生成引用</Text>
          </div>
        </Col>
      </Row>

      {/* 3. Top Keywords Table */}
      <Card title="高频检索词与相关性评分" className={styles.sectionCard} size="small">
        <Table
          rowKey="term"
          size="small"
          pagination={false}
          dataSource={data.topSearchTerms}
          columns={[
            {
              title: "检索词 (Search Term)",
              dataIndex: "term",
              key: "term",
              render: (term) => <Text strong>{term}</Text>,
            },
            {
              title: "查询频次",
              dataIndex: "count",
              key: "count",
              render: (c) => <Tag color="blue">{c} 次</Tag>,
            },
            {
              title: "相关度得分 (Cosine Similarity)",
              dataIndex: "avgScore",
              key: "score",
              render: (score) => (
                <Flex align="center" gap={8}>
                  <Progress percent={Math.round(score * 100)} size="small" style={{ width: 80, margin: 0 }} />
                  <Text style={{ fontSize: 11 }}>{score}</Text>
                </Flex>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default SearchAnalyticsPage;
