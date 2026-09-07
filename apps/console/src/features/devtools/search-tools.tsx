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
import { providersApi } from "@/entities/api";
import { useI18n } from "@/i18n";

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
  const { tt } = useI18n();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Array<{ id: string; title: string; score: number; content: string }>>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const raw = await providersApi.webSearch({ query: query.trim() });
      const payload = raw as { results?: unknown[]; data?: unknown[]; items?: unknown[] };
      const source = payload.results ?? payload.data ?? payload.items ?? [];
      const mapped = source.flatMap((item, index) => {
        if (!item || typeof item !== "object") return [];
        const row = item as Record<string, unknown>;
        const title = String(row.title ?? row.name ?? row.url ?? `result-${index + 1}`);
        const content = String(row.content ?? row.snippet ?? row.description ?? "");
        const score = Number(row.score ?? row.similarity ?? 0);
        return [{ id: String(row.id ?? row.url ?? index), title, content, score: Number.isFinite(score) ? score : 0 }];
      });
      setResults(mapped);
    } catch (cause) {
      setResults([]);
      setError(cause instanceof Error ? cause.message : String(cause));
    } finally {
      setLoading(false);
    }
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
                  {tt("代码与文档向量搜索工具", "Code & Documentation Vector Search")}
                </Title>
                <Tag color="cyan">{tt("向量与语义分块探针", "Vector & Chunk Probe")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "调试知识库分块检索（Embedding & Reranker），测试 Top-K 召回精度与余弦相似度分数。",
                  "Debug knowledge chunk retrieval (Embedding & Reranker), evaluating Top-K recall precision and similarity scores."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Query Search Bar */}
      <Card className={styles.sectionCard} size="small">
        <Flex gap={10}>
          <Input
            placeholder={tt("输入自然语言语义查询，例如：'JWT 鉴权拦截器实现'...", "Enter natural language query, e.g. 'JWT auth interceptor implementation'...")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onPressEnter={handleSearch}
          />
          <Button type="primary" loading={loading} icon={<MaterialIcon name="search" size={16} />} onClick={handleSearch}>
            {tt("检索知识分块", "Search Chunks")}
          </Button>
        </Flex>
      </Card>

      {error && <Text type="danger">{tt("检索失败", "Search failed")}：{error}</Text>}
      {!loading && !error && query.trim() && results.length === 0 && <Text type="secondary">{tt("暂无检索结果", "No search results")}</Text>}

      {/* 3. Results Table */}
      {results.length > 0 && (
        <Card title={tt(`召回命中分块 (${results.length} 项)`, `Retrieved Chunks (${results.length})`)} className={styles.sectionCard} size="small">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={results}
            columns={[
              {
                title: tt("分块源文件与位置", "Source File & Location"),
                dataIndex: "title",
                key: "title",
                render: (title) => <Text strong style={{ color: "#38bdf8" }}>{title}</Text>,
              },
              {
                title: tt("相似度得分", "Cosine Similarity"),
                dataIndex: "score",
                key: "score",
                render: (s) => <Tag color="green">{s}</Tag>,
              },
              {
                title: tt("分块文本内容", "Chunk Content"),
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
