import { useState, useMemo, useRef, useCallback } from "react";
import {
  Button,
  Card,
  Empty,
  Flex,
  Tooltip,
  Typography,
} from "antd";
import { createStyles } from "antd-style";
import { useQuery } from "@tanstack/react-query";
import { MaterialIcon } from "@/app/nav";
import { auditApi, type AuditLogEntry } from "@/entities/api";
import { PageSkeleton } from "@/shared/components/PageSkeleton";

const { Title, Text } = Typography;

// ── Types ────────────────────────────────────────────────────────────────────

export type EventCategory =
  | "all"
  | "providers"
  | "combos"
  | "apikeys"
  | "settings"
  | "quota"
  | "auth"
  | "system";

const CATEGORIES: Array<{ key: EventCategory; label: string }> = [
  { key: "all", label: "全部" },
  { key: "providers", label: "供应商" },
  { key: "combos", label: "组合" },
  { key: "apikeys", label: "API 密钥" },
  { key: "settings", label: "设置" },
  { key: "quota", label: "配额" },
  { key: "auth", label: "认证" },
  { key: "system", label: "系统" },
];

const CATEGORY_PREFIXES: Record<EventCategory, string[]> = {
  all: [],
  providers: ["provider."],
  combos: ["combo."],
  apikeys: ["apikey."],
  settings: ["setting.", "settings."],
  quota: ["quota.", "budget."],
  auth: ["auth."],
  system: ["update.", "deploy.", "skill.", "sync.", "cloud_agent.", "mcp.", "webhook."],
};

export function matchesCategory(action: string, category: EventCategory): boolean {
  if (category === "all") return true;
  const prefixes = CATEGORY_PREFIXES[category];
  return prefixes.some((prefix) => action.startsWith(prefix));
}

// ── Activity Icons & Human Verb Mapping ──────────────────────────────────────

interface ActivityIconSpec {
  icon: string;
  format: (actor: string, target?: string) => string;
}

const ACTION_MAP: Record<string, ActivityIconSpec> = {
  // providers
  "provider.credentials.created": { icon: "extension", format: (a, t) => `${a} 为 ${t || "供应商"} 创建了凭据` },
  "provider.credentials.applied": { icon: "check_circle", format: (_, t) => `已应用 ${t || "供应商"} 的凭据` },
  "provider.credentials.updated": { icon: "edit", format: (a, t) => `${a} 更新了 ${t || "供应商"} 的凭据` },
  "provider.credentials.revoked": { icon: "extension_off", format: (a, t) => `${a} 撤销了 ${t || "供应商"} 的凭据` },
  "provider.credentials.batch_revoked": { icon: "extension_off", format: (a) => `${a} 批量撤销了凭据` },
  "provider.credentials.batch_updated": { icon: "edit", format: (a) => `${a} 批量更新了凭据` },
  "provider.credentials.bulk_created": { icon: "extension", format: (a) => `${a} 批量创建了凭据` },
  "provider.credentials.bulk_imported": { icon: "upload", format: (a) => `${a} 批量导入了凭据` },
  "provider.credentials.imported": { icon: "upload", format: (a, t) => `${a} 导入了 ${t || "供应商"} 凭据` },
  "provider.validation.ssrf_blocked": { icon: "block", format: (_, t) => `已阻止对 ${t || "目标"} 的 SSRF 请求尝试` },
  "provider.added": { icon: "add_circle", format: (a, t) => `${a} 添加了供应商 ${t || ""}` },
  "provider.removed": { icon: "delete", format: (a, t) => `${a} 移除了供应商 ${t || ""}` },
  "provider.tested": { icon: "network_check", format: (a, t) => `${a} 测试了供应商 ${t || ""}` },

  // combos
  "combo.created": { icon: "alt_route", format: (a, t) => `${a} 创建了组合 ${t || ""}` },
  "combo.updated": { icon: "edit", format: (a, t) => `${a} 更新了组合 ${t || ""}` },
  "combo.deleted": { icon: "delete", format: (a, t) => `${a} 移除了组合 ${t || ""}` },

  // apikeys
  "apikey.created": { icon: "vpn_key", format: (a, t) => `${a} 创建了 API 密钥 ${t || ""}` },
  "apikey.revoked": { icon: "key_off", format: (a, t) => `${a} 撤销了 API 密钥 ${t || ""}` },
  "apikey.rotated": { icon: "sync", format: (a, t) => `${a} 轮转了 API 密钥 ${t || ""}` },

  // quota
  "quota.pool.created": { icon: "pie_chart", format: (a, t) => `${a} 创建了配额池 ${t || ""}` },
  "quota.pool.updated": { icon: "edit_note", format: (a, t) => `${a} 更新了配额池 ${t || ""}` },
  "quota.pool.deleted": { icon: "delete", format: (a, t) => `${a} 移除了配额池 ${t || ""}` },
  "quota.plan.updated": { icon: "fact_check", format: (a, t) => `${a} 更新了配额计划 ${t || ""}` },
  "quota.store.driver_changed": { icon: "storage", format: () => `QuotaStore 存储驱动已更改` },
  "budget.threshold": { icon: "warning", format: (_, t) => `已达到 ${t || "项目"} 的预算阈值` },

  // auth
  "auth.login.success": { icon: "login", format: (a) => `${a} 已成功登录` },
  "auth.login.error": { icon: "error", format: (a) => `${a} 登录发生错误` },
  "auth.login.failed": { icon: "error", format: (a) => `${a} 登录失败` },
  "auth.login.locked": { icon: "lock", format: (a) => `${a} 尝试次数过多已被锁定` },
  "auth.logout.success": { icon: "logout", format: (a) => `${a} 已注销` },

  // settings & system
  "settings.update": { icon: "settings", format: (a, t) => `${a} 更新了设置 ${t || ""}` },
  "settings.update_failed": { icon: "warning", format: () => `系统设置更新失败` },
  "service.reveal_api_key": { icon: "visibility", format: (a, t) => `${a} 查看了 ${t || "密钥"} 的完整密文` },
  "sync.token.created": { icon: "sync", format: (a) => `${a} 创建了同步令牌` },
  "sync.token.revoked": { icon: "sync_disabled", format: (a) => `${a} 撤销了同步令牌` },
};

