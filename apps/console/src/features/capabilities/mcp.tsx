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
import { mcpApi, type McpServerItem } from "@/entities/api";
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

export function McpPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();

  const mcpQuery = useQuery({
    queryKey: ["mcp-servers-list"],
    queryFn: () => mcpApi.list(),
  });

  if (mcpQuery.isLoading) {
    return <PageSkeleton />;
  }

  const servers = mcpQuery.data ?? [];

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
                background: "rgba(99, 102, 241, 0.12)",
                color: "#6366f1",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="hub" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("MCP 服务与工具集管理", "MCP Server & Tools Management")}
                </Title>
                <Tag color="purple">{tt("协议中枢", "Protocol Hub")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "注册并管理本地 STDIO / 远程 SSE 架构的 MCP 服务，对外统一暴露结构化工具、提示词与资源。",
                  "Register and manage STDIO/SSE MCP servers, exposing unified structured tools, prompts, and resources."
                )}
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. MCP Servers Table */}
      <Card title={tt("已挂载 MCP 服务实例", "Mounted MCP Server Instances")} className={styles.sectionCard} size="small">
        <Table<McpServerItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={servers}
          columns={[
            {
              title: tt("服务名称与启动命令", "Server Name & Command"),
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="blue">{String(record.transport || "unknown").toUpperCase()}</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>{record.commandOrUrl}</code>
                </div>
              ),
            },
            {
              title: tt("已声明工具", "Declared Tools"),
              key: "tools",
              render: (_, record) => (
                <Flex gap={4} wrap>
                  {(record.tools || []).map((t) => (
                    <Tag key={t.name} color="cyan" style={{ margin: 0, fontSize: 10 }}>
                      {t.name}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: tt("声明容量", "Declared Capacities"),
              key: "counts",
              render: (_, record) => (
                <Text style={{ fontSize: 12 }}>
                  {record.toolsCount} {tt("工具", "Tools")} / {record.promptsCount} {tt("提示词", "Prompts")} / {record.resourcesCount} {tt("资源", "Resources")}
                </Text>
              ),
            },
            {
              title: tt("通信延迟", "Ping Latency"),
              dataIndex: "pingMs",
              key: "pingMs",
              render: (ms) => <Text style={{ fontSize: 12 }}>{ms}ms</Text>,
            },
            {
              title: tt("服务状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: (st) => <Tag color={st === "connected" ? "success" : "default"}>{String(st || "unknown").toUpperCase()}</Tag>,
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default McpPage;
