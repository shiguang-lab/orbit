import { useState, useEffect } from "react";
import { Card, Switch, message } from "antd";
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
  switchRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    padding: "12px 0",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    "&:last-child": {
      borderBottom: "none",
      paddingBottom: 0,
    },
  },
  labelColumn: {
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
}));

export interface InterceptionRulesConfig {
  interceptSearch?: boolean;
  interceptFetch?: boolean;
}

interface Props {
  providerId: string;
  config: InterceptionRulesConfig;
  onUpdate: (patch: InterceptionRulesConfig) => Promise<void>;
  loading?: boolean;
}

export function ProviderInterceptionSection({
  config,
  onUpdate,
  loading = false,
}: Props) {
  const { styles } = useStyles();
  const { t } = useI18n();

  const [interceptSearch, setInterceptSearch] = useState(false);
  const [interceptFetch, setInterceptFetch] = useState(false);

  useEffect(() => {
    setInterceptSearch(Boolean(config.interceptSearch));
    setInterceptFetch(Boolean(config.interceptFetch));
  }, [config]);

  const handleToggleSearch = async (checked: boolean) => {
    setInterceptSearch(checked);
    try {
      await onUpdate({ interceptSearch: checked, interceptFetch });
      message.success(t("providers.paramFiltersSaveSuccess", "拦截设置已更新"));
    } catch {
      setInterceptSearch(!checked);
      message.error(t("providers.interceptionSaveError", "保存拦截设置失败"));
    }
  };

  const handleToggleFetch = async (checked: boolean) => {
    setInterceptFetch(checked);
    try {
      await onUpdate({ interceptSearch, interceptFetch: checked });
      message.success(t("providers.paramFiltersSaveSuccess", "拦截设置已更新"));
    } catch {
      setInterceptFetch(!checked);
      message.error(t("providers.interceptionSaveError", "保存拦截设置失败"));
    }
  };

  return (
    <Card className={styles.card}>
      <div className={styles.headerTitle}>
        <MaterialIcon name="alt_route" size={20} style={{ color: "var(--ant-color-primary)" }} />
        <span>{t("providers.interceptionSectionTitle", "网页工具拦截")}</span>
      </div>

      <div className={styles.hintText}>
        {t(
          "providers.interceptionSectionHint",
          "将此提供者的原生 web_search / web_fetch 工具调用路由到 OmniRoute 自身的搜索和获取端点，而不是让提供者原生运行它们。默认关闭 — 现有行为保持不变。"
        )}
      </div>

      <div className={styles.switchRow}>
        <div className={styles.labelColumn}>
          <span className={styles.itemTitle}>{t("providers.interceptSearchLabel", "拦截 web_search")}</span>
          <span className={styles.itemHint}>
            {t("providers.interceptSearchHint", "将原生的 web_search 工具调用重写为 OmniRoute 的 /v1/search。")}
          </span>
        </div>
        <Switch checked={interceptSearch} onChange={handleToggleSearch} loading={loading} />
      </div>

      <div className={styles.switchRow}>
        <div className={styles.labelColumn}>
          <span className={styles.itemTitle}>{t("providers.interceptFetchLabel", "拦截 web_fetch")}</span>
          <span className={styles.itemHint}>
            {t("providers.interceptFetchHint", "将原生的 web_fetch 工具调用重写为 OmniRoute 的 /v1/web/fetch。")}
          </span>
        </div>
        <Switch checked={interceptFetch} onChange={handleToggleFetch} loading={loading} />
      </div>
    </Card>
  );
}
