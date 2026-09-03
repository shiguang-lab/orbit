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
                  MCP 服务与工具集管理
                </Title>
                <Tag color="purple">协议中枢</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                注册并管理本地 STDIO / 远程 SSE 架构的 MCP 服务，对外统一暴露结构化工具 (Tools)、提示词 (Prompts) 与资源 (Resources)。
              </Text>
            </div>
          </Flex>
        </Flex>
      </Card>

      {/* 2. MCP Servers Table */}
      <Card title="已挂载 MCP 服务实例" className={styles.sectionCard} size="small">
        <Table<McpServerItem>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={servers}
          columns={[
            {
              title: "服务名称与启动命令",
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="blue">{String(record.transport || "stdio").toUpperCase()}</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>{record.commandOrUrl}</code>
                </div>
              ),
            },
            {
              title: "已声明工具 (Tools)",
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
              title: "声明容量 (T/P/R)",
              key: "counts",
              render: (_, record) => (
                <Text style={{ fontSize: 12 }}>
                  {record.toolsCount} 工具 / {record.promptsCount} 提示词 / {record.resourcesCount} 资源
                </Text>
              ),
            },
            {
              title: "通信延迟",
              dataIndex: "pingMs",
              key: "ping",
              render: (ms) => <Tag color="green">{ms}ms</Tag>,
            },
            {
              title: "连接状态",
              dataIndex: "status",
              key: "status",
              render: (st) => (
                <Tag color={st === "connected" ? "success" : "error"}>
                  {String(st || "connected").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default McpPage;
