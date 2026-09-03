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
import { apiEndpointsApi, type ApiEndpointItem } from "@/entities/api";
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

export function ApiEndpointsPage() {
  const { styles } = useStyles();

  const epQuery = useQuery({
    queryKey: ["api-endpoints-list"],
    queryFn: () => apiEndpointsApi.list(),
  });

  if (epQuery.isLoading) {
    return <PageSkeleton />;
  }

  const endpoints = epQuery.data ?? [];

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
              <MaterialIcon name="api" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  API 开放端点配置
                </Title>
                <Tag color="teal">网关对外服务路由</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                配置网关对外暴露的 OpenAI / Anthropic 标准协议端点路由映射、限流速率与鉴权控制。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Endpoints Table */}
      <Card title="已注册 API 端点路由" className={styles.sectionCard} size="small">
        <Table<ApiEndpointItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={endpoints}
          columns={[
            {
              title: "对外路由路径",
              dataIndex: "path",
              key: "path",
              render: (path) => <code style={{ fontSize: 13, color: "#38bdf8" }}>{path}</code>,
            },
            {
              title: "协议规范",
              dataIndex: "protocol",
              key: "protocol",
              render: (proto) => <Tag color="blue">{proto}</Tag>,
            },
            {
              title: "目标上游转发池",
              dataIndex: "targetProvider",
              key: "targetProvider",
              render: (tp) => <Text strong>{tp}</Text>,
            },
            {
              title: "限流速率 (Rate Limit)",
              dataIndex: "rateLimitPerMin",
              key: "rateLimit",
              render: (rate) => <Tag color="orange">{rate} req/min</Tag>,
            },
            {
              title: "鉴权要求",
              dataIndex: "authRequired",
              key: "auth",
              render: (auth) => (auth ? <Tag color="red">强制 Bearer Key</Tag> : <Tag color="green">公开访问</Tag>),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (st) => <Tag color={st === "active" ? "success" : "default"}>{String(st || "active").toUpperCase()}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default ApiEndpointsPage;
