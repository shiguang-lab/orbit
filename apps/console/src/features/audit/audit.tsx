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

export function AuditPage({ auditType = "all" }: { auditType?: "all" | "mcp" | "a2a" }) {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const auditQuery = useQuery({
    queryKey: ["audit-records-list", auditType],
    queryFn: () => auditRecordsApi.list(auditType),
  });

  if (auditQuery.isLoading) {
    return <PageSkeleton />;
  }

  const records = auditQuery.data ?? [];

  const titleText =
    auditType === "mcp"
      ? tt("MCP 工具调用安全审计", "MCP Tool Invocation Security Audit")
      : auditType === "a2a"
      ? tt("A2A 智能体交互审计", "A2A Agent Interaction Audit")
      : tt("全链路安全审计日志", "Full-Chain Security Audit Logs");

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
                <Tag color="cyan">{tt("审计留痕与追溯", "Audit Trail & Provenance")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "记录每一次配置变更、敏感工具调用 (MCP)、智能体互联通信 (A2A) 与鉴权拦截详情。",
                  "Record configuration updates, sensitive MCP tool calls, A2A inter-agent communications, and authorization blocks."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Audit Table */}
      <Card title={tt("最新审计流记录", "Latest Audit Records")} className={styles.sectionCard} size="small">
        <Table<AuditRecordItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={records}
          columns={[
            {
              title: tt("时间", "Timestamp"),
              dataIndex: "timestamp",
              key: "timestamp",
              width: 100,
              render: (t) => <Text style={{ fontSize: 12 }}>{t}</Text>,
            },
            {
              title: tt("操作主体", "Actor"),
              dataIndex: "actor",
              key: "actor",
              render: (act) => <Tag color="blue">{act}</Tag>,
            },
            {
              title: tt("动作与资源", "Action & Resource"),
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
              title: tt("客户端 IP", "Client IP"),
              dataIndex: "clientIp",
              key: "ip",
              render: (ip) => <code style={{ fontSize: 11 }}>{ip}</code>,
            },
            {
              title: tt("判定结果", "Verdict"),
              dataIndex: "status",
              key: "status",
              render: (st) => (
                <Tag color={st === "allowed" ? "success" : st === "flagged" ? "warning" : "error"}>
                  {String(st || "unknown").toUpperCase()}
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
