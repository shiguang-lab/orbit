import {
  Button,
  Card,
  Flex,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { discoveryApi, type DiscoveredEndpoint } from "@/entities/api";
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

export function DiscoveryPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();

  const scanQuery = useQuery({
    queryKey: ["discovery-scan-endpoints"],
    queryFn: () => discoveryApi.scan(),
  });

  if (scanQuery.isLoading) {
    return <PageSkeleton />;
  }

  const endpoints = scanQuery.data ?? [];

  const handleImport = (record: DiscoveredEndpoint) => {
    messageApi.success(`已将 ${record.service} (${record.discoveredModels.length} 个模型) 导入为网关上游提供者！`);
  };

  return (
    <div className={styles.page}>
      {contextHolder}

      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "rgba(6, 182, 212, 0.12)",
                color: "#06b6d4",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="travel_explore" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  服务发现 (Local & LAN Service Discovery)
                </Title>
                <Tag color="cyan">局域网与本地自动探测</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                自动扫描本地及局域网内运行的 Ollama、vLLM、LMStudio、LocalAI 端点与挂载模型，支持一键导入为上游提供者。
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="search" size={16} />}
            loading={scanQuery.isFetching}
            onClick={() => void scanQuery.refetch()}
          >
            重新扫描局域网
          </Button>
        </Flex>
      </Card>

      {/* 2. Discovered Table */}
      <Card title="已发现的本地/局域网 LLM 推理端点" className={styles.sectionCard} size="small">
        <Table<DiscoveredEndpoint>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={endpoints}
          columns={[
            {
              title: "服务类型与地址",
              key: "service",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.service}</Text>
                    <Tag color="blue">{record.latencyMs}ms 延迟</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    http://{record.host}:{record.port}
                  </code>
                </div>
              ),
            },
            {
              title: "已探明就绪模型",
              dataIndex: "discoveredModels",
              key: "models",
              render: (models: string[]) => (
                <Flex gap={4} wrap>
                  {models.map((m) => (
                    <Tag key={m} color="purple" style={{ margin: 0, fontSize: 11 }}>
                      {m}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: "状态",
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "reachable" ? "success" : "default"}>
                  {status.toUpperCase()}
                </Tag>
              ),
            },
            {
              title: "操作",
              key: "actions",
              width: 140,
              render: (_, record) => (
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<MaterialIcon name="download" size={14} />}
                  onClick={() => handleImport(record)}
                >
                  一键导入提供者
                </Button>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default DiscoveryPage;
