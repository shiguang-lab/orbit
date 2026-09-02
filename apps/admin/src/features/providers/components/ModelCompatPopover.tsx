import { useState, useEffect } from "react";
import { Popover, Button, Switch, Input, Typography, Tabs, message } from "antd";
import { createStyles } from "antd-style";
import { MaterialIcon } from "@/app/nav";
import { useI18n } from "@/i18n";

const useStyles = createStyles(({ token }) => ({
  popoverContainer: {
    width: 380,
    maxWidth: "92vw",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingBottom: 8,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  sectionTitle: {
    fontWeight: 600,
    fontSize: 14,
    margin: 0,
  },
  optionRow: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
    padding: "8px 0",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
  },
  optionLabel: {
    display: "flex",
    flexDirection: "column",
    gap: 2,
  },
  optionTitle: {
    fontSize: 13,
    fontWeight: 500,
  },
  optionHint: {
    fontSize: 12,
    color: token.colorTextSecondary,
  },
  headerRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  headerInput: {
    flex: 1,
  },
  addHeaderBtn: {
    marginTop: 4,
    paddingInline: 0,
  },
}));

export interface ModelCompatData {
  normalizeToolCallId?: boolean;
  preserveOpenAIDeveloperRole?: boolean;
  upstreamHeaders?: Record<string, string>;
  compatByProtocol?: {
    "openai/chat-completions"?: {
      normalizeToolCallId?: boolean;
      preserveOpenAIDeveloperRole?: boolean;
      upstreamHeaders?: Record<string, string>;
    };
    "openai/responses"?: {
      normalizeToolCallId?: boolean;
      preserveOpenAIDeveloperRole?: boolean;
      upstreamHeaders?: Record<string, string>;
    };
    "anthropic/messages"?: {
      normalizeToolCallId?: boolean;
      preserveOpenAIDeveloperRole?: boolean;
      upstreamHeaders?: Record<string, string>;
    };
  };
}

interface Props {
  modelId: string;
  compat?: ModelCompatData;
  onSave: (patch: {
    normalizeToolCallId?: boolean;
    preserveOpenAIDeveloperRole?: boolean;
    upstreamHeaders?: Record<string, string>;
    compatByProtocol?: ModelCompatData["compatByProtocol"];
  }) => Promise<void>;
  loading?: boolean;
  children?: React.ReactNode;
}

interface HeaderItem {
  id: string;
  key: string;
  value: string;
}

