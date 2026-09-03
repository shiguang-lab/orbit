import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Input,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";

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

export function SearchToolsPage() {
  const { styles } = useStyles();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; title: string; score: number; content: string }>>([]);

  const handleSearch = () => {
    if (!query.trim()) return;
    setResults([
      {
        id: "chunk-01",
        title: "src/shared/router/jwt-interceptor.ts:L45-80",
        score: 0.94,
        content: "export async function handleJwtAuthentication(req: Request) { ... // Bearer token validation and rate-limit claims extraction }",
      },
      {
        id: "chunk-02",
        title: "docs/architecture/context-compression.md:L12-40",
        score: 0.88,
        content: "# Context Compression Pipeline\nOrbit applies CCR, RTK, and Caveman in cascading waterfall stages before upstream dispatch.",
      },

    ]);
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
                background: "rgba(14, 165, 233, 0.12)",
                color: "#0ea5e9",
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
                  代码与文档向量搜索工具
                </Title>
                <Tag color="cyan">向量与语义分块探针</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                调试知识库分块检索（Embedding & Reranker），测试 Top-K 召回精度与余弦相似度分数。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Query Search Bar */}
      <Card className={styles.sectionCard} size="small">
        <Flex gap={10}>
          <Input
            placeholder="输入自然语言语义查询，例如：'JWT 鉴权拦截器实现'..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" icon={<MaterialIcon name="search" size={16} />} onClick={handleSearch}>
            检索知识分块
          </Button>
        </Flex>
      </Card>

      {/* 3. Results Table */}
      {results.length > 0 && (
        <Card title={`召回命中分块 (${results.length} 项)`} className={styles.sectionCard} size="small">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={results}
            columns={[
              {
                title: "分块源文件与位置",
                dataIndex: "title",
                key: "title",
                render: (title) => <Text strong style={{ color: "#38bdf8" }}>{title}</Text>,
              },
              {
                title: "相似度得分 (Cosine)",
                dataIndex: "score",
                key: "score",
                render: (s) => <Tag color="green">{s}</Tag>,
              },
              {
                title: "分块文本内容",
                dataIndex: "content",
                key: "content",
                render: (c) => <pre style={{ margin: 0, fontSize: 11, background: "rgba(0,0,0,0.2)", padding: "4px 8px", borderRadius: 4 }}>{c}</pre>,
              },
            ]}
          />
        </Card>
      )}
    </div>
  );
}

export default SearchToolsPage;
