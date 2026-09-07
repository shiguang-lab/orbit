import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Button, Card, Flex, Input, Popconfirm, Segmented, Select, Spin, Switch, Table, Tag, Typography, message } from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { settingsApi, type FeatureFlagItem } from "@/entities/api";
import { useI18n } from "@/i18n";
import { getLocalizedCategory, getLocalizedEnum, getLocalizedFlag } from "./feature-flags-i18n";

const { Title, Text, Paragraph } = Typography;

const useStyles = createStyles(({ token }) => ({
  page: { width: "100%", display: "flex", flexDirection: "column", gap: 12 },
  headerCard: { borderRadius: 8, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` },
  sectionCard: { borderRadius: 8, background: token.colorBgContainer, border: `1px solid ${token.colorBorderSecondary}` },
  flagCard: {
    borderRadius: 8,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    transition: "all 0.2s ease",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
      boxShadow: token.boxShadowTertiary,
    },
  },
  flagCardEnabled: {
    borderColor: `${token.colorSuccessBorder} !important`,
  },
}));

function isEnabled(value: string): boolean {
  return ["true", "1", "yes", "on"].includes(value.toLowerCase());
}

function sourceLabel(source: FeatureFlagItem["source"], tt: (zh: string, en: string) => string): string {
  if (source === "db") return tt("数据库覆盖", "Database override");
  if (source === "env") return tt("环境变量", "Environment");
  return tt("默认值", "Default");
}

const CATEGORY_COLORS: Record<string, string> = {
  security: "red",
  network: "blue",
  policies: "orange",
  runtime: "purple",
  cli: "green",
  health: "cyan",
};

export function SettingsFeatureFlagsPage() {
  const { styles } = useStyles();
  const [messageApi, contextHolder] = message.useMessage();
  const { locale, tt } = useI18n();
  const [flags, setFlags] = useState<FeatureFlagItem[]>([]);
  const [summary, setSummary] = useState<{ total: number; active: number; inactive: number; overriddenByDb: number; overriddenByEnv: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [savingKeys, setSavingKeys] = useState<Set<string>>(new Set());
  const [pendingRestartKeys, setPendingRestartKeys] = useState<Set<string>>(new Set());
  const [resettingAll, setResettingAll] = useState(false);

  const [viewMode, setViewMode] = useState<"list" | "card">(() => {
    try {
      const saved = localStorage.getItem("orbiot:settings:flagsView");
      return saved === "list" ? "list" : "card";
    } catch {
      return "card";
    }
  });

  const handleSetViewMode = (mode: "list" | "card") => {
    setViewMode(mode);
    try {
      localStorage.setItem("orbiot:settings:flagsView", mode);
    } catch {
      /* ignore */
    }
  };

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

  const localizedFlags = useMemo(() => {
    return flags.map((flag) => {
      const loc = getLocalizedFlag(flag, locale);
      return {
        ...flag,
        label: loc.label,
        description: loc.description,
      };
    });
  }, [flags, locale]);

  const categories = useMemo(() => Array.from(new Set(flags.map((flag) => flag.category))).sort(), [flags]);

  const filteredFlags = useMemo(() => {
    const query = search.trim().toLowerCase();
    return localizedFlags.filter((flag) => {
      if (category !== "all" && flag.category !== category) return false;
      if (!query) return true;
      return [flag.key, flag.label, flag.description].some((value) => value.toLowerCase().includes(query));
    });
  }, [category, localizedFlags, search]);

  const saveFlag = async (flag: FeatureFlagItem, value?: string) => {
    setSavingKeys((previous) => new Set(previous).add(flag.key));
    try {
      const result = await settingsApi.updateFeatureFlag(flag.key, value);
      setFlags((previous) => previous.map((item) => item.key === flag.key ? { ...item, effectiveValue: result.effectiveValue, source: result.source } : item));
      if (result.requiresRestart) {
        setPendingRestartKeys((prev) => new Set(prev).add(flag.key));
      }
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

  const handleResetAllOverrides = async () => {
    setResettingAll(true);
    try {
      await settingsApi.clearFeatureFlagOverrides();
      messageApi.success(tt("已重置所有数据库覆盖", "All database overrides cleared"));
      await loadFlags();
    } catch (err) {
      messageApi.error(err instanceof Error ? err.message : tt("重置覆盖失败", "Failed to reset overrides"));
    } finally {
      setResettingAll(false);
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
            {flag.category && (
              <Tag color={CATEGORY_COLORS[flag.category] || "default"}>
                {getLocalizedCategory(flag.category, locale)}
              </Tag>
            )}
            {flag.requiresRestart && <Tag color="warning">{tt("需重启", "Restart req.")}</Tag>}
            {flag.warningLevel === "danger" && <Tag color="error">{tt("敏感", "Sensitive")}</Tag>}
            {flag.warningLevel === "caution" && <Tag color="warning">{tt("注意", "Caution")}</Tag>}
          </Flex>
          <div style={{ fontSize: 11, color: "var(--ant-color-text-secondary)", marginTop: 3 }}>
            <code>{flag.key}</code> · {flag.description}
          </div>
        </div>
      ),
    },
    {
      title: tt("来源", "Source"),
      key: "source",
      width: 145,
      render: (_value: unknown, flag: FeatureFlagItem) => (
        <Tag color={flag.source === "db" ? "blue" : flag.source === "env" ? "gold" : "default"}>
          {sourceLabel(flag.source, tt)}
        </Tag>
      ),
    },
    {
      title: tt("当前值", "Value"),
      key: "value",
      width: 170,
      render: (_value: unknown, flag: FeatureFlagItem) => {
        const saving = savingKeys.has(flag.key);
        if (flag.type === "enum") {
          return (
            <Select
              size="small"
              value={flag.effectiveValue}
              loading={saving}
              disabled={saving}
              options={(flag.enumValues ?? []).map((value) => ({
                value,
                label: getLocalizedEnum(value, locale),
              }))}
              onChange={(value: string) => void saveFlag(flag, value)}
              style={{ minWidth: 130 }}
            />
          );
        }
        return (
          <Switch
            size="small"
            checked={isEnabled(flag.effectiveValue)}
            loading={saving}
            disabled={saving}
            onChange={(checked) => void saveFlag(flag, checked ? "true" : "false")}
          />
        );
      },
    },
    {
      title: tt("操作", "Actions"),
      key: "actions",
      width: 110,
      render: (_value: unknown, flag: FeatureFlagItem) => (
        <Button
          type="link"
          size="small"
          disabled={flag.source !== "db" || savingKeys.has(flag.key)}
          loading={savingKeys.has(flag.key)}
          onClick={() => void saveFlag(flag)}
        >
          {tt("恢复默认", "Reset")}
        </Button>
      ),
    },
  ];

  return (
    <div className={styles.page}>
      {contextHolder}
      {/* Header Card */}
      <Card className={styles.headerCard} styles={{ body: { padding: "14px 18px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={12}>
            <div style={{ width: 42, height: 42, borderRadius: 10, background: "rgba(59, 130, 246, 0.12)", color: "#3b82f6", display: "inline-flex", alignItems: "center", justifyContent: "center" }}>
              <MaterialIcon name="flag" size={24} />
            </div>
            <div>
              <Flex align="center" gap={8}>
                <Title level={4} style={{ margin: 0, fontSize: 17 }}>{tt("功能开关", "Feature Flags")}</Title>
                <Tag color="blue">{tt("实时配置", "Live configuration")}</Tag>
              </Flex>
              <Text type="secondary" style={{ fontSize: 12 }}>
                {tt("配置会写入智枢的真实设置接口；数据库覆盖优先于环境变量。", "Changes are saved through Orbit settings API; database overrides take precedence over environment variables.")}
              </Text>
            </div>
          </Flex>

          <Flex align="center" gap={8}>
            {summary && summary.overriddenByDb > 0 && (
              <Popconfirm
                title={tt("确认重置所有数据库覆盖？", "Reset all database overrides?")}
                description={tt(`将重置全部 ${summary.overriddenByDb} 项数据库覆盖，恢复至环境变量或系统默认值。`, `This will reset all ${summary.overriddenByDb} overrides to ENV or default values.`)}
                onConfirm={handleResetAllOverrides}
                okText={tt("重置", "Reset")}
                cancelText={tt("取消", "Cancel")}
              >
                <Button danger size="middle" loading={resettingAll}>
                  {tt("重置所有覆盖", "Reset all overrides")}
                </Button>
              </Popconfirm>
            )}
            <Button icon={<MaterialIcon name="refresh" size={14} />} loading={loading} onClick={() => void loadFlags()}>
              {tt("刷新", "Refresh")}
            </Button>
          </Flex>
        </Flex>
      </Card>

      {/* Summary Chips */}
      {summary && (
        <Flex gap={8} wrap align="center">
          <Tag>{tt(`共 ${summary.total} 个开关`, `${summary.total} flags`)}</Tag>
          <Tag color="green">{tt(`已启用 ${summary.active}`, `${summary.active} enabled`)}</Tag>
          <Tag color="blue">{tt(`数据库覆盖 ${summary.overriddenByDb}`, `${summary.overriddenByDb} DB overrides`)}</Tag>
          <Tag color="gold">{tt(`环境变量 ${summary.overriddenByEnv}`, `${summary.overriddenByEnv} env overrides`)}</Tag>
        </Flex>
      )}

      {/* Pending Restart Warning */}
      {pendingRestartKeys.size > 0 && (
        <Alert
          type="warning"
          showIcon
          message={tt(
            `有 ${pendingRestartKeys.size} 个开关变更需要重启服务后生效`,
            `${pendingRestartKeys.size} changed flag(s) require a service restart to take effect.`
          )}
        />
      )}

      {error && <Alert type="error" showIcon message={error} action={<Button size="small" onClick={() => void loadFlags()}>{tt("重试", "Retry")}</Button>} />}

      {/* Main Section Card */}
      <Card
        title={tt("功能开关列表", "Feature Flags")}
        className={styles.sectionCard}
        size="small"
        extra={
          <Segmented
            value={viewMode}
            onChange={(val) => handleSetViewMode(val as "list" | "card")}
            options={[
              {
                value: "list",
                label: (
                  <Flex align="center" gap={4}>
                    <MaterialIcon name="table_rows" size={14} />
                    <span>{tt("列表", "List")}</span>
                  </Flex>
                ),
              },
              {
                value: "card",
                label: (
                  <Flex align="center" gap={4}>
                    <MaterialIcon name="grid_view" size={14} />
                    <span>{tt("卡片", "Cards")}</span>
                  </Flex>
                ),
              },
            ]}
          />
        }
      >
        {/* Search and Category Filter */}
        <Flex gap={8} style={{ marginBottom: 16 }} wrap justify="space-between" align="center">
          <Flex gap={8} wrap flex={1}>
            <Input.Search
              allowClear
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={tt("搜索标识、名称或描述", "Search key, name, or description")}
              style={{ maxWidth: 360 }}
            />
            <Select
              value={category}
              onChange={setCategory}
              options={[
                { value: "all", label: tt("全部分类", "All categories") },
                ...categories.map((value) => ({
                  value,
                  label: getLocalizedCategory(value, locale),
                })),
              ]}
              style={{ minWidth: 150 }}
            />
          </Flex>
        </Flex>

        {loading && flags.length === 0 ? (
          <Flex justify="center" style={{ padding: 36 }}><Spin /></Flex>
        ) : viewMode === "list" ? (
          /* ================= Table List View ================= */
          <Table<FeatureFlagItem>
            rowKey="key"
            size="small"
            pagination={{ pageSize: 20, showSizeChanger: false }}
            dataSource={filteredFlags}
            columns={columns}
            locale={{ emptyText: tt("没有匹配的功能开关", "No matching feature flags") }}
          />
        ) : (
          /* ================= Card Grid View ================= */
          filteredFlags.length === 0 ? (
            <Flex justify="center" style={{ padding: 36 }}>
              <Text type="secondary">{tt("没有匹配的功能开关", "No matching feature flags")}</Text>
            </Flex>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                gap: 12,
              }}
            >
              {filteredFlags.map((flag) => {
                const saving = savingKeys.has(flag.key);
                const enabled = flag.type === "boolean" ? isEnabled(flag.effectiveValue) : false;
                return (
                  <Card
                    key={flag.key}
                    size="small"
                    className={`${styles.flagCard} ${enabled ? styles.flagCardEnabled : ""}`}
                    styles={{ body: { padding: "12px 14px", height: "100%", display: "flex", flexDirection: "column" } }}
                  >
                    {/* Top row: category badge + toggle/select */}
                    <Flex justify="space-between" align="center" style={{ marginBottom: 8 }}>
                      <Tag color={CATEGORY_COLORS[flag.category] || "default"} style={{ margin: 0 }}>
                        {getLocalizedCategory(flag.category, locale)}
                      </Tag>

                      <Flex align="center" gap={6}>
                        {flag.type === "enum" ? (
                          <Select
                            size="small"
                            value={flag.effectiveValue}
                            loading={saving}
                            disabled={saving}
                            options={(flag.enumValues ?? []).map((value) => ({
                              value,
                              label: getLocalizedEnum(value, locale),
                            }))}
                            onChange={(value: string) => void saveFlag(flag, value)}
                            style={{ minWidth: 100 }}
                          />
                        ) : (
                          <Switch
                            size="small"
                            checked={enabled}
                            loading={saving}
                            disabled={saving}
                            onChange={(checked) => void saveFlag(flag, checked ? "true" : "false")}
                          />
                        )}
                      </Flex>
                    </Flex>

                    {/* Middle: Title, Key, and Description */}
                    <div style={{ flex: 1, marginBottom: 10 }}>
                      <Flex align="center" gap={6} wrap style={{ marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 13 }}>{flag.label}</Text>
                        {flag.requiresRestart && (
                          <Tag color="warning" style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px" }}>
                            {tt("需重启", "Restart req.")}
                          </Tag>
                        )}
                        {flag.warningLevel === "danger" && (
                          <Tag color="error" style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px" }}>
                            {tt("敏感", "Sensitive")}
                          </Tag>
                        )}
                        {flag.warningLevel === "caution" && (
                          <Tag color="warning" style={{ fontSize: 10, padding: "0 4px", lineHeight: "16px" }}>
                            {tt("注意", "Caution")}
                          </Tag>
                        )}
                      </Flex>

                      <div style={{ fontSize: 11, fontFamily: "monospace", color: "var(--ant-color-text-secondary)", marginBottom: 4 }}>
                        {flag.key}
                      </div>

                      <Paragraph
                        type="secondary"
                        ellipsis={{ rows: 2, tooltip: flag.description }}
                        style={{ fontSize: 12, marginBottom: 0, lineHeight: 1.4 }}
                      >
                        {flag.description}
                      </Paragraph>
                    </div>

                    {/* Bottom: Source tag + Reset button */}
                    <Flex justify="space-between" align="center" style={{ paddingTop: 8, borderTop: "1px solid var(--ant-color-border-secondary)" }}>
                      <Tag
                        color={flag.source === "db" ? "blue" : flag.source === "env" ? "gold" : "default"}
                        style={{ margin: 0, fontSize: 11 }}
                      >
                        {sourceLabel(flag.source, tt)}
                      </Tag>

                      {flag.source === "db" && (
                        <Button
                          type="link"
                          size="small"
                          disabled={saving}
                          loading={saving}
                          onClick={() => void saveFlag(flag)}
                          style={{ padding: 0, height: "auto", fontSize: 11 }}
                        >
                          {tt("恢复默认", "Reset")}
                        </Button>
                      )}
                    </Flex>
                  </Card>
                );
              })}
            </div>
          )
        )}
      </Card>
    </div>
  );
}

export default SettingsFeatureFlagsPage;
