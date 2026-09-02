import { useState, useMemo } from "react";
import {
  Card,
  Input,
  Button,
  Segmented,
  Checkbox,
  Tag,
  Typography,
  Tooltip,
  Popconfirm,
  Empty,
  Spin,
  Switch,
  Space,
} from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";
import { ModelCompatPopover, type ModelCompatData } from "./ModelCompatPopover";

const useStyles = createStyles(({ token }) => ({
  sectionCard: {
    marginBottom: 0,
    borderRadius: token.borderRadiusLG,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  topActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    padding: "12px 14px",
    background: token.colorFillAlter,
    borderRadius: token.borderRadius,
    marginBottom: 16,
  },
  toolbarFilters: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 10,
  },
  toolbarActions: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  modelGridCards: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
    gap: 12,
  },
  modelCard: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    gap: 10,
    padding: "12px 14px",
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "all 0.2s ease",
    minHeight: 112,
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
      boxShadow: token.boxShadowTertiary,
    },
  },
  modelCardHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  modelCardTitle: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    minWidth: 0,
    flex: 1,
  },
  modelCardBadges: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  modelCardBody: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    minHeight: 24,
  },
  modelCardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    paddingTop: 8,
    marginTop: 2,
  },
  modelGrid: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  modelRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    padding: "10px 14px",
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    transition: "all 0.2s ease",
    "&:hover": {
      borderColor: token.colorPrimaryBorder,
      background: token.colorFillQuaternary,
    },
  },
  modelHidden: {
    opacity: 0.55,
    background: token.colorFillAlter,
  },
  modelInfo: {
    display: "flex",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
    flex: "1 1 auto",
  },
  modelId: {
    fontFamily: "monospace",
    fontSize: 13,
    fontWeight: 500,
  },
  modelActions: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    flex: "0 0 auto",
  },
  aliasInput: {
    width: 140,
    height: 24,
    fontSize: 12,
  },
  aliasTag: {
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: 4,
  },
  clickableText: {
    cursor: "pointer",
    color: token.colorTextDescription,
    fontSize: 12,
    "&:hover": {
      color: token.colorPrimary,
    },
  },
}));

export interface ModelRowItem {
  id: string;
  name?: string;
  source?: "system" | "custom" | "imported" | "fallback" | "alias";
  isFree?: boolean;
  isHidden?: boolean;
  compat?: ModelCompatData;
  latencyMs?: number;
  testStatus?: "ok" | "error" | "quota";
}

interface Props {
  providerId: string;
  providerDisplayAlias: string;
  models: ModelRowItem[];
  modelAliases: Record<string, string>;
  allowModelImport?: boolean;
  autoFetchModels?: boolean;
  onToggleAutoFetchModels?: (enabled: boolean) => Promise<void>;
  autoSync?: boolean;
  onToggleAutoSync?: (enabled: boolean) => Promise<void>;
  onImportModels?: () => Promise<void>;
  importingModels?: boolean;
  onClearAllModels?: () => Promise<void>;
  clearingModels?: boolean;
  onSetAlias: (modelId: string, alias: string) => Promise<void>;
  onDeleteAlias: (alias: string) => Promise<void>;
  onToggleModelHidden: (modelId: string, hidden: boolean) => Promise<void>;
  onSaveModelCompat: (modelId: string, patch: ModelCompatData) => Promise<void>;
  onTestModel: (modelId: string, fullModel: string) => Promise<void>;
  testingModelId: string | null;
  onTestAll: (targets: Array<{ modelId: string; fullModel: string }>, autoHideFailed?: boolean) => Promise<void>;
  testingAll: boolean;
  testProgress: { done: number; total: number } | null;
}

