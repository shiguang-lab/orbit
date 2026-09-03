import {
  Card,
  Flex,
  Progress,
  Table,
  Tag,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { budgetApi, type BudgetRuleItem } from "@/entities/api";
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

export function BudgetPage() {
  const { styles } = useStyles();

  const budgetQuery = useQuery({
    queryKey: ["budget-rules-list"],
    queryFn: () => budgetApi.list(),
  });

  if (budgetQuery.isLoading) {
    return <PageSkeleton />;
  }

  const budgets = budgetQuery.data ?? [];

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
                background: "rgba(234, 179, 8, 0.12)",
                color: "#eab308",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="savings" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  预算管理与防击穿熔断
                </Title>
                <Tag color="gold">成本硬顶与自动拦截</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                按日、周、月设置提供商/团队预算红线，超额自动触发预警、动态限流或即时熔断阻断。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Budget Table */}
      <Card title="已生效预算监控规则" className={styles.sectionCard} size="small">
        <Table<BudgetRuleItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={budgets}
          columns={[
            {
              title: "规则名称与目标对象",
              key: "name",
              render: (_, record) => (
                <div>
                  <Text strong>{record.name}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    周期: {record.period.toUpperCase()} · 约束目标: {record.targetProvider || record.targetUser || "全局"}
                  </div>
                </div>
              ),
            },
            {
              title: "预算消耗水位",
              key: "progress",
              width: 260,
              render: (_, record) => {
                const pct = Math.round((record.currentUsd / record.limitUsd) * 100);
                return (
                  <div>
                    <Flex justify="space-between" style={{ fontSize: 11, marginBottom: 2 }}>
                      <span>已消耗 ${record.currentUsd.toFixed(2)}</span>
                      <span>上限 ${record.limitUsd.toFixed(2)} ({pct}%)</span>
                    </Flex>
                    <Progress
                      percent={pct}
                      size="small"
                      status={pct >= 90 ? "exception" : pct >= 75 ? "normal" : "success"}
                      strokeColor={pct >= 90 ? "#ef4444" : pct >= 75 ? "#f59e0b" : "#10b981"}
                    />
                  </div>
                );
              },
            },
            {
              title: "超额执行策略",
              dataIndex: "actionOnExceed",
              key: "action",
              render: (act) => (
                <Tag color={act === "block" ? "red" : act === "throttle" ? "orange" : "blue"}>
                  {act === "block" ? "立即拦截请求" : act === "throttle" ? "动态降级限流" : "仅发送告警通知"}
                </Tag>
              ),
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

export default BudgetPage;
