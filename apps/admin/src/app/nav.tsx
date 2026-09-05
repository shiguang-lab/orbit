/**
 * 侧栏导航配置：模块级常量，路由匹配 selectedKeys。
 * 图标名称与线上 ShiguangGateway Shiguang Gateway 侧栏保持一致，使用本地 Material Symbols 字体渲染。
 */
import type { CSSProperties } from "react";
import { translate, type AppLocale } from "@/i18n";

export interface NavItem {
  key: string;
  label: string;
  to: string;
  icon?: string;
}

export interface NavSection {
  key: string;
  title: string;
  icon?: string;
  items: NavItem[];
}

export interface SidebarSettings {
  hiddenSidebarItems?: string[];
  sidebarSectionOrder?: string[];
  sidebarItemOrder?: Record<string, string[]>;
  sidebarActivePreset?: string;
  blockedProviders?: string[];
  codexServiceTier?: unknown;
  showQuickStartOnHome?: boolean;
  showProviderTopologyOnHome?: boolean;
}

const NAV_ICON_ACCENTS: Record<string, string> = {
  // Section accents
  "section-home": "#60A5FA",
  "section-omni-proxy": "#818CF8",
  "section-analytics": "#06B6D4",
  "section-costs": "#FB923C",
  "section-monitoring": "#EC4899",
  "section-devtools": "#EAB308",
  "section-capabilities": "#A855F7",
  "section-other-features": "#10B981",
  "section-configuration": "#64748B",
  "section-help": "#3B82F6",

  // Items accents
  home: "#60A5FA",
  "api-manager": "#F59E0B",
  endpoints: "#38BDF8",
  providers: "#818CF8",
  "embedded-services": "#22C55E",
  combos: "#A855F7",
  "combos-live": "#C084FC",
  quota: "#F472B6",
  "context-settings": "#64748B",
  "context-combos": "#C084FC",
  "context-caveman": "#F97316",
  "context-rtk": "#2DD4BF",
  "context-headroom": "#14B8A6",
  "context-session-dedup": "#06B6D4",
  "context-ccr": "#0EA5E9",
  "context-llmlingua": "#8B5CF6",
  "context-lite": "#22C55E",
  "context-aggressive": "#F97316",
  "context-ultra": "#EF4444",
  "context-omniglyph": "#D946EF",
  "compression-studio": "#6366F1",
  "compression-exclusions": "#EF4444",
  "cli-code": "#FACC15",
  "cli-agents": "#93C5FD",
  "acp-agents": "#A78BFA",
  "cloud-agents": "#7DD3FC",
  conductor: "#A855F7",
  "agent-bridge": "#14B8A6",
  "traffic-inspector": "#0EA5E9",
  discovery: "#06B6D4",
  "api-endpoints": "#14B8A6",
  webhooks: "#EC4899",
  proxy: "#A3E635",
  analytics: "#06B6D4",
  "analytics-usage": "#06B6D4",
  "analytics-combo-health": "#34D399",
  "analytics-utilization": "#FBBF24",
  costs: "#FB923C",
  "costs-pricing": "#FB923C",
  "costs-budget": "#22C55E",
  "costs-free-tiers": "#22C55E",
  "free-provider-rankings": "#FACC15",
  "costs-quota-share": "#06B6D4",
  radar: "#F59E0B",
  cache: "#84CC16",
  "analytics-compression": "#F97316",
  "analytics-search": "#38BDF8",
  "analytics-evals": "#A78BFA",
  "provider-stats": "#FBBF24",
  activity: "#60A5FA",
  logs: "#CBD5E1",
  "logs-proxy": "#A3E635",
  "logs-console": "#FACC15",
  "logs-timeline": "#F472B6",
  conversations: "#06B6D4",
  health: "#EF4444",
  runtime: "#F59E0B",
  "resilience-connections": "#22C55E",
  audit: "#F43F5E",
  "audit-mcp": "#818CF8",
  "audit-a2a": "#A855F7",
  translator: "#3B82F6",
  playground: "#EAB308",
  "search-tools": "#0891B2",
  mcp: "#8B5CF6",
  a2a: "#06B6D4",
  memory: "#10B981",
  "agent-skills": "#D946EF",
  "chaos-config": "#F43F5E",
  skills: "#F43F5E",
  plugins: "#F43F5E",
  leaderboard: "#FACC15",
  profile: "#60A5FA",
  tokens: "#A3E635",
  media: "#D946EF",
  batch: "#14B8A6",
  "batch-files": "#38BDF8",
  "settings-general": "#64748B",
  "settings-appearance": "#D946EF",
  "settings-ai": "#A78BFA",
  "settings-modality-bridge": "#8B5CF6",
  "settings-resilience": "#22C55E",
  "settings-advanced": "#F97316",
  "settings-security": "#EF4444",
  "settings-access-tokens": "#A3E635",
  "settings-feature-flags": "#FACC15",
  "settings-cache": "#84CC16",
  "settings-routing": "#06B6D4",
  "settings-sidebar": "#38BDF8",
  docs: "#2563EB",
  issues: "#DC2626",
  changelog: "#F59E0B",
};

