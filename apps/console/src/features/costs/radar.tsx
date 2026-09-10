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
import { useI18n } from "@/i18n";

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

export function RadarPage() {
  const { styles } = useStyles();
  const { tt, isZh } = useI18n();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<string>("catalog");
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingEnabled, setEditingEnabled] = useState(true);
  const [keyInput, setKeyInput] = useState("");

  const formatTokens = (value: number): string => {
    if (value === 0) return tt("免密 / 按速率", "Keyless / Rate-only");
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M / ${tt("月", "mo")}`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}K / ${tt("月", "mo")}`;
    return `${value} / ${tt("月", "mo")}`;
  };

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
      message.success(tt("雷达设置已更新", "Radar settings updated"));
      queryClient.invalidateQueries({ queryKey: ["radar-settings"] });
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-referrals"] });
    },
    onError: (err: any) => {
      message.error(err.message || tt("更新失败", "Update failed"));
    },
  });

  const syncMutation = useMutation({
    mutationFn: () => radarApi.sync(),
    onSuccess: () => {
      message.success(tt("雷达目录同步完成", "Radar catalog synced"));
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-referrals"] });
    },
    onError: (err: any) => {
      message.error(err.message || tt("同步失败", "Sync failed"));
    },
  });

  const saveOverrideMutation = useMutation({
    mutationFn: (patch: { provider: string; modelId: string; displayName?: string; enabled?: boolean }) =>
      radarApi.saveLocalModelOverride(patch),
    onSuccess: () => {
      message.success(tt("本地模型配置已保存", "Local model override saved"));
      setEditingKey(null);
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-local-model-state"] });
    },
    onError: (err: any) => {
      message.error(err.message || tt("保存失败", "Save failed"));
    },
  });

  const resetOverrideMutation = useMutation({
    mutationFn: (params: { provider: string; modelId: string }) =>
      radarApi.resetLocalModelOverride(params.provider, params.modelId),
    onSuccess: () => {
      message.success(tt("已恢复为雷达默认配置", "Reset to Radar defaults"));
      queryClient.invalidateQueries({ queryKey: ["radar-catalog"] });
      queryClient.invalidateQueries({ queryKey: ["radar-local-model-state"] });
    },
    onError: (err: any) => {
      message.error(err.message || tt("重置失败", "Reset failed"));
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
                  {tt("模型雷达与社区目录", "Model Radar & Directory")}
                </Title>
                <Tag color={settings.optIn ? (meta?.tier === "live" ? "green" : "purple") : "default"}>
                  {settings.optIn
                    ? (meta?.tier === "live"
                        ? tt("💎 Supporter 实时订阅", "💎 Supporter Live")
                        : tt("🌐 社区版本", "🌐 Community Edition"))
                    : tt("未激活订阅", "Not Subscribed")}
                </Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 13 }}>
                {tt(
                  "实时汇聚全球免费大模型目录、每日配额、免密 Endpoint 及社区返利与优惠情报。",
                  "Real-time catalog of global free LLMs, daily quotas, keyless endpoints, referral bonuses, and deal intelligence."
                )}
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
                {tt("立即同步雷达", "Sync Radar Now")}
              </Button>
            )}
            <Button
              type={settings.optIn ? "default" : "primary"}
              style={settings.optIn ? undefined : { background: "#8b5cf6" }}
              loading={activateMutation.isPending}
              onClick={() => activateMutation.mutate({ optIn: !settings.optIn })}
            >
              {settings.optIn ? tt("关闭雷达订阅", "Disable Radar") : tt("激活雷达订阅", "Enable Radar")}
            </Button>
          </Space>
        </Flex>

        {meta && (
          <Flex gap={24} style={{ marginTop: 14, paddingTop: 12, borderTop: "1px solid var(--ant-color-border-secondary)" }} wrap>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("目录版本", "Catalog Version")}: <Text strong style={{ fontFamily: "monospace" }}>{meta.version}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("上次获取", "Last Fetched")}: <Text strong>{new Date(meta.fetchedAt).toLocaleString()}</Text>
            </Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {tt("收录免费模型", "Indexed Models")}: <Text strong style={{ color: "#8b5cf6" }}>{entries.length} {tt("个", "models")}</Text>
            </Text>
            {settings.supporterKeyMasked ? (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("赞助密钥", "Supporter Key")}: <Text code>{settings.supporterKeyMasked}</Text>
              </Text>
            ) : (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("模式", "Mode")}: <Text strong>{tt("社区开放版", "Community Open")}</Text>
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
          message={tt("雷达订阅尚未开启", "Radar Subscription Inactive")}
          description={
            <Flex justify="space-between" align="center" wrap gap={12} style={{ marginTop: 6 }}>
              <div>
                {tt(
                  "开启后，智枢 将定期通过数字签名下载全球最新免费模型元数据与配额规则（完全本地隐私，绝不上传任何请求与密钥）。",
                  "When enabled, Orbit periodically fetches digitally signed global free LLM metadata and quota rules (strictly local privacy, no requests or keys uploaded)."
                )}
                <div style={{ marginTop: 6, fontSize: 12 }}>
                  {tt("访问规则：仅下载签名目录；不上传请求、提示词或密钥；本地覆盖始终优先，且可随时退出。", "Access rules: only the signed catalog is downloaded; requests, prompts, and keys are never uploaded; local overrides always win and opt-out is available at any time.")}
                </div>
              </div>
              <Button type="primary" size="middle" loading={activateMutation.isPending} onClick={() => activateMutation.mutate({ optIn: true })}>
                {tt("立即免费开启", "Enable for Free")}
              </Button>
            </Flex>
          }
        />
      ) : (
        <Card className={styles.infoCard} styles={{ body: { padding: "12px 18px" } }}>
          <Flex justify="space-between" align="center" wrap gap={12}>
            <Flex align="center" gap={12} wrap>
              <Text strong style={{ fontSize: 13 }}>{tt("Supporter 密钥授权：", "Supporter Key Authorization:")}</Text>
              {settings.hasSupporterKey ? (
                <Flex align="center" gap={8}>
                  <Tag color="green">{tt("已接入", "Connected")}: {settings.supporterKeyMasked}</Tag>
                  <Button
                    type="link"
                    size="middle"
                    style={{ padding: 0 }}
                    onClick={() => activateMutation.mutate({ optIn: true, supporterKey: null })}
                  >
                    {tt("清除密钥", "Clear Key")}
                  </Button>
                </Flex>
              ) : (
                <Flex gap={8} align="center">
                  <Input
                    placeholder={tt("输入 omr_... (40位密钥)", "Enter omr_... key")}
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
                    {tt("绑定密钥", "Bind Key")}
                  </Button>
                </Flex>
              )}
            </Flex>

            <Space size={16}>
              <a href={settings.contributorClaimUrl || "https://radar.orbit.online/auth/github"} target="_blank" rel="noreferrer">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("🎁 贡献者免费领取 Key →", "🎁 Contributor Free Key →")}
                </Text>
              </a>
              <a href={settings.supporterPlansUrl || "https://radar.orbit.online/planos"} target="_blank" rel="noreferrer">
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {tt("💎 了解 Supporter 赞助权益 →", "💎 Supporter Perks →")}
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
          { label: tt("免费模型目录", "Catalog"), value: "catalog", icon: <MaterialIcon name="list" size={16} /> },
          { label: tt("专属返利与赠金", "Free Credits"), value: "referrals", icon: <MaterialIcon name="card_giftcard" size={16} /> },
          { label: tt("限时优惠", "Offers"), value: "offers", icon: <MaterialIcon name="local_offer" size={16} /> },
          { label: tt("雷达情报", "Intel"), value: "intel", icon: <MaterialIcon name="insights" size={16} /> },
        ]}
      />

      {/* 4. Catalog Tab */}
      {activeTab === "catalog" && (
        <Card className={styles.sectionCard} title={tt("社区收录免费模型列表", "Community Free Models")}>
          <Table<RadarMergedEntry>
            rowKey={(r) => `${r.provider}:${r.modelId}`}
            dataSource={entries}
            pagination={{ pageSize: 10 }}
            columns={[
              {
                title: tt("提供商", "Provider"),
                dataIndex: "provider",
                key: "provider",
                width: 160,
                render: (provider, record) => (
                  <Space direction="vertical" size={2}>
                    <Flex align="center" gap={6}>
                      <Text strong>{provider}</Text>
                      {record.origin === "radar" && <Tag color="purple">{tt("新收录", "Radar")}</Tag>}
                      {record.origin === "local" && <Tag color="blue">{tt("自定义", "Custom")}</Tag>}
                    </Flex>
                    {record.setup?.keyUrl && (
                      <a href={record.setup.keyUrl} target="_blank" rel="noreferrer" style={{ fontSize: 11, color: "#8b5cf6" }}>
                        {tt("获取密钥 →", "Get Key →")}
                      </a>
                    )}
                  </Space>
                ),
              },
              {
                title: tt("模型与显示名称", "Model & Display Name"),
                key: "model",
                render: (_, record) => {
                  const key = `${record.provider}:${record.modelId}`;
                  const isEditing = editingKey === key;
                  return isEditing ? (
                    <Space direction="vertical" style={{ width: "100%" }}>
                      <Input
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        placeholder={tt("本地显示名称", "Local display name")}
                      />
                      <Checkbox
                        checked={editingEnabled}
                        onChange={(e) => setEditingEnabled(e.target.checked)}
                      >
                        {tt("本地启用此模型", "Enable model locally")}
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
                          {tt("保存", "Save")}
                        </Button>
                        <Button onClick={() => setEditingKey(null)}>{tt("取消", "Cancel")}</Button>
                      </Space>
                    </Space>
                  ) : (
                    <div>
                      <Flex align="center" gap={6}>
                        <Text strong>{record.displayName}</Text>
                        {!record.enabled && <Tag color="error">{tt("已停用", "Disabled")}</Tag>}
                      </Flex>
                      <Text type="secondary" style={{ fontSize: 12, fontFamily: "monospace" }}>
                        {record.modelId}
                      </Text>
                    </div>
                  );
                },
              },
              {
                title: tt("免费额度 / 周期", "Free Quota / Period"),
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
                title: tt("上下文", "Context Window"),
                dataIndex: "contextWindow",
                key: "context",
                width: 120,
                render: (ctx) => (ctx ? `${(ctx / 1000).toFixed(0)}K` : "—"),
              },
              {
                title: tt("模型能力", "Capabilities"),
                key: "capabilities",
                width: 180,
                render: (_, record) => (
                  <Space wrap size={4}>
                    {record.capabilities?.tools && <Tag color="blue">{tt("工具调用", "Tools")}</Tag>}
                    {record.capabilities?.vision && <Tag color="purple">{tt("视觉多模态", "Vision")}</Tag>}
                    {record.capabilities?.thinking && <Tag color="gold">{tt("深度推理", "Thinking")}</Tag>}
                  </Space>
                ),
              },
              {
                title: tt("速率 / 训练", "Limits / Training"),
                key: "limits",
                width: 190,
                render: (_, record) => (
                  <Space orientation="vertical" size={2}>
                    <Text style={{ fontSize: 12 }}>
                      {record.limits
                        ? [`${record.limits.rpm ?? "—"} RPM`, `${record.limits.rpd ?? "—"} RPD`, `${record.limits.tpm ?? "—"} TPM`, `${record.limits.tpd ?? "—"} TPD`].join(" · ")
                        : "—"}
                    </Text>
                    <Tag color={record.trainsOnPrompts ? "warning" : "success"}>
                      {record.trainsOnPrompts ? tt("可能用于训练", "May train") : tt("不用于训练", "No training")}
                    </Tag>
                  </Space>
                ),
              },
              {
                title: tt("操作", "Actions"),
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
                        {tt("编辑", "Edit")}
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
                          {tt("重置", "Reset")}
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
          <Card className={styles.sectionCard} title={tt("官方收录的提供商注册与免密通道", "Free Provider Portals & Onboarding")}>
            <Row gutter={[16, 16]}>
              {referrals.fixed.map((item) => (
                <Col xs={24} sm={12} md={8} key={item.provider}>
                  <Card size="small" style={{ borderRadius: 8, height: "100%" }}>
                    <Flex justify="space-between" align="start">
                      <div>
                        <Text strong style={{ fontSize: 15 }}>{item.provider}</Text>
                        <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 4, marginBottom: 8 }}>
                          {item.requiredAction || tt("注册并领取免费模型额度", "Sign up to claim free credits")}
                        </Paragraph>
                      </div>
                      <Tag color="geekblue">{tt("稳定有效", "Verified")}</Tag>
                    </Flex>
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <Button type="primary" style={{ width: "100%" }}>
                        {tt("前往领取额度 →", "Claim Credits →")}
                      </Button>
                    </a>
                  </Card>
                </Col>
              ))}
            </Row>
          </Card>

          <Card className={styles.sectionCard} title={tt("限时福利与赠金活动", "Campaigns & Offers")}>
            {referrals.campaigns.length === 0 ? (
              <Empty description={tt("暂无限时活动或需 Supporter 权限", "No active campaigns or supporter tier required")} />
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
                              {tt("截止时间", "Expires")}: {new Date(item.validUntil).toLocaleDateString()}
                            </Text>
                          )}
                        </div>
                        <Tag color="gold">{tt("限时活动", "Limited")}</Tag>
                      </Flex>
                      <a href={item.url} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: "block" }}>
                        <Button type="primary" style={{ width: "100%", background: "#fa8c16" }}>
                          {tt("立即参与活动 →", "Join Campaign →")}
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
        <Card className={styles.sectionCard} title={tt("雷达精选折扣与特别计划", "Radar Deals & Special Offers")}>
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
                          {typeof offer.title === "object" ? (offer.title as any)[isZh ? "zh" : "en"] || (offer.title as any).zh || (offer.title as any).en : offer.title}
                        </Text>
                        <Tag color="purple" style={{ marginLeft: 8 }}>{offer.provider}</Tag>
                      </div>
                      <Tag color="green">{tt("特惠", "Deal")}</Tag>
                    </Flex>
                    <Paragraph type="secondary" style={{ fontSize: 12, marginTop: 8 }}>
                      {typeof offer.description === "object" ? (offer.description as any)[isZh ? "zh" : "en"] || (offer.description as any).zh || (offer.description as any).en : offer.description}
                    </Paragraph>
                    <a href={offer.url} target="_blank" rel="noreferrer">
                      <Button style={{ width: "100%" }}>{tt("查看优惠详情 →", "View Details →")}</Button>
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
        <Card className={styles.sectionCard} title={tt("雷达情报与 ELO 评测", "Radar Intel & ELO Leaderboard")}>
          {intelQuery.isLoading ? (
            <PageSkeleton />
          ) : (
            <Table
              rowKey="modelId"
              dataSource={intelQuery.data?.intel?.rankings || []}
              pagination={false}
              columns={[
                { title: tt("排名", "Rank"), dataIndex: "rank", key: "rank", width: 80, render: (r) => <Tag color="gold">#{r}</Tag> },
                { title: tt("提供商", "Provider"), dataIndex: "provider", key: "provider", width: 140 },
                { title: tt("模型 ID", "Model ID"), dataIndex: "modelId", key: "modelId" },
                { title: tt("分类", "Category"), dataIndex: "category", key: "category", render: (c) => <Tag>{c}</Tag> },
                { title: tt("ELO 天梯分", "ELO Rating"), dataIndex: "rating", key: "rating", render: (score) => <Text strong style={{ color: "#8b5cf6" }}>{score}</Text> },
                {
                  title: tt("战绩（胜 / 平 / 负）", "Record (W / D / L)"),
                  key: "record",
                  render: (_, r) =>
                    isZh
                      ? `${r.wins} 胜 / ${r.draws} 平 / ${r.losses} 负 (共 ${r.matches} 场)`
                      : `${r.wins}W / ${r.draws}D / ${r.losses}L (${r.matches} total)`,
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
