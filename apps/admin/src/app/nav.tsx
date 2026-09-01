/**
 * 侧栏导航配置：模块级常量，路由匹配 selectedKeys。
 * 图标名称与线上 OmniRoute Orbit 侧栏保持一致，使用本地 Material Symbols 字体渲染。
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
  const style: CSSProperties = { color: NAV_ICON_ACCENTS[itemKey] };
  return (
    <span className="ant-menu-item-icon" aria-hidden="true">
      <span className="material-symbols-outlined sidebar-menu-icon" style={style}>
        {name}
      </span>
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
 * Complete dashboard inventory mirrored from Orbit's sidebar source. The
 * server settings below decide visibility/order; this list is the route
 * contract, not the user's persisted menu state.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    key: "home",
    title: "首页",
    items: [{ key: "home", label: "首页", to: "/home", icon: "home" }],
  },
  {
    key: "omni-proxy",
    title: "OmniProxy",
    items: [
      { key: "endpoints", label: "Endpoints", to: "/dashboard/endpoint", icon: "api" },
      { key: "api-manager", label: "API Manager", to: "/dashboard/api-manager", icon: "vpn_key" },
      { key: "providers", label: "Providers", to: "/dashboard/providers", icon: "dns" },
      { key: "embedded-services", label: "Embedded Services", to: "/dashboard/providers/services", icon: "deployed_code" },
      { key: "combos", label: "Combos", to: "/dashboard/combos", icon: "layers" },
      { key: "combos-live", label: "Combo Studio", to: "/dashboard/combos/live", icon: "account_tree" },
      { key: "quota", label: "Provider Quota", to: "/dashboard/quota", icon: "tune" },
      { key: "costs-quota-share", label: "Quota Share", to: "/dashboard/costs/quota-share", icon: "pie_chart" },
      { key: "context-settings", label: "Compression Settings", to: "/dashboard/context/settings", icon: "settings" },
      { key: "context-combos", label: "Compression Combos", to: "/dashboard/context/combos", icon: "hub" },
      { key: "context-caveman", label: "Caveman", to: "/dashboard/context/caveman", icon: "compress" },
      { key: "context-rtk", label: "RTK", to: "/dashboard/context/rtk", icon: "filter_alt" },
      { key: "context-headroom", label: "Headroom", to: "/dashboard/context/headroom", icon: "table_rows" },
      { key: "context-session-dedup", label: "Session Dedup", to: "/dashboard/context/session-dedup", icon: "content_copy" },
      { key: "context-ccr", label: "CCR", to: "/dashboard/context/ccr", icon: "archive" },
      { key: "context-llmlingua", label: "LLMLingua", to: "/dashboard/context/llmlingua", icon: "psychology" },
      { key: "context-lite", label: "Compression Lite", to: "/dashboard/context/lite", icon: "compress" },
      { key: "context-aggressive", label: "Compression Aggressive", to: "/dashboard/context/aggressive", icon: "speed" },
      { key: "context-ultra", label: "Compression Ultra", to: "/dashboard/context/ultra", icon: "bolt" },
      { key: "context-omniglyph", label: "OmniGlyph", to: "/dashboard/context/omniglyph", icon: "grain" },
      { key: "compression-studio", label: "Compression Studio", to: "/dashboard/compression/studio", icon: "monitoring" },
      { key: "compression-exclusions", label: "Compression Exclusions", to: "/dashboard/compression/exclusions", icon: "block" },
      { key: "cli-code", label: "CLI Code", to: "/dashboard/cli-code", icon: "terminal" },
      { key: "cli-agents", label: "CLI Agents", to: "/dashboard/cli-agents", icon: "smart_toy" },
      { key: "acp-agents", label: "ACP Agents", to: "/dashboard/acp-agents", icon: "device_hub" },
      { key: "cloud-agents", label: "Cloud Agents", to: "/dashboard/cloud-agents", icon: "cloud" },
      { key: "conductor", label: "Conductor", to: "/dashboard/conductor", icon: "account_tree" },
      { key: "agent-bridge", label: "Agent Bridge", to: "/dashboard/tools/agent-bridge", icon: "link" },
      { key: "traffic-inspector", label: "Traffic Inspector", to: "/dashboard/tools/traffic-inspector", icon: "network_check" },
      { key: "discovery", label: "Discovery", to: "/dashboard/discovery", icon: "travel_explore" },
      { key: "api-endpoints", label: "API Endpoints", to: "/dashboard/api-endpoints", icon: "api" },
      { key: "webhooks", label: "Webhooks", to: "/dashboard/webhooks", icon: "webhook" },
      { key: "proxy", label: "Proxy", to: "/dashboard/system/proxy", icon: "dns" },
    ],
  },
  {
    key: "analytics",
    title: "Analytics",
    items: [
      { key: "analytics", label: "Usage", to: "/dashboard/analytics", icon: "analytics" },
      { key: "analytics-combo-health", label: "Combo Health", to: "/dashboard/analytics/combo-health", icon: "monitor_heart" },
      { key: "analytics-utilization", label: "Utilization", to: "/dashboard/analytics/utilization", icon: "bar_chart" },
      { key: "costs", label: "Costs", to: "/dashboard/costs", icon: "account_balance_wallet" },
      { key: "cache", label: "Cache", to: "/dashboard/cache", icon: "cached" },
      { key: "analytics-compression", label: "Compression", to: "/dashboard/analytics/compression", icon: "compress" },
      { key: "analytics-search", label: "Search", to: "/dashboard/analytics/search", icon: "manage_search" },
      { key: "analytics-evals", label: "Evaluations", to: "/dashboard/analytics/evals", icon: "labs" },
      { key: "provider-stats", label: "Provider Stats", to: "/dashboard/provider-stats", icon: "speed" },
    ],
  },
  {
    key: "costs",
    title: "Costs",
    items: [
      { key: "costs-pricing", label: "Pricing", to: "/dashboard/costs/pricing", icon: "price_change" },
      { key: "costs-budget", label: "Budget", to: "/dashboard/costs/budget", icon: "savings" },
      { key: "costs-free-tiers", label: "Free Tiers", to: "/dashboard/free-tiers", icon: "request_quote" },
      { key: "free-provider-rankings", label: "Free Provider Rankings", to: "/dashboard/free-provider-rankings", icon: "leaderboard" },
      { key: "radar", label: "Radar", to: "/dashboard/radar", icon: "radar" },
    ],
  },
  {
    key: "monitoring",
    title: "Monitoring",
    items: [
      { key: "activity", label: "Activity", to: "/dashboard/activity", icon: "timeline" },
      { key: "logs", label: "Request Logs", to: "/dashboard/logs", icon: "description" },
      { key: "logs-proxy", label: "Proxy Logs", to: "/dashboard/logs/proxy", icon: "lan" },
      { key: "logs-console", label: "Console Logs", to: "/dashboard/logs/console", icon: "terminal" },
      { key: "logs-timeline", label: "Log Timeline", to: "/dashboard/logs/timeline", icon: "view_timeline" },
      { key: "conversations", label: "Conversations", to: "/dashboard/conversations", icon: "forum" },
      { key: "health", label: "Health", to: "/dashboard/health", icon: "health_and_safety" },
      { key: "runtime", label: "Runtime", to: "/dashboard/runtime", icon: "bolt" },
      { key: "resilience-connections", label: "Resilience", to: "/dashboard/resilience/connections", icon: "shield" },
      { key: "audit", label: "Audit", to: "/dashboard/audit", icon: "policy" },
      { key: "audit-mcp", label: "MCP Audit", to: "/dashboard/audit/mcp", icon: "security" },
      { key: "audit-a2a", label: "A2A Audit", to: "/dashboard/audit/a2a", icon: "device_hub" },
    ],
  },
  {
    key: "devtools",
    title: "Dev Tools",
    items: [
      { key: "translator", label: "Translator", to: "/dashboard/translator", icon: "translate" },
      { key: "playground", label: "Playground", to: "/dashboard/playground", icon: "science" },
      { key: "search-tools", label: "Search Tools", to: "/dashboard/search-tools", icon: "manage_search" },
    ],
  },
  {
    key: "capabilities",
    title: "Agentic Features",
    items: [
      { key: "mcp", label: "MCP", to: "/dashboard/mcp", icon: "hub" },
      { key: "a2a", label: "A2A", to: "/dashboard/a2a", icon: "device_hub" },
      { key: "memory", label: "Memory", to: "/dashboard/memory", icon: "psychology" },
      { key: "agent-skills", label: "Agent Skills", to: "/dashboard/agent-skills", icon: "share" },
      { key: "chaos-config", label: "Chaos Mode", to: "/dashboard/chaos", icon: "blender" },
      { key: "skills", label: "Omni Skills", to: "/dashboard/omni-skills", icon: "auto_fix_high" },
      { key: "plugins", label: "Plugins", to: "/dashboard/plugins", icon: "extension" },
    ],
  },
  {
    key: "other-features",
    title: "Other Features",
    items: [
      { key: "leaderboard", label: "Leaderboard", to: "/dashboard/leaderboard", icon: "emoji_events" },
      { key: "profile", label: "Profile", to: "/dashboard/profile", icon: "person" },
      { key: "tokens", label: "Tokens", to: "/dashboard/tokens", icon: "toll" },
      { key: "media", label: "Media", to: "/dashboard/cache/media", icon: "perm_media" },
      { key: "batch", label: "Batch", to: "/dashboard/batch", icon: "view_list" },
      { key: "batch-files", label: "Batch Files", to: "/dashboard/batch/files", icon: "folder" },
    ],
  },
  {
    key: "configuration",
    title: "Configuration",
    items: [
      { key: "settings-general", label: "General", to: "/dashboard/settings/general", icon: "tune" },
      { key: "settings-appearance", label: "Appearance", to: "/dashboard/settings/appearance", icon: "palette" },
      { key: "settings-ai", label: "AI Settings", to: "/dashboard/settings/ai", icon: "auto_awesome" },
      { key: "settings-modality-bridge", label: "Modality Bridge", to: "/dashboard/settings/modality-bridge", icon: "image_search" },
      { key: "settings-security", label: "Security", to: "/dashboard/settings/security", icon: "shield" },
      { key: "settings-routing", label: "Routing", to: "/dashboard/settings/routing", icon: "route" },
      { key: "settings-resilience", label: "Resilience", to: "/dashboard/settings/resilience", icon: "health_and_safety" },
      { key: "settings-advanced", label: "Advanced", to: "/dashboard/settings/advanced", icon: "engineering" },
      { key: "settings-access-tokens", label: "Access Tokens", to: "/dashboard/settings/access-tokens", icon: "key" },
      { key: "settings-feature-flags", label: "Feature Flags", to: "/dashboard/settings/feature-flags", icon: "flag" },
      { key: "settings-cache", label: "Cache Settings", to: "/dashboard/settings/cache", icon: "memory" },
      { key: "settings-sidebar", label: "Sidebar", to: "/dashboard/settings/sidebar", icon: "view_sidebar" },
    ],
  },
  {
    key: "help",
    title: "Help",
    items: [
      { key: "docs", label: "Docs", to: "/docs", icon: "menu_book" },
      { key: "issues", label: "Issues", to: "https://github.com/diegosouzapw/OmniRoute/issues", icon: "bug_report" },
      { key: "changelog", label: "Changelog", to: "/dashboard/changelog", icon: "campaign" },
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
