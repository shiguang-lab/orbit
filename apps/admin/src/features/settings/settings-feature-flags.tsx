import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Flex, Input, Select, Spin, Switch, Table, Tag, Typography, message } from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { settingsApi, type FeatureFlagItem } from "@/entities/api";
import { useI18n } from "@/i18n";

const { Title, Text } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: { width: "100%", display: "flex", flexDirection: "column", gap: 12 },
  headerCard: { borderRadius: 10, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` },
  sectionCard: { borderRadius: 10, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` },
}));

function isEnabled(value: string): boolean {
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

function sourceLabel(source: FeatureFlagItem["source"], tt: (zh: string, en: string) => string): string {
  if (source === "db") return tt("数据库覆盖", "Database override");
  if (source === "env") return tt("环境变量", "Environment");
  return tt("默认值", "Default");
}

export function SettingsFeatureFlagsPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const { tt } = useI18n();
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [summary, setSummary] = useState<{ total: number; active: number; inactive: number; overriddenByDb: number; overriddenByEnv: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());

  const loadFlags = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await settingsApi.featureFlags();
      setFlags(result.flags ?? []);
      setSummary(result.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : tt("读取功能开关失败", "Failed to load feature flags"));
    } finally {
      setLoading(false);
    }
  }, [tt]);

  useEffect(() => { void loadFlags(); }, [loadFlags]);

  const categories = useMemo(() => Array.from(new Set(flags.map((flag) => flag.category))).sort(), [flags]);
  const filteredFlags = useMemo(() => {
    const query = search.trim().toLowerCase();
    return flags.filter((flag) => {
      if (category !== "all" && flag.category !== category) return false;
      if (!query) return true;
      return [flag.key, flag.label, flag.description].some((value) => value.toLowerCase().includes(query));
    });
  }, [category, flags, search]);

  const saveFlag = async (flag: FeatureFlagItem, value?: string) => {
    setSavingKeys((previous) => new Set(previous).add(flag.key));
    try {
      const result = await settingsApi.updateFeatureFlag(flag.key, value);
      setFlags((previous) => previous.map((item) => item.key === flag.key ? { ...item, effectiveValue: result.effectiveValue, source: result.source } : item));
      messageApi.success(result.requiresRestart
        ? tt("该开关将在服务重启后生效", "This flag takes effect after a service restart")
        : tt("功能开关已更新", "Feature flag updated"));
      await loadFlags();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : tt("更新功能开关失败", "Failed to update feature flag"));
    } finally {
      setSavingKeys((previous) => { const next = new Set(previous); next.delete(flag.key); return next; });
    }
  };

  const columns = [
    {
      title: tt("特性标识与描述", "Feature & Description"),
      key: "feature",
      render: (_value: unknown, flag: FeatureFlagItem) => (
        <div>
          <Flex align="center" gap={8}>
            <Text strong>{flag.label}</Text>
            {flag.warningLevel === "danger" && <Tag color="error">{tt("敏感", "Sensitive")}</Tag>}
          </Flex>
          <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 3 }}><code>{flag.key}</code> · {flag.description}</div>
        </div>
      ),
    },
    {
      title: tt("来源", "Source"),
      key: "source",
      width: 145,
      render: (_value: unknown, flag: FeatureFlagItem) => <Tag color={flag.source === "db" ? "blue" : flag.source === "env" ? "gold" : "default"}>{sourceLabel(flag.source, tt)}</Tag>,
    },
    {
      title: tt("当前值", "Value"),
      key: "value",
      width: 170,
      render: (_value: unknown, flag: FeatureFlagItem) => {
        const saving = savingKeys.has(flag.key);
        if (flag.type === "enum") {
          return <Select size="small" value={flag.effectiveValue} loading={saving} disabled={saving} options={(flag.enumValues ?? []).map((value) => ({ value, label: value }))} onChange={(value: string) => void saveFlag(flag, value)} style={{ minWidth: 130 }} />;
        }
        return <Switch size="small" checked={isEnabled(flag.effectiveValue)} loading={saving} disabled={saving} onChange={(checked) => void saveFlag(flag, checked ? "true" : "false")} />;
      },
    },
    {
      title: tt("操作", "Actions"),
      key: "actions",
      width: 110,
      render: (_value: unknown, flag: FeatureFlagItem) => <Button type="link" size="small" disabled={flag.source !== "db" || savingKeys.has(flag.key)} loading={savingKeys.has(flag.key)} onClick={() => void saveFlag(flag)}>{tt("恢复默认", "Reset")}</Button>,
    },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><MaterialIcon name="flag" size={24} /></div>
            <div>
              <Flex align="center" gap={8}><Title level={4} style={{ margin: 0, fontSize: 17 }}>{tt("功能开关", "Feature Flags")}</Title><Tag color="blue">{tt("实时配置", "Live configuration")}</Tag></Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>{tt("配置会写入 Orbit 的真实设置接口；数据库覆盖优先于环境变量。", "Changes are saved through Orbit's settings API; database overrides take precedence over environment variables.")}</Text>
            </div>
          </Flex>
          <Button icon={<MaterialIcon name="refresh" size={14} />} loading={loading} onClick={() => void loadFlags()}>{tt("刷新", "Refresh")}</Button>
        </Flex>
      </Card>
      {summary && <Flex gap={8} wrap><Tag>{tt(`共 ${summary.total} 个开关`, `${summary.total} flags`)}</Tag><Tag color="green">{tt(`已启用 ${summary.active}`, `${summary.active} enabled`)}</Tag><Tag color="blue">{tt(`数据库覆盖 ${summary.overriddenByDb}`, `${summary.overriddenByDb} DB overrides`)}</Tag><Tag color="gold">{tt(`环境变量 ${summary.overriddenByEnv}`, `${summary.overriddenByEnv} env overrides`)}</Tag></Flex>}
      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void loadFlags()}>{tt("重试", "Retry")}</Button>} />}
      <Card title={tt("功能开关列表", "Feature Flags")} className={styles.sectionCard} size="small">
        <Flex gap={8} style={{ marginBottom: 12 }} wrap>
          <Input.Search allowClear value={search} onChange={(event) => setSearch(event.target.value)} placeholder={tt("搜索标识、名称或描述", "Search key, name, or description")} style={{ maxWidth: 360 }} />
          <Select value={category} onChange={setCategory} options={[{ value: "all", label: tt("全部分类", "All categories") }, ...categories.map((value) => ({ value, label: value }))]} style={{ minWidth: 150 }} />
        </Flex>
        {loading && flags.length === 0 ? <Flex justify="center" style={{ padding: 36 }}><Spin /></Flex> : <Table<FeatureFlagItem> rowKey="key" size="small" pagination={{ pageSize: 20, showSizeChanger: false }} dataSource={filteredFlags} columns={columns} locale={{ emptyText: tt("没有匹配的功能开关", "No matching feature flags") }} />}
      </Card>
    </div>
  );
}

export default SettingsFeatureFlagsPage;
