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
import { resilienceApi, type ResilienceConnectionItem } from "@/entities/api";
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

export function ResilienceConnectionsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const resQuery = useQuery({
    queryKey: ["resilience-connections-list"],
    queryFn: () => resilienceApi.list(),
  });

  if (resQuery.isLoading) {
    return <PageSkeleton />;
  }

  const connections = resQuery.data ?? [];

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
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="shield" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("弹性连接与熔断降级链", "Resilience Connections & Fallback Chains")}
                </Title>
                <Tag color="green">{tt("智能断路器与重试预算", "Circuit Breakers & Retry Budgets")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "管理各上游连接池断路器状态、失败阈值计数与多级容灾链路。",
                  "Manage upstream circuit breaker states, failure thresholds and multi-tier fallback chains."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Resilience Table */}
      <Card title={tt("上游服务断路器与故障转移状态", "Upstream Circuit Breakers & Failover Status")} className={styles.sectionCard} size="small">
        <Table<ResilienceConnectionItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={connections}
          columns={[
            {
              title: tt("上游提供商与连接池", "Upstream Provider & Connection Pool"),
              dataIndex: "provider",
              key: "provider",
              render: (p) => <Text strong>{p}</Text>,
            },
            {
              title: tt("断路器状态", "Circuit State"),
              dataIndex: "circuitState",
              key: "state",
              render: (state) => (
                <Tag color={state === "closed" ? "success" : state === "half-open" ? "warning" : "error"}>
                  {state === "closed"
                    ? tt("● 正常闭合", "● Closed")
                    : state === "half-open"
                    ? tt("▲ 半开试探", "▲ Half-Open")
                    : tt("✖ 熔断开启", "✖ Open")}
                </Tag>
              ),
            },
            {
              title: tt("连续失败计数 / 上限", "Failure Count / Max"),
              key: "failures",
              render: (_, record) => (
                <Tag color={record.consecutiveFailures > 0 ? "orange" : "default"}>
                  {record.consecutiveFailures} / {record.maxFailuresAllowed} {tt("次", "times")}
                </Tag>
              ),
            },
            {
              title: tt("重试预算配额", "Retry Budget"),
              dataIndex: "retryBudgetTokens",
              key: "retryBudget",
              render: (tokens) => <Tag color="blue">{tokens} Tokens</Tag>,
            },
            {
              title: tt("容灾回退链路", "Fallback Chain"),
              dataIndex: "fallbackChain",
              key: "fallback",
              render: (chain: string[]) => (
                <Flex gap={4} wrap>
                  {(chain || []).map((fb, idx) => (
                    <Tag key={fb} color="purple" style={{ margin: 0, fontSize: 11 }}>
                      {idx + 1}. {fb}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default ResilienceConnectionsPage;
