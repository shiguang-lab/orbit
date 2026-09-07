import { useState, useEffect } from "react";
import { Card, Segmented, Input, Button, Typography, Tag, message } from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";

const useStyles = createStyles(({ token }) => ({
  card: {
    marginBottom: 0,
    borderRadius: token.borderRadiusLG,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: 600,
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  hintText: {
    fontSize: 13,
    color: token.colorTextSecondary,
    marginBottom: 16,
  },
  providerRow: {
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
  providerLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 500,
  },
  itemHint: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  overridesHeader: {
    fontSize: 14,
    fontWeight: 600,
    marginBottom: 10,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  overridesList: {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    marginBottom: 14,
  },
  overrideRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 12px",
    borderRadius: token.borderRadius,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
  },
  addRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    maxWidth: 360,
  },
}));

type CcAliasState = "inherit" | "on" | "off";

export interface CcAliasData {
  provider: "on" | "off" | null;
  models: Record<string, "on" | "off">;
}

interface Props {
  providerId: string;
  data: CcAliasData;
  onUpdateSetting: (scope: "provider" | "model", value: "on" | "off" | null, modelId?: string) => Promise<void>;
  loading?: boolean;
}

export function ProviderCcAliasSection({
  data,
  onUpdateSetting,
  loading = false,
}: Props) {
  const { styles } = useStyles();
  const { t } = useI18n();

  const [providerState, setProviderState] = useState<CcAliasState>("inherit");
  const [modelOverrides, setModelOverrides] = useState<Record<string, "on" | "off">>({});
  const [newModelId, setNewModelId] = useState("");

  useEffect(() => {
    setProviderState(data.provider === "on" ? "on" : data.provider === "off" ? "off" : "inherit");
    setModelOverrides(data.models || {});
  }, [data]);

  const handleProviderStateChange = async (val: CcAliasState) => {
    setProviderState(val);
    const apiVal = val === "inherit" ? null : val;
    try {
      await onUpdateSetting("provider", apiVal);
      message.success(t("providers.paramFiltersSaveSuccess", "Claude Code 别名配置已更新"));
    } catch {
      message.error(t("providers.ccAliasSaveError", "保存 Claude Code 别名配置失败"));
    }
  };

  const handleModelOverrideChange = async (modelId: string, val: CcAliasState) => {
    const apiVal = val === "inherit" ? null : val;
    try {
      await onUpdateSetting("model", apiVal, modelId);
      setModelOverrides((prev) => {
        const next = { ...prev };
        if (apiVal === null) {
          delete next[modelId];
        } else {
          next[modelId] = apiVal;
        }
        return next;
      });
      message.success(t("providers.paramFiltersSaveSuccess", "模型覆盖配置已更新"));
    } catch {
      message.error(t("providers.ccAliasSaveError", "保存模型覆盖配置失败"));
    }
  };

  const handleAddOverride = async () => {
    const trimmed = newModelId.trim();
    if (!trimmed) return;
    try {
      await onUpdateSetting("model", "on", trimmed);
      setModelOverrides((prev) => ({ ...prev, [trimmed]: "on" }));
      setNewModelId("");
      message.success(t("providers.modelAddedSuccess", `已添加覆盖: ${trimmed}`));
    } catch {
      message.error(t("providers.ccAliasSaveError", "添加模型覆盖配置失败"));
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.headerTitle}>
        <MaterialIcon name="terminal" size={20} style={{ color: "var(--ant-color-primary)" }} />
        <span>{t("providers.ccAliasSectionTitle", "Claude Code 发现别名 (claude/…)")}</span>
      </div>

      <div className={styles.hintText}>
        {t(
          "providers.ccAliasSectionHint",
          "在 claude/<provider>/<model> 镜像 ID 下发布此提供者的模型，以便 Claude Code 网关模型发现可以列出它们。默认关闭。"
        )}
      </div>

      {/* Provider Default Level */}
      <div className={styles.providerRow}>
        <div className={styles.providerLabel}>
          <span className={styles.itemTitle}>{t("providers.ccAliasProviderLevelLabel", "提供者默认")}</span>
          <span className={styles.itemHint}>
            {t("providers.ccAliasProviderLevelHint", "决定此提供者下所有模型的默认公开状态。")}
          </span>
        </div>

        <Segmented
          value={providerState}
          onChange={(v) => handleProviderStateChange(v as CcAliasState)}
          disabled={loading}
          options={[
            { label: t("providers.ccAliasStateInherit", "继承全局"), value: "inherit" },
            { label: t("providers.ccAliasStateOn", "开启"), value: "on" },
            { label: t("providers.ccAliasStateOff", "关闭"), value: "off" },
          ]}
        />
      </div>

      {/* Per-model overrides */}
      <div className={styles.overridesHeader}>
        <span>{t("providers.ccAliasModelOverridesLabel", "按模型单独覆盖")}</span>
        <Tag bordered={false}>{Object.keys(modelOverrides).length}</Tag>
      </div>

      <div className={styles.overridesList}>
        {Object.entries(modelOverrides).map(([mId, state]) => (
          <div key={mId} className={styles.overrideRow}>
            <Typography.Text code style={{ fontSize: 13 }}>
              {mId}
            </Typography.Text>

            <Segmented
              value={state}
              onChange={(v) => handleModelOverrideChange(mId, v as CcAliasState)}
              options={[
                { label: t("providers.ccAliasStateInherit", "继承"), value: "inherit" },
                { label: t("providers.ccAliasStateOn", "开启"), value: "on" },
                { label: t("providers.ccAliasStateOff", "关闭"), value: "off" },
              ]}
            />
          </div>
        ))}
      </div>

      {/* Add override input */}
      <div className={styles.addRow}>
        <Input
          placeholder={t("providers.ccAliasAddModelPlaceholder", "模型 ID (例如 gpt-4o)")}
          value={newModelId}
          onChange={(e) => setNewModelId(e.target.value)}
          onPressEnter={handleAddOverride}
        />
        <Button
          type="primary"
          icon={<MaterialIcon name="add" size={16} />}
          onClick={handleAddOverride}
        >
          {t("providers.ccAliasAddModelButton", "添加覆盖")}
        </Button>
      </div>
    </Card>
  );
}