export function ModelCompatPopover({ modelId, compat, onSave, loading = false, children }: Props) {
  const { styles } = useStyles();
  const { t } = useI18n();
  const [open, setOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<string>("global");

  // Global settings
  const [normalizeId, setNormalizeId] = useState(false);
  const [preserveDevRole, setPreserveDevRole] = useState(false);
  const [headerItems, setHeaderItems] = useState<HeaderItem[]>([]);

  // Per-protocol settings
  const [protoNormalizeId, setProtoNormalizeId] = useState<Record<string, boolean>>({});
  const [protoPreserveDevRole, setProtoPreserveDevRole] = useState<Record<string, boolean>>({});
  const [protoHeaders, setProtoHeaders] = useState<Record<string, HeaderItem[]>>({});

  useEffect(() => {
    if (open) {
      setNormalizeId(Boolean(compat?.normalizeToolCallId));
      setPreserveDevRole(Boolean(compat?.preserveOpenAIDeveloperRole));
      
      const rawHeaders = compat?.upstreamHeaders || {};
      setHeaderItems(
        Object.entries(rawHeaders).map(([k, v], idx) => ({ id: `${idx}-${k}`, key: k, value: v }))
      );

      const protoNorm: Record<string, boolean> = {};
      const protoDev: Record<string, boolean> = {};
      const protoHdrs: Record<string, HeaderItem[]> = {};

      for (const proto of ["openai/chat-completions", "openai/responses", "anthropic/messages"] as const) {
        const protoCfg = compat?.compatByProtocol?.[proto];
        protoNorm[proto] = Boolean(protoCfg?.normalizeToolCallId);
        protoDev[proto] = Boolean(protoCfg?.preserveOpenAIDeveloperRole);
        protoHdrs[proto] = Object.entries(protoCfg?.upstreamHeaders || {}).map(([k, v], idx) => ({
          id: `${proto}-${idx}-${k}`,
          key: k,
          value: v,
        }));
      }

      setProtoNormalizeId(protoNorm);
      setProtoPreserveDevRole(protoDev);
      setProtoHeaders(protoHdrs);
    }
  }, [open, compat]);

  const handleSave = async () => {
    const upstreamHeaders: Record<string, string> = {};
    for (const h of headerItems) {
      if (h.key.trim()) upstreamHeaders[h.key.trim()] = h.value;
    }

    const compatByProtocol: NonNullable<ModelCompatData["compatByProtocol"]> = {};
    for (const proto of ["openai/chat-completions", "openai/responses", "anthropic/messages"] as const) {
      const pHeaders: Record<string, string> = {};
      for (const h of protoHeaders[proto] || []) {
        if (h.key.trim()) pHeaders[h.key.trim()] = h.value;
      }
      compatByProtocol[proto] = {
        normalizeToolCallId: protoNormalizeId[proto],
        preserveOpenAIDeveloperRole: protoPreserveDevRole[proto],
        upstreamHeaders: Object.keys(pHeaders).length > 0 ? pHeaders : undefined,
      };
    }

    try {
      await onSave({
        normalizeToolCallId: normalizeId,
        preserveOpenAIDeveloperRole: preserveDevRole,
        upstreamHeaders: Object.keys(upstreamHeaders).length > 0 ? upstreamHeaders : undefined,
        compatByProtocol,
      });
      message.success(t("providers.paramFiltersSaveSuccess", "兼容性设置已保存"));
      setOpen(false);
    } catch {
      message.error(t("providers.failedSaveCustomModel", "保存兼容性配置失败"));
    }
  };

  const renderHeaderEditor = (
    items: HeaderItem[],
    onChange: (items: HeaderItem[]) => void
  ) => (
    <div style={{ marginTop: 8 }}>
      <Typography.Text type="secondary" style={{ fontSize: 12, display: "block", marginBottom: 6 }}>
        {t("providers.compatUpstreamHeadersLabel", "上游额外请求头")}
      </Typography.Text>
      {items.map((item, index) => (
        <div key={item.id} className={styles.headerRow}>
          <Input
            size="small"
            placeholder={t("providers.compatUpstreamHeaderName", "请求头名称")}
            value={item.key}
            className={styles.headerInput}
            onChange={(e) => {
              const next = [...items];
              next[index] = { ...item, key: e.target.value };
              onChange(next);
            }}
          />
          <Input
            size="small"
            placeholder={t("providers.compatUpstreamHeaderValue", "值")}
            value={item.value}
            className={styles.headerInput}
            onChange={(e) => {
              const next = [...items];
              next[index] = { ...item, value: e.target.value };
              onChange(next);
            }}
          />
          <Button
            type="text"
            size="small"
            danger
            icon={<MaterialIcon name="delete" size={16} />}
            onClick={() => {
              onChange(items.filter((_, i) => i !== index));
            }}
          />
        </div>
      ))}
      <Button
        type="link"
        size="small"
        icon={<MaterialIcon name="add" size={16} />}
        className={styles.addHeaderBtn}
        onClick={() => {
          onChange([...items, { id: `${Date.now()}-${items.length}`, key: "", value: "" }]);
        }}
      >
        {t("providers.compatUpstreamAddRow", "添加请求头")}
      </Button>
    </div>
  );

  const popoverContent = (
    <div className={styles.popoverContainer}>
      <div className={styles.header}>
        <span className={styles.sectionTitle}>
          {t("providers.compatAdjustmentsTitle", "模型兼容性设置")}
        </span>
        <Typography.Text code style={{ fontSize: 12 }}>
          {modelId}
        </Typography.Text>
      </div>

      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        size="small"
        items={[
          {
            key: "global",
            label: t("providers.proxySourceGlobal", "通用设置"),
            children: (
              <div>
                <div className={styles.optionRow}>
                  <div className={styles.optionLabel}>
                    <span className={styles.optionTitle}>
                      {t("providers.compatToolIdShort", "工具 ID 9 位")}
                    </span>
                    <span className={styles.optionHint}>
                      {t("providers.normalizeToolCallIdLabel", "规范为 9 位工具调用 ID (如 Mistral)")}
                    </span>
                  </div>
                  <Switch checked={normalizeId} onChange={setNormalizeId} size="small" />
                </div>

                <div className={styles.optionRow}>
                  <div className={styles.optionLabel}>
                    <span className={styles.optionTitle}>
                      {t("providers.compatDeveloperShort", "developer 角色")}
                    </span>
                    <span className={styles.optionHint}>
                      {t("providers.preserveDeveloperRoleLabel", "保留 Responses developer 角色 (不映射为 system)")}
                    </span>
                  </div>
                  <Switch checked={preserveDevRole} onChange={setPreserveDevRole} size="small" />
                </div>

                {renderHeaderEditor(headerItems, setHeaderItems)}
              </div>
            ),
          },
          {
            key: "openai/chat-completions",
            label: "OpenAI Chat",
            children: (
              <div>
                <div className={styles.optionRow}>
                  <div className={styles.optionLabel}>
                    <span className={styles.optionTitle}>
                      {t("providers.compatToolIdShort", "工具 ID 9 位")}
                    </span>
                  </div>
                  <Switch
                    checked={protoNormalizeId["openai/chat-completions"] ?? false}
                    onChange={(v) => setProtoNormalizeId((prev) => ({ ...prev, "openai/chat-completions": v }))}
                    size="small"
                  />
                </div>
                {renderHeaderEditor(
                  protoHeaders["openai/chat-completions"] || [],
                  (items) => setProtoHeaders((prev) => ({ ...prev, "openai/chat-completions": items }))
                )}
              </div>
            ),
          },
          {
            key: "openai/responses",
            label: "Responses API",
            children: (
              <div>
                <div className={styles.optionRow}>
                  <div className={styles.optionLabel}>
                    <span className={styles.optionTitle}>
                      {t("providers.compatDeveloperShort", "developer 角色")}
                    </span>
                  </div>
                  <Switch
                    checked={protoPreserveDevRole["openai/responses"] ?? false}
                    onChange={(v) => setProtoPreserveDevRole((prev) => ({ ...prev, "openai/responses": v }))}
                    size="small"
                  />
                </div>
                {renderHeaderEditor(
                  protoHeaders["openai/responses"] || [],
                  (items) => setProtoHeaders((prev) => ({ ...prev, "openai/responses": items }))
                )}
              </div>
            ),
          },
          {
            key: "anthropic/messages",
            label: "Claude",
            children: (
              <div>
                {renderHeaderEditor(
                  protoHeaders["anthropic/messages"] || [],
                  (items) => setProtoHeaders((prev) => ({ ...prev, "anthropic/messages": items }))
                )}
              </div>
            ),
          },
        ]}
      />

      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 14, paddingTop: 10, borderTop: "1px solid var(--ant-color-border-secondary, #eee)" }}>
        <Button size="small" onClick={() => setOpen(false)}>
          {t("common.cancel", "取消")}
        </Button>
        <Button type="primary" size="small" loading={loading} onClick={handleSave}>
          {t("common.save", "保存")}
        </Button>
      </div>
    </div>
  );

  return (
    <Popover
      content={popoverContent}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomRight"
    >
      {children || (
        <Button
          size="small"
          type="text"
          icon={<MaterialIcon name="tune" size={16} />}
          title={t("providers.compatButtonLabel", "兼容性设置")}
        />
      )}
    </Popover>
  );
}
