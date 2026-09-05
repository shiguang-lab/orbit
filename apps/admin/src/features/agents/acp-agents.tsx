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
import { acpAgentsApi, type AcpAgentItem } from "@/entities/api";
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

export function AcpAgentsPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const acpQuery = useQuery({
    queryKey: ["acp-agents-list"],
    queryFn: () => acpAgentsApi.list(),
  });

  if (acpQuery.isLoading) {
    return <PageSkeleton />;
  }

  const agents = acpQuery.data ?? [];

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
                background: "rgba(167, 139, 250, 0.12)",
                color: "#a78bfa",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="device_hub" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("ACP 智能体协议管理", "ACP Agent Protocol Management")}
                </Title>
                <Tag color="purple">{tt("标准协议规范", "Standard Protocol")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "管理对接 Zed、VSCode Cline 等符合 ACP 标准协议的智能体客户端与守护进程，实现跨 IDE 协同。",
                  "Manage ACP-compliant agent clients and daemons (Zed, VSCode Cline) for cross-IDE orchestration."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. Table */}
      <Card title={tt("已连接 ACP 智能体守护进程", "Connected ACP Agent Daemons")} className={styles.sectionCard} size="small">
        <Table<AcpAgentItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={agents}
          columns={[
            {
              title: tt("智能体名称与端点", "Agent Name & Endpoint"),
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="blue">v{record.version}</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    {record.endpoint}
                  </code>
                </div>
              ),
            },
            {
              title: tt("已声明能力清单", "Declared Capabilities"),
              dataIndex: "capabilities",
              key: "capabilities",
              render: (caps: string[]) => (
                <Flex gap={4} wrap>
                  {(caps || []).map((c) => (
                    <Tag key={c} color="blue" style={{ margin: 0, fontSize: 10 }}>
                      {c}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: tt("活跃会话数", "Active Sessions"),
              dataIndex: "activeSessions",
              key: "activeSessions",
              render: (sessions) => <Tag color="geekblue">{sessions} {tt("个会话", "sessions")}</Tag>,
            },
            {
              title: tt("连接状态", "Connection Status"),
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "online" ? "success" : "default"}>
                  {String(status || "offline").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default AcpAgentsPage;