export function ProviderModelsSection({
  providerId,
  providerDisplayAlias,
  models,
  modelAliases,
  allowModelImport = false,
  autoFetchModels = false,
  onToggleAutoFetchModels,
  autoSync = false,
  onToggleAutoSync,
  onImportModels,
  importingModels = false,
  onClearAllModels,
  clearingModels = false,
  onSetAlias,
  onDeleteAlias,
  onToggleModelHidden,
  onSaveModelCompat,
  onTestModel,
  testingModelId,
  onTestAll,
  testingAll,
  testProgress,
}: Props) {
  const { styles } = useStyles();
  const { t } = useI18n();

  // Search & Filters
  const [filterText, setFilterText] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<"all" | "visible" | "hidden">("all");
  const [freeFilter, setFreeFilter] = useState<"all" | "free" | "paid">("all");
  const [sortFreeFirst, setSortFreeFirst] = useState(false);
  const [autoHideFailed, setAutoHideFailed] = useState(false);

  // View mode: card grid vs full-width list (defaults to card)
  const [viewMode, setViewMode] = useState<"card" | "list">(() => {
    try {
      const saved = localStorage.getItem("omniroute_provider_models_view");
      if (saved === "card" || saved === "list") return saved;
    } catch {}
    return "card";
  });

  const handleViewModeChange = (next: "card" | "list") => {
    setViewMode(next);
    try {
      localStorage.setItem("omniroute_provider_models_view", next);
    } catch {}
  };

  // Inline alias editing
  const [editingAliasModelId, setEditingAliasModelId] = useState<string | null>(null);
  const [aliasDraft, setAliasDraft] = useState("");

  // Map of modelId -> alias
  const aliasByModelId = useMemo(() => {
    const map: Record<string, string> = {};
    const prefixes = [
      `${providerDisplayAlias}/`,
      `${providerId}/`,
    ];
    for (const [alias, fullModel] of Object.entries(modelAliases)) {
      if (typeof fullModel !== "string") continue;
      const trimmedAlias = alias.trim();
      let matchedModelId: string | null = null;
      for (const prefix of prefixes) {
        if (fullModel.startsWith(prefix)) {
          matchedModelId = fullModel.slice(prefix.length);
          break;
        }
      }
      if (!matchedModelId && models.some((m) => m.id === fullModel)) {
        matchedModelId = fullModel;
      }
      if (matchedModelId && trimmedAlias && trimmedAlias !== matchedModelId) {
        map[matchedModelId] = trimmedAlias;
      }
    }
    return map;
  }, [modelAliases, providerDisplayAlias, providerId, models]);

  // Filtered & Sorted models
  const displayedModels = useMemo(() => {
    let result = [...models];

    // Search query
    const query = filterText.trim().toLowerCase();
    if (query) {
      result = result.filter((m) => {
        const idMatch = m.id.toLowerCase().includes(query);
        const nameMatch = m.name?.toLowerCase().includes(query) ?? false;
        const alias = aliasByModelId[m.id]?.toLowerCase() ?? "";
        const aliasMatch = alias.includes(query);
        const source = m.source?.toLowerCase() ?? "";
        const sourceMatch =
          source.includes(query) ||
          (source === "system" && ("built-in".includes(query) || "内置".includes(query))) ||
          (source === "imported" && ("imported".includes(query) || "导入".includes(query)));
        return idMatch || nameMatch || aliasMatch || sourceMatch;
      });
    }

    // Visibility filter
    if (visibilityFilter === "visible") {
      result = result.filter((m) => !m.isHidden);
    } else if (visibilityFilter === "hidden") {
      result = result.filter((m) => m.isHidden);
    }

    // Free filter
    if (freeFilter === "free") {
      result = result.filter((m) => m.isFree);
    } else if (freeFilter === "paid") {
      result = result.filter((m) => !m.isFree);
    }

    // Sort free first
    if (sortFreeFirst) {
      result.sort((a, b) => {
        if (a.isFree && !b.isFree) return -1;
        if (!a.isFree && b.isFree) return 1;
        return a.id.localeCompare(b.id);
      });
    }

    return result;
  }, [models, filterText, visibilityFilter, freeFilter, sortFreeFirst, aliasByModelId]);

  const activeCount = useMemo(() => models.filter((m) => !m.isHidden).length, [models]);
  const totalCount = models.length;

  const handleTestAllClick = async () => {
    const targets = displayedModels
      .filter((m) => !m.isHidden)
      .map((m) => ({ modelId: m.id, fullModel: `${providerDisplayAlias}/${m.id}` }));
    await onTestAll(targets, autoHideFailed);
    if (autoHideFailed) {
      setVisibilityFilter("visible");
    }
  };

  const handleSaveAlias = (modelId: string) => {
    const trimmed = aliasDraft.trim();
    if (trimmed) {
      onSetAlias(modelId, trimmed);
    } else {
      const currentAlias = aliasByModelId[modelId];
      if (currentAlias) {
        onDeleteAlias(currentAlias);
      }
    }
    setEditingAliasModelId(null);
  };

  const handleStartEditAlias = (modelId: string, currentAlias: string) => {
    setEditingAliasModelId(modelId);
    setAliasDraft(currentAlias);
  };

  const renderSourceTag = (source?: string) => {
    switch (source) {
      case "imported":
        return (
          <Tooltip title={t("providers.importedDesc", "动态导入模型：通过 API Key / 端点从上游提供商实时拉取发现的模型")}>
            <Tag color="cyan" bordered={false} style={{ fontSize: 11, fontWeight: 500 }}>
              {t("providers.imported", "导入")}
            </Tag>
          </Tooltip>
        );
      case "custom":
        return (
          <Tooltip title={t("providers.customDesc", "自定义模型：用户手动添加或覆盖参数配置的模型")}>
            <Tag color="green" bordered={false} style={{ fontSize: 11, fontWeight: 500 }}>
              {t("providers.custom", "自定义")}
            </Tag>
          </Tooltip>
        );
      case "fallback":
        return (
          <Tooltip title={t("providers.fallbackDesc", "兜底模型：动态接口不可用时启用的备选模型")}>
            <Tag color="orange" bordered={false} style={{ fontSize: 11, fontWeight: 500 }}>
              {t("providers.fallback", "兜底")}
            </Tag>
          </Tooltip>
        );
      case "system":
      default:
        return (
          <Tooltip title={t("providers.systemDesc", "系统内置模型：网关内置的标准静态模型名录，开箱即用")}>
            <Tag color="geekblue" bordered={false} style={{ fontSize: 11, fontWeight: 500 }}>
              {t("providers.system", "内置")}
            </Tag>
          </Tooltip>
        );
    }
  };

  return (
    <Card className={styles.sectionCard}>
      {/* Header Row */}
      <div className={styles.headerRow}>
        <div className={styles.headerTitle}>
          <MaterialIcon name="smart_toy" size={20} />
          <span>{t("providers.availableModels", "可用模型")}</span>
          <Tag color="default" style={{ fontWeight: 500 }}>
            {totalCount}
          </Tag>
        </div>

        <div className={styles.topActions}>
          {onToggleAutoFetchModels && (
            <Space size={8} align="center" style={{ marginRight: 8 }}>
              <span style={{ fontSize: 13, color: "var(--ant-color-text-secondary)" }}>
                {t("providers.autoFetchModels", "自动获取模型")}
              </span>
              <Switch
                checked={autoFetchModels}
                onChange={(checked) => onToggleAutoFetchModels(checked)}
              />
            </Space>
          )}

          {allowModelImport && onToggleAutoSync && (
            <Space size={8} align="center" style={{ marginRight: 8 }}>
              <span style={{ fontSize: 13, color: "var(--ant-color-text-secondary)" }}>
                {t("providers.autoSync", "自动同步")}
              </span>
              <Switch
                checked={autoSync}
                onChange={(checked) => onToggleAutoSync(checked)}
              />
            </Space>
          )}

          {allowModelImport && onImportModels && (
            <Button
              type="dashed"
              loading={importingModels}
              icon={<MaterialIcon name="download" size={16} />}
              onClick={() => onImportModels()}
            >
              {t("providers.importModels", "从 /models 导入")}
            </Button>
          )}

          {onClearAllModels && (
            <Popconfirm
              title={t("providers.clearAllModelsConfirm", "确定清空此提供者的所有模型及别名？")}
              onConfirm={onClearAllModels}
              okText={t("common.confirm", "确定")}
              cancelText={t("common.cancel", "取消")}
              okButtonProps={{ danger: true }}
            >
              <Button
                danger
                loading={clearingModels}
                icon={<MaterialIcon name="delete_sweep" size={16} />}
              >
                {t("providers.clearAllModels", "清空模型")}
              </Button>
            </Popconfirm>
          )}
        </div>
      </div>

      {/* Model Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolbarFilters}>
          <Input
            allowClear
            placeholder={t("providers.searchModels", "搜索模型名称、ID 或别名...")}
            prefix={<MaterialIcon name="search" size={16} />}
            value={filterText}
            onChange={(e) => setFilterText(e.target.value)}
            style={{ width: 240 }}
          />

          <Segmented
            value={visibilityFilter}
            onChange={(v) => setVisibilityFilter(v as any)}
            options={[
              { label: t("common.all", "全部"), value: "all" },
              { label: t("providers.visible", "仅显示"), value: "visible" },
              { label: t("providers.hidden", "仅隐藏"), value: "hidden" },
            ]}
          />

          <Segmented
            value={freeFilter}
            onChange={(v) => setFreeFilter(v as any)}
            options={[
              { label: t("common.all", "全部"), value: "all" },
              { label: t("providers.free", "免费"), value: "free" },
              { label: t("providers.paid", "付费"), value: "paid" },
            ]}
          />

          <Button
            type={sortFreeFirst ? "primary" : "default"}
            icon={<MaterialIcon name="sort" size={16} />}
            onClick={() => setSortFreeFirst(!sortFreeFirst)}
          >
            {t("providers.sortFreeFirst", "免费优先")}
          </Button>

          <Checkbox
            checked={autoHideFailed}
            onChange={(e) => setAutoHideFailed(e.target.checked)}
          >
            {t("providers.autoHideFailed", "自动隐藏失败项")}
          </Checkbox>
        </div>

        <div className={styles.toolbarActions}>
          <Button
            type="primary"
            loading={testingAll}
            icon={<MaterialIcon name="play_arrow" size={16} />}
            onClick={handleTestAllClick}
          >
            {testingAll && testProgress
              ? `${t("providers.testing", "测试中")} ${testProgress.done}/${testProgress.total}`
              : t("providers.testAllModels", "测试全部")}
          </Button>

          <Segmented
            value={viewMode}
            onChange={(v) => handleViewModeChange(v as "card" | "list")}
            options={[
              {
                value: "card",
                label: (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MaterialIcon name="grid_view" size={14} />
                    <span>{t("common.cards", "卡片")}</span>
                  </span>
                ),
              },
              {
                value: "list",
                label: (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <MaterialIcon name="view_list" size={14} />
                    <span>{t("common.list", "列表")}</span>
                  </span>
                ),
              },
            ]}
          />

          <Tag color="blue" bordered={false} style={{ marginInlineEnd: 0, padding: "4px 8px", fontSize: 13 }}>
            {t("providers.modelsActiveCount", { active: activeCount, total: totalCount })}
          </Tag>
        </div>
      </div>

      {/* Models List or Cards */}
      {displayedModels.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            filterText
              ? t("providers.noModelsMatch", `没有匹配 "${filterText}" 的模型`)
              : t("providers.noModelsYet", "暂无可用的模型")
          }
        />
      ) : viewMode === "card" ? (
        <div className={styles.modelGridCards}>
          {displayedModels.map((model) => {
            const alias = aliasByModelId[model.id] || "";
            const isEditingAlias = editingAliasModelId === model.id;
            const fullModelName = `${providerDisplayAlias}/${model.id}`;
            const isTestingThis = testingModelId === model.id;

            const hasNormalize = Boolean(model.compat?.normalizeToolCallId);
            const hasPreserveDev = Boolean(model.compat?.preserveOpenAIDeveloperRole);
            const hasHeaders = Boolean(
              model.compat?.upstreamHeaders && Object.keys(model.compat.upstreamHeaders).length > 0
            );

            return (
              <div
                key={model.id}
                className={`${styles.modelCard} ${model.isHidden ? styles.modelHidden : ""}`}
              >
                {/* Card Top: ID and Badges */}
                <div className={styles.modelCardHeader}>
                  <div className={styles.modelCardTitle}>
                    <MaterialIcon
                      name={model.isHidden ? "visibility_off" : "smart_toy"}
                      size={18}
                      style={{ color: model.isHidden ? "#aaa" : "var(--ant-color-primary)", flexShrink: 0 }}
                    />
                    <Typography.Text
                      className={styles.modelId}
                      copyable={{ text: fullModelName }}
                      ellipsis={{ tooltip: model.name && model.name !== model.id ? `${fullModelName} (${model.name})` : fullModelName }}
                    >
                      {fullModelName}
                    </Typography.Text>
                  </div>

                  <div className={styles.modelCardBadges}>
                    {renderSourceTag(model.source)}
                    {model.isFree && (
                      <Tag color="success" bordered={false} style={{ marginInlineEnd: 0, fontWeight: 600 }}>
                        {t("providers.free", "免费")}
                      </Tag>
                    )}
                  </div>
                </div>

                {/* Card Middle: Alias & Compat badges */}
                <div className={styles.modelCardBody}>
                  {isEditingAlias ? (
                    <Input
                      size="small"
                      autoFocus
                      className={styles.aliasInput}
                      placeholder={t("providers.aliasInputPlaceholder", "别名")}
                      value={aliasDraft}
                      onChange={(e) => setAliasDraft(e.target.value)}
                      onPressEnter={() => handleSaveAlias(model.id)}
                      onBlur={() => handleSaveAlias(model.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingAliasModelId(null);
                      }}
                    />
                  ) : alias ? (
                    <Tooltip title={t("providers.clickToEditAlias", { alias })}>
                      <Tag
                        color="purple"
                        className={styles.aliasTag}
                        onClick={() => handleStartEditAlias(model.id, alias)}
                      >
                        <MaterialIcon name="sell" size={12} />
                        <span>{alias}</span>
                      </Tag>
                    </Tooltip>
                  ) : model.name && model.name !== model.id ? (
                    <Tooltip title={t("providers.modelNameClickToSetAlias", { name: model.name })}>
                      <Tag
                        bordered={false}
                        style={{
                          cursor: "pointer",
                          maxWidth: 160,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          background: "var(--ant-color-fill-tertiary, rgba(0,0,0,0.04))",
                          color: "var(--ant-color-text-secondary)",
                          fontStyle: "italic",
                          fontSize: 12,
                        }}
                        onClick={() => handleStartEditAlias(model.id, "")}
                      >
                        <span>{model.name}</span>
                      </Tag>
                    </Tooltip>
                  ) : (
                    <span
                      className={styles.clickableText}
                      onClick={() => handleStartEditAlias(model.id, "")}
                    >
                      + {t("providers.clickToSetAlias", "设置别名")}
                    </span>
                  )}

                  {hasNormalize && (
                    <Tooltip title="9位 ToolCall ID 规整已启用">
                      <Tag color="geekblue" bordered={false} style={{ marginInlineEnd: 0 }}>
                        ID×9
                      </Tag>
                    </Tooltip>
                  )}
                  {hasPreserveDev && (
                    <Tooltip title="保留 OpenAI Developer 角色">
                      <Tag color="volcano" bordered={false} style={{ marginInlineEnd: 0 }}>
                        {t("providers.compatBadgeNoPreserve", "不保留")}
                      </Tag>
                    </Tooltip>
                  )}
                  {hasHeaders && (
                    <Tooltip title="已配置自定义上游请求头">
                      <Tag color="cyan" bordered={false} style={{ marginInlineEnd: 0 }}>
                        {t("providers.compatBadgeUpstreamHeaders", "请求头")}
                      </Tag>
                    </Tooltip>
                  )}
                </div>

                {/* Card Bottom: Test Button & Actions */}
                <div className={styles.modelCardFooter}>
                  <div>
                    {isTestingThis ? (
                      <Spin size="small" style={{ marginInline: 8 }} />
                    ) : (
                      <Tooltip
                        title={
                          model.testStatus === "ok"
                            ? `测试通过 (${model.latencyMs || 0}ms)`
                            : model.testStatus === "quota"
                            ? "配额超限"
                            : model.testStatus === "error"
                            ? "测试失败"
                            : t("providers.testModel", "测试此模型")
                        }
                      >
                        <Button
                          size="small"
                          type="text"
                          onClick={() => onTestModel(model.id, fullModelName)}
                          icon={
                            model.testStatus === "ok" ? (
                              <MaterialIcon name="check_circle" size={18} style={{ color: "#52c41a" }} />
                            ) : model.testStatus === "quota" ? (
                              <MaterialIcon name="warning" size={18} style={{ color: "#faad14" }} />
                            ) : model.testStatus === "error" ? (
                              <MaterialIcon name="cancel" size={18} style={{ color: "#ff4d4f" }} />
                            ) : (
                              <MaterialIcon name="play_circle" size={18} />
                            )
                          }
                          style={{ paddingInline: 4, height: 24, fontSize: 12 }}
                        >
                          {model.latencyMs && model.testStatus === "ok" ? (
                            <span style={{ fontSize: 11, color: "var(--ant-color-success)" }}>
                              {model.latencyMs}ms
                            </span>
                          ) : null}
                        </Button>
                      </Tooltip>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <ModelCompatPopover
                      modelId={model.id}
                      compat={model.compat}
                      onSave={(patch) => onSaveModelCompat(model.id, patch)}
                    />

                    <Tooltip
                      title={
                        model.isHidden
                          ? t("providers.enableModel", "取消隐藏此模型")
                          : t("providers.hideModel", "隐藏此模型")
                      }
                    >
                      <Button
                        size="small"
                        type="text"
                        icon={
                          <MaterialIcon
                            name={model.isHidden ? "visibility_off" : "visibility"}
                            size={18}
                            style={{ color: model.isHidden ? "#bbb" : undefined }}
                          />
                        }
                        onClick={() => onToggleModelHidden(model.id, !model.isHidden)}
                      />
                    </Tooltip>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className={styles.modelGrid}>
          {displayedModels.map((model) => {
            const alias = aliasByModelId[model.id] || "";
            const isEditingAlias = editingAliasModelId === model.id;
            const fullModelName = `${providerDisplayAlias}/${model.id}`;
            const isTestingThis = testingModelId === model.id;

            // Compat badges
            const hasNormalize = Boolean(model.compat?.normalizeToolCallId);
            const hasPreserveDev = Boolean(model.compat?.preserveOpenAIDeveloperRole);
            const hasHeaders = Boolean(
              model.compat?.upstreamHeaders && Object.keys(model.compat.upstreamHeaders).length > 0
            );

            return (
              <div
                key={model.id}
                className={`${styles.modelRow} ${model.isHidden ? styles.modelHidden : ""}`}
              >
                {/* Left Info */}
                <div className={styles.modelInfo}>
                  <MaterialIcon
                    name={model.isHidden ? "visibility_off" : "smart_toy"}
                    size={18}
                    style={{ color: model.isHidden ? "#aaa" : "var(--ant-color-primary)" }}
                  />

                  <Typography.Text className={styles.modelId} copyable={{ text: fullModelName }}>
                    {fullModelName}
                  </Typography.Text>

                  {model.name && model.name !== model.id && (
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      ({model.name})
                    </Typography.Text>
                  )}

                  {renderSourceTag(model.source)}

                  {model.isFree && (
                    <Tag color="success" bordered={false} style={{ fontWeight: 600 }}>
                      {t("providers.free", "免费")}
                    </Tag>
                  )}

                  {/* Inline Alias */}
                  {isEditingAlias ? (
                    <Input
                      size="small"
                      autoFocus
                      className={styles.aliasInput}
                      placeholder={t("providers.aliasInputPlaceholder", "别名")}
                      value={aliasDraft}
                      onChange={(e) => setAliasDraft(e.target.value)}
                      onPressEnter={() => handleSaveAlias(model.id)}
                      onBlur={() => handleSaveAlias(model.id)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") setEditingAliasModelId(null);
                      }}
                    />
                  ) : alias ? (
                    <Tooltip title={t("providers.clickToEditAlias", { alias })}>
                      <Tag
                        color="purple"
                        className={styles.aliasTag}
                        onClick={() => handleStartEditAlias(model.id, alias)}
                      >
                        <MaterialIcon name="sell" size={12} />
                        <span>{alias}</span>
                      </Tag>
                    </Tooltip>
                  ) : (
                    <span
                      className={styles.clickableText}
                      onClick={() => handleStartEditAlias(model.id, "")}
                    >
                      + {t("providers.clickToSetAlias", "设置别名")}
                    </span>
                  )}

                  {/* Compat Badges */}
                  {hasNormalize && (
                    <Tag color="geekblue" bordered={false}>
                      ID×9
                    </Tag>
                  )}
                  {hasPreserveDev && (
                    <Tag color="volcano" bordered={false}>
                      {t("providers.compatBadgeNoPreserve", "不保留")}
                    </Tag>
                  )}
                  {hasHeaders && (
                    <Tag color="cyan" bordered={false}>
                      {t("providers.compatBadgeUpstreamHeaders", "请求头")}
                    </Tag>
                  )}
                </div>

                {/* Right Actions */}
                <div className={styles.modelActions}>
                  {/* Test Status / Button */}
                  {isTestingThis ? (
                    <Spin size="small" style={{ marginInline: 8 }} />
                  ) : (
                    <Tooltip
                      title={
                        model.testStatus === "ok"
                          ? `测试通过 (${model.latencyMs || 0}ms)`
                          : model.testStatus === "quota"
                          ? "配额超限"
                          : model.testStatus === "error"
                          ? "测试失败"
                          : t("providers.testModel", "测试此模型")
                      }
                    >
                      <Button
                        size="small"
                        type="text"
                        onClick={() => onTestModel(model.id, fullModelName)}
                        icon={
                          model.testStatus === "ok" ? (
                            <MaterialIcon name="check_circle" size={18} style={{ color: "#52c41a" }} />
                          ) : model.testStatus === "quota" ? (
                            <MaterialIcon name="warning" size={18} style={{ color: "#faad14" }} />
                          ) : model.testStatus === "error" ? (
                            <MaterialIcon name="cancel" size={18} style={{ color: "#ff4d4f" }} />
                          ) : (
                            <MaterialIcon name="play_circle" size={18} />
                          )
                        }
                      />
                    </Tooltip>
                  )}

                  {/* Compat Popover */}
                  <ModelCompatPopover
                    modelId={model.id}
                    compat={model.compat}
                    onSave={(patch) => onSaveModelCompat(model.id, patch)}
                  />

                  {/* Visibility Toggle */}
                  <Tooltip
                    title={
                      model.isHidden
                        ? t("providers.enableModel", "取消隐藏此模型")
                        : t("providers.hideModel", "隐藏此模型")
                    }
                  >
                    <Button
                      size="small"
                      type="text"
                      icon={
                        <MaterialIcon
                          name={model.isHidden ? "visibility_off" : "visibility"}
                          size={18}
                          style={{ color: model.isHidden ? "#bbb" : undefined }}
                        />
                      }
                      onClick={() => onToggleModelHidden(model.id, !model.isHidden)}
                    />
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}
