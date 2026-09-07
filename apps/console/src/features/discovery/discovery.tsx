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
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { discoveryApi, providersApi, type DiscoveredEndpoint } from "@/entities/api";
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

export function DiscoveryPage() {
  const { styles } = useStyles();
  const { tt } = useI18n();
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();

  const scanQuery = useQuery({
    queryKey: ["discovery-results"],
    queryFn: () => discoveryApi.results(),
  });

  const importMutation = useMutation({
    mutationFn: (record: DiscoveredEndpoint) => providersApi.create({
      provider: "openai-compatible-chat",
      name: `${record.service} (${record.host}:${record.port})`,
      providerSpecificData: { baseUrl: `http://${record.host}:${record.port}/v1` },
      models: record.discoveredModels,
      isActive: false,
    }),
    onSuccess: () => {
      messageApi.success(tt("Provider 已创建，请在 Providers 页面完成凭据和启用配置", "Provider created; configure credentials and enable it in Providers"));
      void queryClient.invalidateQueries({ queryKey: ["providers"] });
    },
    onError: (cause) => messageApi.error(`${tt("导入失败", "Import failed")}：${cause instanceof Error ? cause.message : String(cause)}`),
  });

  if (scanQuery.isLoading) {
    return <PageSkeleton />;
  }

  const endpoints = scanQuery.data ?? [];

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
                  {tt("本地与局域网服务发现", "Local & LAN Service Discovery")}
                </Title>
                <Tag color="cyan">{tt("自动探测与导入", "Auto-Discovery & Import")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "自动扫描本地及局域网内运行的 Ollama、vLLM、LMStudio、LocalAI 端点与挂载模型，支持一键导入为上游提供者。",
                  "Scan and auto-detect local and LAN-hosted Ollama, vLLM, LMStudio, and LocalAI endpoints with one-click import."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="search" size={16} />}
            loading={scanQuery.isFetching}
            onClick={() => void scanQuery.refetch()}
          >
            {tt("刷新发现结果", "Refresh Discovery Results")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Discovered Table */}
      <Card title={tt("已发现的本地/局域网 LLM 推理端点", "Discovered Local & LAN Endpoints")} className={styles.sectionCard} size="small">
        <Table<DiscoveredEndpoint>
          rowKey="id"
          size="small"
          pagination={false}
          dataSource={endpoints}
          columns={[
            {
              title: tt("服务类型与地址", "Service Type & Address"),
              key: "service",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.service}</Text>
                    <Tag color="blue">{record.latencyMs}ms {tt("延迟", "latency")}</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>
                    http://{record.host}:{record.port}
                  </code>
                </div>
              ),
            },
            {
              title: tt("已探明就绪模型", "Discovered Models"),
              dataIndex: "discoveredModels",
              key: "models",
              render: (models: string[]) => (
                <Flex gap={4} wrap>
                  {(models || []).map((m) => (
                    <Tag key={m} color="purple" style={{ margin: 0, fontSize: 11 }}>
                      {m}
                    </Tag>
                  ))}
                </Flex>
              ),
            },
            {
              title: tt("状态", "Status"),
              dataIndex: "status",
              key: "status",
              render: (status) => (
                <Tag color={status === "reachable" ? "success" : "default"}>
                  {String(status || "unknown").toUpperCase()}
                </Tag>
              ),
            },
            {
              title: tt("操作", "Actions"),
              key: "actions",
              width: 140,
              render: (_, record) => (
                <Button
                  size="small"
                  type="primary"
                  ghost
                  icon={<MaterialIcon name="download" size={14} />}
                  loading={importMutation.isPending}
                  onClick={() => importMutation.mutate(record)}
                >
                  {tt("一键导入", "Import Provider")}
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
