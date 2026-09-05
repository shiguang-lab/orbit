import {
  Card,
  Alert,
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

export function ApiEndpointsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const epQuery = useQuery({
    queryKey: ["api-endpoints-list"],
    queryFn: () => apiEndpointsApi.list(),
  });

  if (epQuery.isLoading) {
    return <PageSkeleton />;
  }

  if (epQuery.isError) {
    return <Alert type="error" showIcon message={tt("无法读取实时端点契约", "Unable to load the live endpoint contract")} description={epQuery.error instanceof Error ? epQuery.error.message : String(epQuery.error)} />;
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
                  {tt("API 开放端点配置", "API Endpoints Configuration")}
                </Title>
                <Tag color="teal">{tt("网关对外服务路由", "Gateway Inbound Routes")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置网关对外暴露的 OpenAI / Anthropic 标准协议端点路由映射、限流速率与鉴权控制。",
                  "Configure gateway-exposed OpenAI / Anthropic standard endpoint mappings, rate limits, and authentication policies."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Endpoints Table */}
      <Card title={tt("已注册 API 端点路由", "Registered API Endpoint Routes")} className={styles.sectionCard}>
        <Table<ApiEndpointItem>
          rowKey="id"
          pagination={false}
          dataSource={endpoints}
          columns={[
            {
              title: tt("对外路由路径", "Route Path"),
              dataIndex: "path",
              key: "path",
              render: (path) => <code style={{ fontSize: 13, color: "#38bdf8" }}>{path}</code>,
            },
            {
              title: tt("协议规范", "Protocol"),
              dataIndex: "protocol",
              key: "protocol",
              render: (proto) => <Tag color="blue">{proto}</Tag>,
            },
            {
              title: tt("目标上游转发池", "Target Upstream Pool"),
              dataIndex: "targetProvider",
              key: "targetProvider",
              render: (tp) => <Text strong>{tp ?? tt("未分类", "Unclassified")}</Text>,
            },
            {
              title: tt("限流速率", "Rate Limit"),
              dataIndex: "rateLimitPerMin",
              key: "rateLimit",
              render: (rate) => <Tag color={rate == null ? "default" : "orange"}>{rate == null ? tt("未配置", "Not configured") : `${rate} req/min`}</Tag>,
            },
            {
              title: tt("鉴权要求", "Auth Requirement"),
              dataIndex: "authRequired",
              key: "auth",
              render: (auth) => (auth ? <Tag color="red">{tt("强制 Bearer Key", "Require Bearer Key")}</Tag> : <Tag color="green">{tt("公开访问", "Public")}</Tag>),
            },
            {
              title: tt("状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: (st) => <Tag color={st === "active" ? "success" : "default"}>{String(st || "unknown").toUpperCase()}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default ApiEndpointsPage;
