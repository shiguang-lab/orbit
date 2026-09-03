import {
  Card,
  Flex,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { agentBridgeApi, type AgentBridgeRoute } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

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

export function AgentBridgePage() {
  const { styles } = useStyles();

  const bridgeQuery = useQuery({
    queryKey: ["agent-bridge-routes"],
    queryFn: () => agentBridgeApi.list(),
  });

  if (bridgeQuery.isLoading) {
    return <PageSkeleton />;
  }

  const routes = bridgeQuery.data ?? [];

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
                background: "rgba(20, 184, 166, 0.12)",
                color: "#14b8a6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="link" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  智能体协议桥接中枢
                </Title>
                <Tag color="teal">跨协议双向转译</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                实时透明转换 OpenAI Chat Completions、Claude Messages、Ollama 与 STDIO 协议格式，实现无缝互通。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Routes Table */}
      <Card title="协议桥接中继路由规则" className={styles.sectionCard} size="small">
        <Table<AgentBridgeRoute>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={routes}
          columns={[
            {
              title: "源协议 (Source)",
              dataIndex: "sourceProtocol",
              key: "sourceProtocol",
              render: (proto) => <Tag color="blue">{proto}</Tag>,
            },
            {
              title: "转译映射与目标端点 (Mapping & Target)",
              key: "mapping",
              render: (_, record) => (
                <div>
                  <Text strong>{record.mapping}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    目标: {record.targetEndpoint}
                  </div>
                </div>
              ),
            },
            {
              title: "已转译请求量",
              dataIndex: "transformedRequests",
              key: "transformedRequests",
              render: (count) => <Tag color="cyan">{count.toLocaleString()} 次</Tag>,
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "active" ? "success" : "default"}>
                  {String(status || "active").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default AgentBridgePage;
