import { useState } from "react";
import {
  Button,
  Card,
  Flex,
  Input,
  Radio,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { pricingApi, type PricingModelEntry } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
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

export function PricingPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();
  const [search, setSearch] = useState("");
  const [providerFilter, setProviderFilter] = useState("all");

  const pricingQuery = useQuery({
    queryKey: ["pricing-catalog"],
    queryFn: () => pricingApi.list(),
  });

  const syncMutation = useMutation({
    mutationFn: () => pricingApi.sync(),
    onSuccess: (res) => {
      messageApi.success(tt(`已从 upstream 全网同步 ${res.syncedModels} 款模型定价规则！`, `Synced pricing rules for ${res.syncedModels} models!`));
      void queryClient.invalidateQueries({ queryKey: ["pricing-catalog"] });
    },
    onError: () => messageApi.error(tt("同步定价失败", "Failed to sync pricing")),
  });

  if (pricingQuery.isLoading) {
    return <PageSkeleton />;
  }

  const catalog = pricingQuery.data;
  const models = (catalog?.models || []).filter((m) => {
    const matchSearch =
      m.name.toLowerCase().includes(search.toLowerCase()) ||
      m.id.toLowerCase().includes(search.toLowerCase()) ||
      m.provider.toLowerCase().includes(search.toLowerCase());
    const matchProvider = providerFilter === "all" || m.provider.toLowerCase() === providerFilter.toLowerCase();
    return matchSearch && matchProvider;
  });

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
                background: "rgba(16, 185, 129, 0.12)",
                color: "#10b981",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="price_change" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("模型计费与价格规则库", "Model Pricing & Rate Standards")}
                </Title>
                <Tag color="green">{catalog?.lastSync}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "实时同步 LiteLLM、models.dev 与官方标准价格，精准度量 Prompt、Completion、缓存与推理链 Token 计费。",
                  "Sync standard rates from LiteLLM and models.dev to accurately measure prompt, completion, and cache token spending."
                )}
              </Text>
            </div>
          </Flex>

          <Button
            type="primary"
            icon={<MaterialIcon name="sync" size={16} />}
            loading={syncMutation.isPending}
            onClick={() => syncMutation.mutate()}
          >
            {tt("从全网同步最新定价", "Sync Latest Pricing")}
          </Button>
        </Flex>
      </Card>

      {/* 2. Filters */}
      <Flex gap={10} align="center" wrap>
        <Input
          prefix={<MaterialIcon name="search" size={16} style={{ color: "var(--ant-color-text-secondary)" }} />}
          placeholder={tt("搜索模型名称或提供商...", "Search model name or provider...")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ width: 280 }}
          allowClear
        />

        <Radio.Group value={providerFilter} onChange={(e) => setProviderFilter(e.target.value)}>
          <Radio.Button value="all">{tt("全部提供商", "All Providers")}</Radio.Button>
          <Radio.Button value="anthropic">Anthropic</Radio.Button>
          <Radio.Button value="openai">OpenAI</Radio.Button>
          <Radio.Button value="deepseek">DeepSeek</Radio.Button>
          <Radio.Button value="google">Google</Radio.Button>
        </Radio.Group>
      </Flex>

      {/* 3. Table */}
      <Card title={`${tt("已维护定价标准", "Maintained Pricing Standards")} (${models.length} ${tt("款模型", "models")})`} className={styles.sectionCard} size="small">
        <Table<PricingModelEntry>
          rowKey="id"
          size="small"
          pagination={{ pageSize: 10 }}
          dataSource={models}
          columns={[
            {
              title: tt("模型与提供商", "Model & Provider"),
              key: "name",
              render: (_, record) => (
                <div>
                  <Flex align="center" gap={6}>
                    <Text strong>{record.name}</Text>
                    <Tag color="blue">{record.provider}</Tag>
                  </Flex>
                  <code style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>{record.id}</code>
                </div>
              ),
            },
            {
              title: tt("Prompt 输入计费 (每 1M Tokens)", "Prompt Input / 1M Tokens"),
              dataIndex: "inputCostPerM",
              key: "input",
              render: (cost) => <Text style={{ color: "#38bdf8", fontWeight: 600 }}>${cost.toFixed(3)}</Text>,
            },
            {
              title: tt("Completion 补全计费 (每 1M Tokens)", "Completion Output / 1M Tokens"),
              dataIndex: "outputCostPerM",
              key: "output",
              render: (cost) => <Text style={{ color: "#10b981", fontWeight: 600 }}>${cost.toFixed(3)}</Text>,
            },
            {
              title: tt("缓存命中折扣价", "Cache Hit Price"),
              dataIndex: "cachedCostPerM",
              key: "cached",
              render: (cost) => <Tag color="cyan">${cost.toFixed(3)} / 1M</Tag>,
            },
            {
              title: tt("数据来源", "Source"),
              dataIndex: "source",
              key: "source",
              render: (src) => (
                <Tag color={src === "litellm" ? "green" : src === "modelsDev" ? "blue" : "purple"}>
                  {String(src || "default").toUpperCase()}
                </Tag>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default PricingPage;
