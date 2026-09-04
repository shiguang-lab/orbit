import { useState } from "react";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Flex,
  Input,
  Row,
  Segmented,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { radarApi, type RadarMergedEntry } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text, Paragraph } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    maxWidth: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
  },
  infoCard: {
    borderRadius: 10,
    background: "rgba(139, 92, 246, 0.03)",
    border: "1px solid rgba(139, 92, 246, 0.15)",
  },
}));

function formatTokens(value: number): string {
  if (value === 0) return "免密/按速率 (rate-only)";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M / 月`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K / 月`;
  return `${value} / 月`;
}

export function RadarPage() {
  const { styles } = useStyles();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("catalog");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEnabled, setEditingEnabled] = useState(true);
  const [keyInput, setKeyInput] = useState("");

  // 1. Settings query (optIn, supporter key)
  const settingsQuery = useQuery({
    queryKey: ["radar-settings"],
    queryFn: () => radarApi.getSettings(),
  });

  // 2. Catalog query
  const catalogQuery = useQuery({
    queryKey: ["radar-catalog"],
    queryFn: () => radarApi.getCatalog(),
  });

  // 3. Referrals query
  const referralsQuery = useQuery({
    queryKey: ["radar-referrals"],
    queryFn: () => radarApi.getReferrals(),
  });

  // 4. Offers query
  const offersQuery = useQuery({
    queryKey: ["radar-offers"],
    queryFn: () => radarApi.getOffers(),
    enabled: activeTab === "offers",
  });

  // 5. Intel query
  const intelQuery = useQuery({
    queryKey: ["radar-intel"],
    queryFn: () => radarApi.getIntel(),
    enabled: activeTab === "intel",
  });

  // Mutations
  const activateMutation = useMutation({
    mutationFn: (vars: { optIn: boolean; supporterKey?: string | null }) => radarApi.saveSettings(vars),
    onSuccess: () => {
      message.success("雷达设置已更新");
      queryClient.invalidateQueries({ queryKey: ["radar-settings"] });
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-referrals"] });
    },
    onError: (err: any) => {
      message.error(err.message || "更新失败");
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => radarApi.sync(),
    onSuccess: () => {
      message.success("雷达目录同步完成");
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-referrals"] });
    },
    onError: (err: any) => {
      message.error(err.message || "同步失败");
    },
  });

  const saveOverrideMutation = useMutation({
    mutationFn: (patch: { provider: string; modelId: string; displayName?: string; enabled?: boolean }) =>
      radarApi.saveLocalModelOverride(patch),
    onSuccess: () => {
      message.success("本地模型配置已保存");
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-local-model-state"] });
    },
    onError: (err: any) => {
      message.error(err.message || "保存失败");
    },
  });

  const resetOverrideMutation = useMutation({
    mutationFn: (params: { provider: string; modelId: string }) =>
      radarApi.resetLocalModelOverride(params.provider, params.modelId),
    onSuccess: () => {
      message.success("已恢复为雷达默认配置");
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-local-model-state"] });
    },
    onError: (err: any) => {
      message.error(err.message || "重置失败");
    },
  });

  if (settingsQuery.isLoading || catalogQuery.isLoading) {
    return <PageSkeleton />;
  }

  const settings = settingsQuery.data || { optIn: false, hasSupporterKey: false, supporterKeyMasked: null };
  const entries = catalogQuery.data?.entries || [];
  const meta = catalogQuery.data?.meta || null;
  const referrals = referralsQuery.data || { fixed: [], campaigns: [], tier: null };

  return (
    <div className={styles.page}>
      {/* 1. Header Banner */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={14}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: "rgba(139, 92, 246, 0.12)",
                color: "#8b5cf6",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="radar" size={26} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                  模型雷达与社区目录 (Radar)
                </Title>
                <Tag color={settings.optIn ? (meta?.tier === "live" ? "green" : "purple") : "default"}>
                  {settings.optIn ? (meta?.tier === "live" ? "💎 Supporter 实时订阅" : "🌐 社区版本") : "未激活订阅"}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 13 }}>
                实时汇聚全球免费大模型目录、每日配额、免密 Endpoint 及社区返利与优惠情报。
              </Text>
            </div>
          </Flex>

          <Space wrap>
            {settings.optIn && (
              <Button
                icon={<MaterialIcon name="sync" size={16} />}
                loading={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
              >
                立即同步雷达
              </Button>
            )}
            <Button
              type={settings.optIn ? "default" : "primary"}
              style={settings.optIn ? undefined : { background: "#8b5cf6" }}
              loading={activateMutation.isPending}
              onClick={() => activateMutation.mutate({ optIn: !settings.optIn })}
            >
              {settings.optIn ? "关闭雷达订阅" : "激活雷达订阅"}
            </Button>
          </Space>
        </Flex>

        {meta && (
          <Flex gap={24} style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--ant-color-border-secondary)" }} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              目录版本: <Text strong style={{ fontFamily: "monospace" }}>{meta.version}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              上次获取: <Text strong>{new Date(meta.fetchedAt).toLocaleString()}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              收录免费模型: <Text strong style={{ color: "#8b5cf6" }}>{entries.length} 个</Text>
            </Text>
            {settings.supporterKeyMasked ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                赞助密钥: <Text code>{settings.supporterKeyMasked}</Text>
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                模式: <Text strong>社区开放版</Text>
              </Text>
            )}
          </Flex>
        )}
      </Card>

      {/* 2. Supporter Key / Privacy Settings Banner */}
      {!settings.optIn ? (
        <Alert
          type="info"
          showIcon
          message="雷达订阅尚未开启"
          description={
            <Flex justify="space-between" align="center" wrap gap={12} style={{ marginTop: 6 }}>
              <div>
                开启后，OmniRoute 将定期通过数字签名下载全球最新免费模型元数据与配额规则（完全本地隐私，绝不上传任何请求与密钥）。
              </div>
              <Button type="primary" size="middle" loading={activateMutation.isPending} onClick={() => activateMutation.mutate({ optIn: true })}>
                立即免费开启
              </Button>
            </Flex>
          }
        />
      ) : (
        <Card className={styles.infoCard} styles={{ body: { padding: "12px 18px" } }}>
          <Flex justify="space-between" align="center" wrap gap={12}>
            <Flex align="center" gap={12} wrap>
              <Text strong style={{ fontSize: 13 }}>Supporter 密钥授权：</Text>
              {settings.hasSupporterKey ? (
                <Flex align="center" gap={8}>
                  <Tag color="green">已接入: {settings.supporterKeyMasked}</Tag>
                  <Button
                    type="link"
                    size="middle"
                    style={{ padding: 0 }}
                    onClick={() => activateMutation.mutate({ optIn: true, supporterKey: null })}
                  >
                    清除密钥
                  </Button>
                </Flex>
              ) : (
                <Flex gap={8} align="center">
                  <Input
                    placeholder="输入 omr_... (40位密钥)"
                    value={keyInput}
                    onChange={(e) => setKeyInput(e.target.value)}
                    style={{ width: 260, fontFamily: "monospace" }}
                  />
                  <Button
                    type="primary"
                    disabled={!keyInput.trim()}
                    loading={activateMutation.isPending}
                    onClick={() => {
                      activateMutation.mutate({ optIn: true, supporterKey: keyInput.trim() });
                      setKeyInput("");
                    }}
                  >
                    绑定密钥
                  </Button>
                </Flex>
              )}
            </Flex>

            <Space size={16}>
              <a href={settings.contributorClaimUrl || "https://radar.omniroute.online/auth/github"} target="_blank" rel="noreferrer">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  🎁 贡献者免费领取 Key →
                </Text>
              </a>
              <a href={settings.supporterPlansUrl || "https://radar.omniroute.online/planos"} target="_blank" rel="noreferrer">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  💎 了解 Supporter 赞助权益 →
                </Text>
              </a>
            </Space>
          </Flex>
        </Card>
      )}

      {/* 3. Navigation Tabs */}
      <Segmented
        value={activeTab}
        onChange={(val) => setActiveTab(val as string)}
        options={[
          { label: "免费模型目录 (Catalog)", value: "catalog", icon: <MaterialIcon name="list" size={16} /> },
          { label: "专属返利与赠金 (Free Credits)", value: "referrals", icon: <MaterialIcon name="card_giftcard" size={16} /> },
          { label: "限时优惠 (Offers)", value: "offers", icon: <MaterialIcon name="local_offer" size={16} /> },
          { label: "雷达情报 (Intel)", value: "intel", icon: <MaterialIcon name="insights" size={16} /> },
        ]}
      />

      {/* 4. Catalog Tab */}
      {activeTab === "catalog" && (
        <Card className={styles.sectionCard} title="社区收录免费模型列表">
          <Table<RadarMergedEntry>
            rowKey={(r) => `${r.provider}:${r.modelId}`}
            dataSource={entries}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: "提供商",
                dataIndex: "provider",
                key: "provider",
                width: 160,
                render: (provider, record) => (
                  <Space direction="vertical" size={2}>
                    <Flex align="center" gap={6}>
                      <Text strong>{provider}</Text>
                      {record.origin === "radar" && <Tag color="purple">新收录</Tag>}
                      {record.origin === "local" && <Tag color="blue">自定义</Tag>}
                    </Flex>
                    {record.setup?.keyUrl && (
                      <a href={record.setup.keyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#8b5cf6" }}>
                        获取密钥 →
                      </a>
                    )}
                  </Space>
                ),
              },
              {
                title: "模型 ID 与显示名称",
                key: "model",
                render: (_, record) => {
                  const key = `${record.provider}:${record.modelId}`;
                  const isEditing = editingKey === key;
                  return isEditing ? (
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder="本地显示名称"
                      />
                      <Checkbox
                        checked={editingEnabled}
                        onChange={(e) => setEditingEnabled(e.target.checked)}
                      >
                        本地启用此模型
                      </Checkbox>
                      <Space>
                        <Button
                          type="primary"
                          loading={saveOverrideMutation.isPending}
                          onClick={() =>
                            saveOverrideMutation.mutate({
                              provider: record.provider,
                              modelId: record.modelId,
                              displayName: editingName,
                              enabled: editingEnabled,
                            })
                          }
                        >
                          保存
                        </Button>
                        <Button onClick={() => setEditingKey(null)}>取消</Button>
                      </Space>
                    </Space>
                  ) : (
                    <div>
                      <Flex align="center" gap={6}>
                        <Text strong>{record.displayName}</Text>
                        {!record.enabled && <Tag color="error">已停用</Tag>}
                      </Flex>
                      <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
                        {record.modelId}
                      </Text>
                    </div>
                  );
                },
              },
              {
                title: "免费额度 / 周期",
                key: "budget",
                width: 180,
                render: (_, record) => (
                  <div>
                    <Tag color={record.freeType === "keyless" ? "cyan" : "green"}>
                      {record.freeType}
                    </Tag>
                    <div style={{ fontSize: 12, marginTop: 4 }}>
                      {formatTokens(record.monthlyTokens)}
                    </div>
                  </div>
                ),
              },
              {
                title: "上下文 (Context)",
                dataIndex: "contextWindow",
                key: "context",
                width: 120,
                render: (ctx) => (ctx ? `${(ctx / 1000).toFixed(0)}K` : "—"),
              },
              {
                title: "模型能力",
                key: "capabilities",
                width: 180,
                render: (_, record) => (
                  <Space wrap size={4}>
                    {record.capabilities?.tools && <Tag color="blue">工具调用</Tag>}
                    {record.capabilities?.vision && <Tag color="purple">视觉多模态</Tag>}
                    {record.capabilities?.thinking && <Tag color="gold">深度推理</Tag>}
                  </Space>
                ),
              },
              {
                title: "操作",
                key: "actions",
                width: 140,
                align: "right",
                render: (_, record) => {
                  const key = `${record.provider}:${record.modelId}`;
                  return (
                    <Space>
                      <Button
                        type="link"
                        onClick={() => {
                          setEditingKey(key);
                          setEditingName(record.displayName);
                          setEditingEnabled(record.enabled !== false);
                        }}
                      >
                        编辑
                      </Button>
                      {record.origin === "local" && (
                        <Button
                          type="link"
                          danger
                          onClick={() =>
                            resetOverrideMutation.mutate({
                              provider: record.provider,
                              modelId: record.modelId,
                            })
                          }
                        >
                          重置
                        </Button>
                      )}
                    </Space>
                  );
                },
              },
            ]}
          />
        </Card>
      )}

      {/* 5. Referrals Tab */}
      {activeTab === "referrals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <Card className={styles.sectionCard} title="官方收录的提供商注册与免密通道">
            <Row gutter={[16, 16]}>
              {referrals.fixed.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.provider}>
                  <Card size="small" style={{ borderRadius: 8, height: "100%" }}>
                    <Flex justify="space-between" align="start">
                      <div>
                        <Text strong style={{ fontSize: 15 }}>{item.provider}</Text>
                        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                          {item.requiredAction || "注册并领取免费模型额度"}
                        </Paragraph>
                      </div>
                      <Tag color="geekblue">稳定有效</Tag>
                    </Flex>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <Button type="primary" style={{ width: "100%" }}>
                        前往领取额度 →
                      </Button>
                    </a>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          <Card className={styles.sectionCard} title="限时福利与赠金活动 (Campaigns)">
            {referrals.campaigns.length === 0 ? (
              <Empty description="暂无限时活动或需 Supporter 权限" />
            ) : (
              <Row gutter={[16, 16]}>
                {referrals.campaigns.map((item, idx) => (
                  <Col xs={24} sm={12} key={idx}>
                    <Card size="small" style={{ borderRadius: 8, border: "1px solid #ffd591" }}>
                      <Flex justify="space-between" align="start">
                        <div>
                          <Text strong style={{ fontSize: 15 }}>{item.provider}</Text>
                          <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                            {item.requiredAction}
                          </Paragraph>
                          {item.validUntil && (
                            <Text type="warning" style={{ fontSize: 11 }}>
                              截止时间: {new Date(item.validUntil).toLocaleDateString()}
                            </Text>
                          )}
                        </div>
                        <Tag color="gold">限时活动</Tag>
                      </Flex>
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: "block" }}>
                        <Button type="primary" style={{ width: "100%", background: "#fa8c16" }}>
                          立即参与活动 →
                        </Button>
                      </a>
                    </Card>
                  </Col>
                ))}
              </Row>
            )}
          </Card>
        </div>
      )}

      {/* 6. Offers Tab */}
      {activeTab === "offers" && (
        <Card className={styles.sectionCard} title="雷达精选折扣与特别计划">
          {offersQuery.isLoading ? (
            <PageSkeleton />
          ) : (
            <Row gutter={[16, 16]}>
              {(offersQuery.data?.offers || []).map((offer) => (
                <Col xs={24} sm={12} key={offer.id}>
                  <Card size="small" style={{ borderRadius: 8 }}>
                    <Flex justify="space-between" align="start">
                      <div>
                        <Text strong style={{ fontSize: 15 }}>
                          {typeof offer.title === "object" ? (offer.title as any).zh || (offer.title as any).en : offer.title}
                        </Text>
                        <Tag color="purple" style={{ marginLeft: 8 }}>{offer.provider}</Tag>
                      </div>
                      <Tag color="green">特惠</Tag>
                    </Flex>
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                      {typeof offer.description === "object" ? (offer.description as any).zh || (offer.description as any).en : offer.description}
                    </Paragraph>
                    <a href={offer.url} target="_blank" rel="noreferrer">
                      <Button style={{ width: "100%" }}>查看优惠详情 →</Button>
                    </a>
                  </Card>
                </Col>
              ))}
            </Row>
          )}
        </Card>
      )}

      {/* 7. Intel Tab */}
      {activeTab === "intel" && (
        <Card className={styles.sectionCard} title="雷达情报与 ELO 评测">
          {intelQuery.isLoading ? (
            <PageSkeleton />
          ) : (
            <Table
              rowKey="modelId"
              dataSource={intelQuery.data?.intel?.rankings || []}
              pagination={false}
              columns={[
                { title: "排名", dataIndex: "rank", key: "rank", width: 80, render: (r) => <Tag color="gold">#{r}</Tag> },
                { title: "提供商", dataIndex: "provider", key: "provider", width: 140 },
                { title: "模型 ID", dataIndex: "modelId", key: "modelId" },
                { title: "分类", dataIndex: "category", key: "category", render: (c) => <Tag>{c}</Tag> },
                { title: "ELO 天梯分", dataIndex: "rating", key: "rating", render: (score) => <Text strong style={{ color: "#8b5cf6" }}>{score}</Text> },
                {
                  title: "战绩 (胜/平/负)",
                  key: "record",
                  render: (_, r) => `${r.wins} 胜 / ${r.draws} 平 / ${r.losses} 负 (共 ${r.matches} 场)`,
                },
              ]}
            />
          )}
        </Card>
      )}
    </div>
  );
}

export default RadarPage;
