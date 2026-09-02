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
import { auditRecordsApi, type AuditRecordItem } from "@/entities/api";
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
}));

export function AuditPage({ auditType = "all" }: { auditType?: "all" | "mcp" | "a2a" }) {
  const { styles } = useStyles();

  const auditQuery = useQuery({
    queryKey: ["audit-records-list", auditType],
    queryFn: () => auditRecordsApi.list(auditType),
  });

  if (auditQuery.isLoading) {
    return <PageSkeleton />;
  }

  const records = auditQuery.data ?? [];

  const titleText =
    auditType === "mcp" ? "MCP 工具调用安全审计" : auditType === "a2a" ? "A2A 智能体交互审计" : "全链路安全审计日志";

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
              <MaterialIcon name="policy" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {titleText}
                </Title>
                <Tag color="cyan">审计留痕与追溯</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                记录每一次配置变更、敏感工具调用 (MCP)、智能体互联通信 (A2A) 与鉴权拦截详情。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Audit Table */}
      <Card title="最新审计审计流记录" className={styles.sectionCard} size="small">
        <Table<AuditRecordItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={records}
          columns={[
            {
              title: "时间",
              dataIndex: "timestamp",
              key: "timestamp",
              width: 100,
              render: (t) => <Text style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: "操作主体 (Actor)",
              dataIndex: "actor",
              key: "actor",
              render: (act) => <Tag color="blue">{act}</Tag>,
            },
            {
              title: "动作与资源 (Action & Resource)",
              key: "action",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Tag color="purple">{record.action}</Tag>
                    <code style={{ fontSize: 11 }}>{record.resource}</code>
                  </Flex>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 2 }}>
                    {record.detail}
                  </div>
                </div>
              ),
            },
            {
              title: "客户端 IP",
              dataIndex: "clientIp",
              key: "ip",
              render: (ip) => <code style={{ fontSize: 11 }}>{ip}</code>,
            },
            {
              title: "判定结果",
              dataIndex: "status",
              key: "status",
              render: (st) => (
                <Tag color={st === "allowed" ? "success" : st === "flagged" ? "warning" : "error"}>
                  {String(st || "allowed").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default AuditPage;