export function NavIcon({ name, itemKey }: { name: string; itemKey: string }) {
  return (
    <span
      className="material-symbols-outlined"
      style={{
        color: NAV_ICON_ACCENTS[itemKey],
        fontSize: 18,
        lineHeight: "18px",
        width: 18,
        height: 18,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        marginInlineEnd: 10,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

export function MaterialIcon({ name, size = 16, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <span
      className={["material-symbols-outlined", className].filter(Boolean).join(" ")}
      style={{
        fontSize: size,
        width: size,
        height: size,
        lineHeight: `${size}px`,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        verticalAlign: "middle",
        flexShrink: 0,
        userSelect: "none",
        ...style,
      }}
      aria-hidden="true"
    >
      {name}
    </span>
  );
}

/**
 * Complete dashboard inventory mirrored from Shiguang Gateway's sidebar source.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "home",
    title: "首页",
    icon: "home",
    items: [{ key: "home", label: "首页", to: "/home", icon: "home" }],
  },
  {
    key: "omni-proxy",
    title: "网关代理",
    icon: "router",
    items: [
      { key: "endpoints", label: "API 端点", to: "/dashboard/endpoint", icon: "api" },
      { key: "api-manager", label: "API 密钥管理", to: "/dashboard/api-manager", icon: "vpn_key" },
      { key: "providers", label: "模型提供商", to: "/dashboard/providers", icon: "dns" },
      { key: "embedded-services", label: "嵌入式服务", to: "/dashboard/providers/services", icon: "deployed_code" },
      { key: "combos", label: "模型组合", to: "/dashboard/combos", icon: "layers" },
      { key: "combos-live", label: "组合实时调试", to: "/dashboard/combos/live", icon: "account_tree" },
      { key: "quota", label: "提供商配额", to: "/dashboard/quota", icon: "tune" },
      { key: "costs-quota-share", label: "配额共享", to: "/dashboard/costs/quota-share", icon: "pie_chart" },
      { key: "context-settings", label: "压缩设置", to: "/dashboard/context/settings", icon: "settings" },
      { key: "context-combos", label: "压缩组合", to: "/dashboard/context/combos", icon: "hub" },
      { key: "context-caveman", label: "穴居人压缩", to: "/dashboard/context/caveman", icon: "compress" },
      { key: "context-rtk", label: "RTK 压缩", to: "/dashboard/context/rtk", icon: "filter_alt" },
      { key: "context-headroom", label: "上下文余量", to: "/dashboard/context/headroom", icon: "table_rows" },
      { key: "context-session-dedup", label: "会话去重", to: "/dashboard/context/session-dedup", icon: "content_copy" },
      { key: "context-ccr", label: "CCR 压缩", to: "/dashboard/context/ccr", icon: "archive" },
      { key: "context-llmlingua", label: "LLMLingua 压缩", to: "/dashboard/context/llmlingua", icon: "psychology" },
      { key: "context-lite", label: "轻度压缩", to: "/dashboard/context/lite", icon: "compress" },
      { key: "context-aggressive", label: "强力压缩", to: "/dashboard/context/aggressive", icon: "speed" },
      { key: "context-ultra", label: "极限压缩", to: "/dashboard/context/ultra", icon: "bolt" },
      { key: "context-omniglyph", label: "OmniGlyph 点阵压缩", to: "/dashboard/context/omniglyph", icon: "grain" },
      { key: "compression-studio", label: "压缩工作室", to: "/dashboard/compression/studio", icon: "monitoring" },
      { key: "compression-exclusions", label: "压缩排除项", to: "/dashboard/compression/exclusions", icon: "block" },
      { key: "cli-code", label: "CLI 代码", to: "/dashboard/cli-code", icon: "terminal" },
      { key: "cli-agents", label: "CLI 智能体", to: "/dashboard/cli-agents", icon: "smart_toy" },
      { key: "acp-agents", label: "ACP 智能体", to: "/dashboard/acp-agents", icon: "device_hub" },
      { key: "cloud-agents", label: "云端智能体", to: "/dashboard/cloud-agents", icon: "cloud" },
      { key: "conductor", label: "智能体编排器", to: "/dashboard/conductor", icon: "account_tree" },
      { key: "agent-bridge", label: "智能体桥接", to: "/dashboard/tools/agent-bridge", icon: "link" },
      { key: "traffic-inspector", label: "流量检查器", to: "/dashboard/tools/traffic-inspector", icon: "network_check" },
      { key: "discovery", label: "服务发现", to: "/dashboard/discovery", icon: "travel_explore" },
      { key: "api-endpoints", label: "API 端点列表", to: "/dashboard/api-endpoints", icon: "api" },
      { key: "webhooks", label: "Webhook 钩子", to: "/dashboard/webhooks", icon: "webhook" },
      { key: "proxy", label: "出站代理", to: "/dashboard/system/proxy", icon: "dns" },
    ],
  },
  {
    key: "analytics",
    title: "分析中心",
    icon: "analytics",
    items: [
      { key: "analytics-usage", label: "用量分析", to: "/dashboard/analytics", icon: "analytics" },
      { key: "analytics-combo-health", label: "组合健康度", to: "/dashboard/analytics/combo-health", icon: "monitor_heart" },
      { key: "analytics-utilization", label: "资源利用率", to: "/dashboard/analytics/utilization", icon: "bar_chart" },
      { key: "cache", label: "缓存分析", to: "/dashboard/cache", icon: "cached" },
      { key: "analytics-compression", label: "压缩分析", to: "/dashboard/analytics/compression", icon: "compress" },
      { key: "analytics-search", label: "搜索分析", to: "/dashboard/analytics/search", icon: "manage_search" },
      { key: "analytics-evals", label: "评估测试", to: "/dashboard/analytics/evals", icon: "labs" },
      { key: "provider-stats", label: "提供商性能统计", to: "/dashboard/provider-stats", icon: "speed" },
    ],
  },
  {
    key: "costs",
    title: "成本中心",
    icon: "payments",
    items: [
      { key: "costs-pricing", label: "模型定价库", to: "/dashboard/costs/pricing", icon: "price_change" },
      { key: "costs-budget", label: "预算管理", to: "/dashboard/costs/budget", icon: "savings" },
      { key: "costs-free-tiers", label: "免费额度", to: "/dashboard/free-tiers", icon: "request_quote" },
      { key: "free-provider-rankings", label: "免费提供商排行", to: "/dashboard/free-provider-rankings", icon: "leaderboard" },
      { key: "radar", label: "模型雷达", to: "/dashboard/radar", icon: "radar" },
    ],
  },
  {
    key: "monitoring",
    title: "监控中心",
    icon: "monitoring",
    items: [
      { key: "activity", label: "实时活动", to: "/dashboard/activity", icon: "timeline" },
      { key: "logs", label: "请求日志", to: "/dashboard/logs", icon: "description" },
      { key: "logs-proxy", label: "代理日志", to: "/dashboard/logs/proxy", icon: "lan" },
      { key: "logs-console", label: "控制台日志", to: "/dashboard/logs/console", icon: "terminal" },
      { key: "logs-timeline", label: "日志时间线", to: "/dashboard/logs/timeline", icon: "view_timeline" },
      { key: "conversations", label: "会话历史", to: "/dashboard/conversations", icon: "forum" },
      { key: "health", label: "系统健康", to: "/dashboard/health", icon: "health_and_safety" },
      { key: "runtime", label: "运行时监控", to: "/dashboard/runtime", icon: "bolt" },
      { key: "resilience-connections", label: "弹性连接池", to: "/dashboard/resilience/connections", icon: "shield" },
      { key: "audit", label: "安全审计", to: "/dashboard/audit", icon: "policy" },
      { key: "audit-mcp", label: "MCP 审计", to: "/dashboard/audit/mcp", icon: "security" },
      { key: "audit-a2a", label: "A2A 审计", to: "/dashboard/audit/a2a", icon: "device_hub" },
    ],
  },
  {
    key: "devtools",
    title: "开发工具",
    icon: "terminal",
    items: [
      { key: "translator", label: "协议转换器", to: "/dashboard/translator", icon: "translate" },
      { key: "playground", label: "推演游乐场", to: "/dashboard/playground", icon: "science" },
      { key: "search-tools", label: "知识搜索工具", to: "/dashboard/search-tools", icon: "manage_search" },
    ],
  },
  {
    key: "capabilities",
    title: "智能体能力",
    icon: "smart_toy",
    items: [
      { key: "mcp", label: "MCP 服务", to: "/dashboard/mcp", icon: "hub" },
      { key: "a2a", label: "A2A 智能体", to: "/dashboard/a2a", icon: "device_hub" },
      { key: "memory", label: "长期记忆", to: "/dashboard/memory", icon: "psychology" },
      { key: "agent-skills", label: "智能体技能", to: "/dashboard/agent-skills", icon: "share" },
      { key: "chaos-config", label: "混沌演练", to: "/dashboard/chaos", icon: "blender" },
      { key: "skills", label: "Omni 技能", to: "/dashboard/omni-skills", icon: "auto_fix_high" },
      { key: "plugins", label: "扩展插件", to: "/dashboard/plugins", icon: "extension" },
    ],
  },
  {
    key: "other-features",
    title: "其它功能",
    icon: "apps",
    items: [
      { key: "leaderboard", label: "模型排行榜", to: "/dashboard/leaderboard", icon: "emoji_events" },
      { key: "profile", label: "个人中心", to: "/dashboard/profile", icon: "person" },
      { key: "tokens", label: "令牌管理", to: "/dashboard/tokens", icon: "toll" },
      { key: "media", label: "媒体缓存", to: "/dashboard/cache/media", icon: "perm_media" },
      { key: "batch", label: "批处理任务", to: "/dashboard/batch", icon: "view_list" },
      { key: "batch-files", label: "批处理文件", to: "/dashboard/batch/files", icon: "folder" },
    ],
  },
  {
    key: "configuration",
    title: "系统配置",
    icon: "settings",
    items: [
      { key: "settings-general", label: "通用设置", to: "/dashboard/settings/general", icon: "tune" },
      { key: "settings-appearance", label: "外观设置", to: "/dashboard/settings/appearance", icon: "palette" },
      { key: "settings-ai", label: "AI 设置", to: "/dashboard/settings/ai", icon: "auto_awesome" },
      { key: "settings-modality-bridge", label: "多模态桥接", to: "/dashboard/settings/modality-bridge", icon: "image_search" },
      { key: "settings-security", label: "安全设置", to: "/dashboard/settings/security", icon: "shield" },
      { key: "settings-routing", label: "路由设置", to: "/dashboard/settings/routing", icon: "route" },
      { key: "settings-resilience", label: "弹性设置", to: "/dashboard/settings/resilience", icon: "health_and_safety" },
      { key: "settings-advanced", label: "高级设置", to: "/dashboard/settings/advanced", icon: "engineering" },
      { key: "settings-access-tokens", label: "访问令牌", to: "/dashboard/settings/access-tokens", icon: "key" },
      { key: "settings-feature-flags", label: "功能开关", to: "/dashboard/settings/feature-flags", icon: "flag" },
      { key: "settings-cache", label: "缓存设置", to: "/dashboard/settings/cache", icon: "memory" },
      { key: "settings-sidebar", label: "侧边栏设置", to: "/dashboard/settings/sidebar", icon: "view_sidebar" },
    ],
  },
];

export function localizeNav(sections: NavSection[], locale: AppLocale): NavSection[] {
  return sections.map((section) => ({
    ...section,
    title: translate(locale, `nav.section.${section.key}`, undefined, section.title),
    items: section.items.map((item) => ({
      ...item,
      label: translate(locale, `nav.item.${item.key}`, undefined, item.label),
    })),
  }));
}

export function applySidebarSettings(sections: NavSection[], settings?: SidebarSettings): NavSection[] {
  if (!settings) return sections;
  const hidden = new Set(settings.hiddenSidebarItems ?? []);
  const sectionOrder = settings.sidebarSectionOrder ?? [];
  const itemOrder = settings.sidebarItemOrder ?? {};
  const sectionRank = new Map(sectionOrder.map((key, index) => [key, index]));
  const orderedSections = [...sections].sort(
    (a, b) => (sectionRank.get(a.key) ?? sectionOrder.length + sections.indexOf(a)) - (sectionRank.get(b.key) ?? sectionOrder.length + sections.indexOf(b)),
  );
  return orderedSections
    .map((section) => {
      const order = itemOrder[section.key] ?? [];
      const rank = new Map(order.map((key, index) => [key, index]));
      const items = section.items
        .filter((item) => !hidden.has(item.key))
        .sort((a, b) => (rank.get(a.key) ?? order.length + section.items.indexOf(a)) - (rank.get(b.key) ?? order.length + section.items.indexOf(b)));
      return { ...section, items };
    })
    .filter((section) => section.items.length > 0);
}

export function flattenNav(sections: NavSection[] = NAV_SECTIONS): NavItem[] {
  return sections.flatMap((s) => s.items);
}

export function navTitleForPath(pathname: string, sections: NavSection[] = NAV_SECTIONS): string {
  for (const item of flattenNav(sections)) {
    if (pathname.startsWith(item.to)) return item.label;
  }
  return "智枢管理台";
}
