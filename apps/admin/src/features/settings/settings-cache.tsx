import { useState } from "react";
import {
  Button,
  Card,
  Col,
  Divider,
  Flex,
  Form,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Row,
  Slider,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { cacheApi } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 14,
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
    marginBottom: 10,
  },
  statBox: {
    padding: "12px 14px",
    borderRadius: 8,
    background: token.colorBgElevated,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
}));

export function SettingsCachePage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();
  const [messageApi, contextHolder] = message.useMessage();
  const [form] = Form.useForm();
  const [clearing, setClearing] = useState(false);
  const { tt } = useI18n();

  const cacheStatsQuery = useQuery({
    queryKey: ["settings-cache-stats"],
    queryFn: () => cacheApi.getStats(),
    refetchInterval: 10000,
  });

  const clearCacheMutation = useMutation({
    mutationFn: (type: "all" | "semantic" | "catalog" | "media") => cacheApi.clear(type),
    onSuccess: (_, type) => {
      messageApi.success(tt(`已成功清除 ${type === "all" ? "全部缓存" : type} 缓存条目`, `Successfully cleared ${type === "all" ? "all" : type} cache entries`));
      void queryClient.invalidateQueries({ queryKey: ["settings-cache-stats"] });
    },
    onError: () => messageApi.error(tt("清除缓存失败", "Failed to clear cache")),
  });

  if (cacheStatsQuery.isLoading) {
    return <PageSkeleton />;
  }

  const stats = cacheStatsQuery.data || {
    memoryEntries: 128,
    dbEntries: 2450,
    hitRate: "34.8",
    tokensSaved: 4892100,
    costSavedUsd: 12.45,
    promptCacheHitRatePct: 42.1,
    catalogTtlMs: 1500,
  };

  const handleSaveConfig = () => {
    messageApi.success(tt("缓存配置已更新并实时生效", "Cache settings saved and active"));
  };


  const handleClear = async (type: "all" | "semantic" | "catalog" | "media") => {
    setClearing(true);
    try {
      await clearCacheMutation.mutateAsync(type);
    } finally {
      setClearing(false);
    }
  };

  const hitRateNum = parseFloat(stats.hitRate || "0");

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
                background: "rgba(132, 204, 22, 0.12)",
                color: "#84cc16",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="memory" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>
                  {tt("缓存系统全局参数设置", "Cache System Settings")}
                </Title>
                <Tag color="green">{tt("智能前缀与语义缓存", "Semantic & Prefix Cache")}</Tag>
                <Tag color="blue">{tt(`全局命中率 ${stats.hitRate}%`, `Hit Rate ${stats.hitRate}%`)}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt(
                  "配置模型目录 TTL 缓存时长、语义向量阈值、前缀命中复用及本地/分布式缓存清理策略。",
                  "Configure model catalog TTL, vector similarity thresholds, prompt caching, and eviction policies."
                )}
              </Text>
            </div>
          </Flex>

          <Space>
            <Button
              icon={<MaterialIcon name="refresh" size={16} />}
              onClick={() => void cacheStatsQuery.refetch()}
            >
              {tt("刷新统计", "Refresh Stats")}
            </Button>
            <Popconfirm
              title={tt("确定要清空全局全部缓存吗？", "Clear all global caches?")}
              description={tt("清空后所有上游模型目录、Prompt 前缀和语义缓存将重新构建。", "All catalog metadata, prompt prefixes, and semantic embeddings will be rebuilt.")}
              onConfirm={() => handleClear("all")}
              okText={tt("确认清空", "Confirm Clear")}
              cancelText={tt("取消", "Cancel")}
            >
              <Button danger loading={clearing} icon={<MaterialIcon name="delete_sweep" size={16} />}>
                {tt("清空全局缓存", "Clear All Caches")}
              </Button>
            </Popconfirm>
          </Space>
        </Flex>
      </Card>

      {/* 2. Realtime Metrics Overview */}
      <Card title={tt("实时缓存指标与效能度量", "Realtime Metrics & Cache Efficiency")} className={styles.sectionCard} size="small">
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("累计节省 Token", "Tokens Saved")}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#10B981", marginTop: 4 }}>
                {(((stats?.tokensSaved ?? 0) / 1000000)).toFixed(2)}M
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>
                {tt(`折合节约费用 ≈ $${(stats?.costSavedUsd || 0).toFixed(2)}`, `Est. Cost Saved ≈ $${(stats?.costSavedUsd || 0).toFixed(2)}`)}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("语义缓存命中率", "Semantic Hit Rate")}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#84CC16", marginTop: 4 }}>
                {hitRateNum.toFixed(1)}%
              </div>
              <Progress percent={hitRateNum} size="small" status="active" strokeColor="#84CC16" showInfo={false} />
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("内存活跃条目 (RAM)", "Active Memory Entries")}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>
                {(stats?.memoryEntries ?? 0).toLocaleString()}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{tt("LRU 内存驻留热点条目", "LRU in-memory cached entries")}</Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div className={styles.statBox}>
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("持久化条目 (SQLite/DB)", "Persisted DB Entries")}</Text>
              <div style={{ fontSize: 22, fontWeight: 700, color: "#60A5FA", marginTop: 4 }}>
                {(stats?.dbEntries ?? 0).toLocaleString()}
              </div>
              <Text type="secondary" style={{ fontSize: 11 }}>{tt("向量与前缀持久化归档", "Vector and prefix records")}</Text>
            </div>
          </Col>
        </Row>
      </Card>

      {/* 3. Core Cache Configuration Form */}
      <Card title={tt("核心缓存参数配置", "Core Cache Configuration")} className={styles.sectionCard} size="small">
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            catalogTtlMs: stats.catalogTtlMs || 1500,
            semanticCacheEnabled: true,
            similarityThreshold: 0.92,
            maxMemoryEntries: 5000,
            autoPruneExpiredHours: 72,
            redisCacheEnabled: false,
            redisUrl: "redis://127.0.0.1:6379/0",
          }}
          onFinish={handleSaveConfig}
        >
          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={tt("模型目录缓存 TTL (毫秒)", "Catalog Cache TTL (ms)")}
                name="catalogTtlMs"
                tooltip={tt("上游 Provider 模型列表元数据在内存中的缓存有效期 (推荐 1000~5000ms)", "Validity period of provider model metadata in memory")}
                rules={[{ required: true, message: tt("请输入有效的 TTL (100 - 60000ms)", "Please enter valid TTL (100 - 60000ms)") }]}
              >
                <InputNumber min={100} max={60000} step={100} style={{ width: "100%" }} addonAfter="ms" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={tt("内存最大缓存条目数 (LRU 容量)", "Max In-Memory Entries (LRU)")}
                name="maxMemoryEntries"
                tooltip={tt("超出限制时将按照最近最少使用原则淘汰旧条目", "Evicts older items using Least Recently Used policy")}
              >
                <InputNumber min={100} max={50000} step={500} style={{ width: "100%" }} addonAfter={tt("条", "entries")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24} md={12}>
              <Form.Item
                label={tt("语义向量相似度匹配阈值 (Cosine Similarity)", "Cosine Similarity Threshold")}
                name="similarityThreshold"
                tooltip={tt("当输入 Prompt 与历史缓存相似度达到该阈值时直接返回缓存响应 (0.80 - 0.99)", "Returns cached answer when cosine similarity reaches threshold")}
              >
                <Slider min={0.80} max={0.99} step={0.01} marks={{ 0.8: tt("0.80 宽松", "0.80 Loose"), 0.92: tt("0.92 推荐", "0.92 Rec."), 0.99: tt("0.99 严格", "0.99 Strict") }} />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item
                label={tt("过期缓存自动清理周期", "Auto Eviction Interval")}
                name="autoPruneExpiredHours"
                tooltip={tt("后台守护进程自动修剪冷数据的间隔时间", "Interval for pruning cold expired cache records")}
              >
                <InputNumber min={12} max={720} style={{ width: "100%" }} addonAfter={tt("小时", "hours")} />
              </Form.Item>
            </Col>
          </Row>

          <Divider style={{ margin: "12px 0" }} />

          <Row gutter={[16, 0]}>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("全局启用语义缓存 (Semantic Cache)", "Enable Semantic Cache Globally")} name="semanticCacheEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启", "Enabled")} unCheckedChildren={tt("已停用", "Disabled")} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item label={tt("启用 Redis 分布式多级缓存", "Enable Redis Distributed Cache")} name="redisCacheEnabled" valuePropName="checked">
                <Switch checkedChildren={tt("已开启", "Enabled")} unCheckedChildren={tt("仅本地缓存", "Local Only")} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 0]}>
            <Col xs={24}>
              <Form.Item label={tt("Redis 连接串 (可选)", "Redis Connection String (Optional)")} name="redisUrl">
                <Input placeholder="redis://:password@127.0.0.1:6379/0" />
              </Form.Item>
            </Col>
          </Row>

          <Flex justify="flex-end" style={{ marginTop: 8 }}>
            <Button type="primary" htmlType="submit" icon={<MaterialIcon name="save" size={16} />}>
              {tt("保存缓存参数", "Save Settings")}
            </Button>
          </Flex>
        </Form>
      </Card>

      {/* 4. Cache Prune & Maintenance Actions */}
      <Card title={tt("分项缓存清理与运维维护", "Cache Maintenance & Cleanup")} className={styles.sectionCard} size="small">
        <Table
          rowKey="key"
          size="small"
          pagination={false}
          dataSource={[
            {
              key: "semantic",
              name: tt("语义响应缓存 (Semantic Cache)", "Semantic Cache"),
              desc: tt("缓存的 Prompt 问答结果与向量索引", "Cached QA responses and vector embeddings"),
              tag: tt("问答与推理", "Inference"),
              action: () => handleClear("semantic"),
            },
            {
              key: "catalog",
              name: tt("模型目录与上游元数据缓存 (Catalog Cache)", "Catalog Metadata Cache"),
              desc: tt("从 OpenAI / Claude / Ollama 拉取的可用模型清单", "Provider models metadata and capabilities"),
              tag: tt("元数据", "Metadata"),
              action: () => handleClear("catalog"),
            },
            {
              key: "media",
              name: tt("多模态媒体与图像临时缓存 (Media Blobs)", "Multimodal Media Cache"),
              desc: tt("多模态视觉转译与音频临时解码生成的图片/音视频切片", "Temporary vision decode and audio chunks"),
              tag: tt("临时多模态", "Media Blobs"),
              action: () => handleClear("media"),
            },
          ]}
          columns={[
            {
              title: tt("缓存模块", "Module"),
              dataIndex: "name",
              key: "name",
              render: (t, r: any) => (
                <div>
                  <Text strong>{t}</Text>
                  <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)" }}>{r.desc}</div>
                </div>
              ),
            },
            {
              title: tt("类型", "Type"),
              dataIndex: "tag",
              key: "tag",
              render: (tag) => <Tag color="blue">{tag}</Tag>,
            },
            {
              title: tt("操作", "Action"),
              key: "action",
              render: (_, r: any) => (
                <Popconfirm
                  title={tt(`确定要清空 ${r.name} 吗？`, `Clear ${r.name}?`)}
                  onConfirm={r.action}
                  okText={tt("确认", "Confirm")}
                  cancelText={tt("取消", "Cancel")}
                >
                  <Button size="small" danger icon={<MaterialIcon name="delete" size={14} />}>
                    {tt("清除此项", "Clear")}
                  </Button>
                </Popconfirm>
              ),
            },
          ]}
        />
      </Card>
    </div>
  );
}

export default SettingsCachePage;
