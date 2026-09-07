import { useState, useEffect } from "react";
import { Card, Input, Switch, Button, Space, Popconfirm, message } from "antd";
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
  formItem: {
    marginBottom: 16,
  },
  labelRow: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
    marginBottom: 6,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: 500,
  },
  itemHint: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  switchRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
    padding: "12px 0",
    borderTop: `1px solid ${token.colorBorderSecondary}`,
    marginBottom: 16,
  },
}));

export interface ParamFilterConfig {
  block?: string[];
  allow?: string[];
  autoLearn?: boolean;
}

interface Props {
  providerId: string;
  config: ParamFilterConfig;
  onSave: (config: ParamFilterConfig) => Promise<void>;
  onReset: () => Promise<void>;
  loading?: boolean;
}

export function ProviderParamFilterSection({
  config,
  onSave,
  onReset,
  loading = false,
}: Props) {
  const { styles } = useStyles();
  const { t } = useI18n();

  const [blockedText, setBlockedText] = useState("");
  const [allowedText, setAllowedText] = useState("");
  const [autoLearn, setAutoLearn] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setBlockedText((config.block || []).join(", "));
    setAllowedText((config.allow || []).join(", "));
    setAutoLearn(Boolean(config.autoLearn));
  }, [config]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const block = blockedText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const allow = allowedText
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      await onSave({ block, allow, autoLearn });
      message.success(t("providers.paramFiltersSaveSuccess", "参数过滤器配置已保存"));
    } catch {
      message.error(t("providers.paramFiltersSaveError", "保存参数过滤器配置失败"));
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      await onReset();
      message.success(t("providers.paramFiltersResetSuccess", "参数过滤器配置已重置为默认值"));
    } catch {
      message.error(t("providers.paramFiltersResetError", "重置参数过滤器配置失败"));
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.headerTitle}>
        <MaterialIcon name="filter_alt" size={20} style={{ color: "var(--ant-color-primary)" }} />
        <span>{t("providers.paramFiltersSectionTitle", "请求参数过滤器")}</span>
      </div>

      <div className={styles.hintText}>
        {t(
          "providers.paramFiltersSectionHint",
          "在发送给此提供者之前剥离或重新添加请求参数。用于避免因提供者拒绝某些参数而导致的 400 错误（例如 NVIDIA NIM 拒绝 thinking）。"
        )}
      </div>

      <div className={styles.formItem}>
        <div className={styles.labelRow}>
          <span className={styles.itemTitle}>{t("providers.paramFiltersBlockedLabel", "已屏蔽的参数")}</span>
          <span className={styles.itemHint}>
            {t("providers.paramFiltersBlockedHint", "这些参数将从发送的请求中剥离（黑名单），多个参数用英文逗号分隔。")}
          </span>
        </div>
        <Input
          placeholder="例如：presence_penalty, frequency_penalty, thinking"
          value={blockedText}
          onChange={(e) => setBlockedText(e.target.value)}
        />
      </div>

      <div className={styles.formItem}>
        <div className={styles.labelRow}>
          <span className={styles.itemTitle}>{t("providers.paramFiltersAllowedLabel", "允许的参数")}</span>
          <span className={styles.itemHint}>
            {t("providers.paramFiltersAllowedHint", "这些参数将在黑名单剥离后重新添加（仅当客户端发送了它们时），多个参数用英文逗号分隔。")}
          </span>
        </div>
        <Input
          placeholder="例如：temperature, max_tokens"
          value={allowedText}
          onChange={(e) => setAllowedText(e.target.value)}
        />
      </div>

      <div className={styles.switchRow}>
        <div className={styles.labelRow}>
          <span className={styles.itemTitle}>{t("providers.paramFiltersAutoLearnLabel", "从 400 错误中自动学习")}</span>
          <span className={styles.itemHint}>
            {t(
              "providers.paramFiltersAutoLearnHint",
              "启用后，如果上游返回 400 错误并提示 \"Unsupported parameter: X\"，该参数将自动添加到屏蔽列表中，并重试请求。"
            )}
          </span>
        </div>
        <Switch checked={autoLearn} onChange={setAutoLearn} />
      </div>

      <Space>
        <Button type="primary" loading={saving || loading} onClick={handleSave}>
          {t("providers.paramFiltersSaveChanges", "保存更改")}
        </Button>
        <Popconfirm
          title={t("providers.paramFiltersResetConfirm", "确定重置参数过滤器配置为默认值？")}
          onConfirm={handleReset}
          okText={t("common.confirm", "确定")}
          cancelText={t("common.cancel", "取消")}
        >
          <Button>{t("providers.paramFiltersResetToDefault", "重置为默认值")}</Button>
        </Popconfirm>
      </Space>
    </Card>
  );
}