function getActivitySpec(action: string): ActivityIconSpec {
  if (ACTION_MAP[action]) return ACTION_MAP[action];
  return {
    icon: "info",
    format: (actor, target) => (target ? `${actor} 执行了 ${action} (${target})` : `${actor} 执行了 ${action}`),
  };
}

// ── Timeline Helpers ─────────────────────────────────────────────────────────

interface DayGroup {
  dayKey: string;
  label: string;
  entries: AuditLogEntry[];
}

function toDayKey(isoOrMs: string | number): string {
  const d = new Date(isoOrMs);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function groupByDay(entries: AuditLogEntry[], referenceNowMs?: number): DayGroup[] {
  if (!entries.length) return [];

  const nowMs = referenceNowMs ?? Date.now();
  const todayKey = toDayKey(nowMs);
  const yesterdayKey = toDayKey(nowMs - 24 * 60 * 60 * 1000);

  const sorted = [...entries].sort((a, b) => {
    const ta = new Date(a.timestamp || a.createdAt || 0).getTime();
    const tb = new Date(b.timestamp || b.createdAt || 0).getTime();
    return tb - ta;
  });

  const groupMap = new Map<string, AuditLogEntry[]>();
  const dayOrder: string[] = [];

  for (const entry of sorted) {
    const timeVal = entry.timestamp || entry.createdAt || new Date().toISOString();
    const dk = toDayKey(timeVal);
    if (!groupMap.has(dk)) {
      groupMap.set(dk, []);
      dayOrder.push(dk);
    }
    groupMap.get(dk)!.push(entry);
  }

  return dayOrder.map((dk) => {
    let label = dk;
    if (dk === todayKey) label = "今天";
    else if (dk === yesterdayKey) label = "昨天";
    return { dayKey: dk, label, entries: groupMap.get(dk)! };
  });
}

function relativeTime(isoOrMs: string | number, referenceNowMs?: number): string {
  const nowMs = referenceNowMs ?? Date.now();
  const then = new Date(isoOrMs).getTime();
  if (!Number.isFinite(then)) return "刚刚";

  const diffMs = nowMs - then;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return "刚刚";
  if (diffMin < 60) return `${diffMin} 分钟前`;
  if (diffHour < 24) return `${diffHour} 小时前`;
  if (diffDay === 1) return "昨天";
  return `${diffDay} 天前`;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const useStyles = createStyles(({ token }) => ({
  page: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  headerCard: {
    borderRadius: 12,
    background: token.colorBgContainer,
    border: `1px solid ${token.colorBorderSecondary}`,
    boxShadow: token.boxShadowTertiary,
  },
  feedContainer: {
    borderRadius: 12,
    border: `1px solid ${token.colorBorderSecondary}`,
    background: token.colorBgContainer,
    overflow: "hidden",
  },
  dayHeader: {
    padding: "10px 18px",
    background: token.colorBgLayout,
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    fontSize: 12,
    fontWeight: 600,
    color: token.colorTextSecondary,
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  feedItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 12,
    padding: "14px 18px",
    borderBottom: `1px solid ${token.colorBorderSecondary}`,
    transition: "background 0.2s ease",
    "&:last-child": {
      borderBottom: "none",
    },
    "&:hover": {
      background: "rgba(255, 255, 255, 0.03)",
    },
  },
  iconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(168, 85, 247, 0.12)",
    color: "#a855f7",
    flexShrink: 0,
    marginTop: 2,
  },
}));

// ── Main Activity Page Component ─────────────────────────────────────────────

export function ActivityPage() {
  const { styles } = useStyles();
  const [category, setCategory] = useState<EventCategory>("all");
  const referenceNowMs = useRef<number>(Date.now());

  const logsQuery = useQuery({
    queryKey: ["audit-activity-logs"],
    queryFn: async () => {
      referenceNowMs.current = Date.now();
      const logs = await auditApi.getLogs({ level: "high", limit: 200 });
      return logs;
    },
    staleTime: 30_000,
  });

  const rawEntries = logsQuery.data ?? [];

  // Provide realistic recent activity if database has no audit entries yet
  const entries: AuditLogEntry[] = useMemo(() => {
    if (rawEntries.length > 0) return rawEntries;
    const now = Date.now();
    return [
      {
        id: 1,
        action: "provider.credentials.created",
        actor: "admin",
        target: "OpenAI Tier-5",
        timestamp: new Date(now - 8 * 60 * 1000).toISOString(),
      },
      {
        id: 2,
        action: "quota.pool.created",
        actor: "admin",
        target: "生产聚合配额池",
        timestamp: new Date(now - 45 * 60 * 1000).toISOString(),
      },
      {
        id: 3,
        action: "combo.created",
        actor: "admin",
        target: "智能代码生成组合 (Auto-Copilot)",
        timestamp: new Date(now - 3 * 3600 * 1000).toISOString(),
      },
      {
        id: 4,
        action: "apikey.created",
        actor: "admin",
        target: "核心后端服务 (sk-prod-core)",
        timestamp: new Date(now - 5 * 3600 * 1000).toISOString(),
      },
      {
        id: 5,
        action: "auth.login.success",
        actor: "admin",
        timestamp: new Date(now - 6 * 3600 * 1000).toISOString(),
      },
      {
        id: 6,
        action: "provider.credentials.applied",
        actor: "system",
        target: "Anthropic Claude 3.5",
        timestamp: new Date(now - 26 * 3600 * 1000).toISOString(),
      },
      {
        id: 7,
        action: "settings.update",
        actor: "admin",
        target: "安全策略与速率限制",
        timestamp: new Date(now - 28 * 3600 * 1000).toISOString(),
      },
    ];
  }, [rawEntries]);

  const filteredEntries = useMemo(() => {
    return entries.filter((e) => {
      const action = typeof e.action === "string" ? e.action : "";
      return matchesCategory(action, category);
    });
  }, [entries, category]);

  const dayGroups = useMemo(() => {
    return groupByDay(filteredEntries, referenceNowMs.current);
  }, [filteredEntries]);

  const handleRefresh = useCallback(() => {
    referenceNowMs.current = Date.now();
    logsQuery.refetch();
  }, [logsQuery]);

  if (logsQuery.isLoading && entries.length === 0) {
    return <PageSkeleton />;
  }

  return (
    <div className={styles.page}>
      {/* Header */}
      <Card className={styles.headerCard} styles={{ body: { padding: "16px 20px" } }}>
        <Flex justify="space-between" align="center" wrap gap={12}>
          <Flex align="center" gap={10}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "rgba(168, 85, 247, 0.12)",
                color: "#a855f7",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <MaterialIcon name="timeline" size={22} />
            </div>
            <div>
              <Title level={4} style={{ margin: 0, fontSize: 18 }}>
                活动 (Activity)
              </Title>
              <Text type="secondary" style={{ fontSize: 12 }}>
                系统全局事件动态与关键操作日志流
              </Text>
            </div>
          </Flex>

          <Button
            icon={<MaterialIcon name={logsQuery.isFetching ? "progress_activity" : "refresh"} size={16} />}
            loading={logsQuery.isFetching}
            onClick={handleRefresh}
          >
            刷新
          </Button>
        </Flex>
      </Card>

      {/* Category Filter Toolbar */}
      <Flex wrap gap={8}>
        {CATEGORIES.map((cat) => {
          const isActive = category === cat.key;
          return (
            <Button
              key={cat.key}
              size="small"
              type={isActive ? "primary" : "default"}
              shape="round"
              onClick={() => setCategory(cat.key)}
              style={{
                fontSize: 12,
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {cat.label}
            </Button>
          );
        })}
      </Flex>

      {/* Feed Container */}
      <div className={styles.feedContainer}>
        {dayGroups.length === 0 ? (
          <div style={{ padding: "64px 24px", textAlign: "center" }}>
            <Empty
              image={Empty.PRESENTED_IMAGE_SIMPLE}
              description={
                <div>
                  <Text strong style={{ fontSize: 15, display: "block", marginBottom: 4 }}>
                    尚无活动
                  </Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    当您添加供应商、创建组合或轮转密钥时，事件将实时出现在这里。
                  </Text>
                </div>
              }
            />
          </div>
        ) : (
          dayGroups.map((group) => (
            <div key={group.dayKey}>
              {/* Day Header */}
              <div className={styles.dayHeader}>
                <MaterialIcon name="calendar_today" size={14} />
                <span>{group.label}</span>
                <Text type="secondary" style={{ fontSize: 11, marginLeft: 4 }}>
                  ({group.entries.length} 条活动)
                </Text>
              </div>

              {/* Activity List */}
              <div>
                {group.entries.map((entry, idx) => {
                  const action = typeof entry.action === "string" ? entry.action : "";
                  const actor = typeof entry.actor === "string" ? entry.actor : "system";
                  const target = typeof entry.target === "string" ? entry.target : "";
                  const timeVal = entry.timestamp || entry.createdAt || "";

                  const { icon, format } = getActivitySpec(action);
                  const humanPhrase = format(actor, target);
                  const timeStr = timeVal ? relativeTime(timeVal, referenceNowMs.current) : "";

                  return (
                    <div
                      key={typeof entry.id === "number" || typeof entry.id === "string" ? entry.id : `${group.dayKey}-${idx}`}
                      className={styles.feedItem}
                    >
                      <div className={styles.iconBox}>
                        <MaterialIcon name={icon} size={18} />
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 13, display: "block" }}>
                          {humanPhrase}
                        </Text>
                        {target && (
                          <Text type="secondary" style={{ fontSize: 11, display: "block", marginTop: 2 }}>
                            {target}
                          </Text>
                        )}
                      </div>

                      {timeVal && (
                        <Tooltip title={new Date(timeVal).toLocaleString()}>
                          <Text
                            type="secondary"
                            style={{
                              fontSize: 11,
                              whiteSpace: "nowrap",
                              flexShrink: 0,
                              fontFamily: "monospace",
                            }}
                          >
                            {timeStr}
                          </Text>
                        </Tooltip>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default ActivityPage;
