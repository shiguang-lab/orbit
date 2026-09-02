/** 路由表：createBrowserRouter + 按域懒加载分包 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense, type ComponentType, createElement } from "react";
import { Shell } from "@/shell/layout";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { flattenNav } from "@/app/nav";
import { translate, useI18n } from "@/i18n";

function withSuspense(Cmp: ComponentType): ComponentType {
  return function LazyWrapper() {
    return (
      <Suspense fallback={<PageSkeleton />}>
        <Cmp />
      </Suspense>
    );
  };
}

// 占位页（后续按域逐个实现）
function placeholder(navKey: string, fallbackTitle: string): ComponentType {
  return function Placeholder() {
    const { locale, t } = useI18n();
    return createElement(
      "div",
      { style: { padding: 24 } },
      createElement("h2", null, navKey === "not-found" ? t("placeholder.notFound") : translate(locale, `nav.item.${navKey}`, undefined, fallbackTitle)),
      createElement("p", { style: { opacity: 0.6 } }, t("placeholder.migrating")),
    );
  };
}

const HomePage = withSuspense(lazy(() => import("@/features/home/home")));
const EndpointsPage = withSuspense(lazy(() => import("@/features/endpoints/endpoints")));
const ApiManagerPage = withSuspense(lazy(() => import("@/features/api-manager/api-manager")));
const ProvidersPage = withSuspense(lazy(() => import("@/features/providers/providers")));
const ProviderEditorPage = withSuspense(lazy(() => import("@/features/providers/provider-editor")));
const ProviderDetailPage = withSuspense(lazy(() => import("@/features/providers/provider-detail")));
const CombosPage = withSuspense(lazy(() => import("@/features/combos/combos")));
const CombosLivePage = withSuspense(lazy(() => import("@/features/combos/combos-live")));
const ComboControlCenter = withSuspense(lazy(() => import("@/features/combos/combo-control-center")));
const AnalyticsPage = withSuspense(lazy(() => import("@/features/analytics/analytics")));
const QuotaPage = withSuspense(lazy(() => import("@/features/quota/quota")));
const QuotaSharePage = withSuspense(lazy(() => import("@/features/quota-share/quota-share")));
const ActivityPage = withSuspense(lazy(() => import("@/features/activity/activity")));
const RequestLogsPage = withSuspense(lazy(() => import("@/features/logs/request-logs")));
const ProxyLogsPage = withSuspense(lazy(() => import("@/features/logs/proxy-logs")));
const ConsoleLogsPage = withSuspense(lazy(() => import("@/features/logs/console-logs")));
const LogTimelinePage = withSuspense(lazy(() => import("@/features/logs/log-timeline")));
const ConversationsPage = withSuspense(lazy(() => import("@/features/conversations/conversations")));
const HealthPage = withSuspense(lazy(() => import("@/features/health/health")));
const EmbeddedServicesPage = withSuspense(lazy(() => import("@/features/services/embedded-services")));
const CompressionSettingsPage = withSuspense(lazy(() => import("@/features/compression/compression-settings")));
const CompressionCombosPage = withSuspense(lazy(() => import("@/features/compression/compression-combos")));
const CavemanContextPage = withSuspense(lazy(() => import("@/features/context/caveman")));
const RtkContextPage = withSuspense(lazy(() => import("@/features/context/rtk")));
const HeadroomContextPage = withSuspense(lazy(() => import("@/features/context/engine-detail").then((m) => ({ default: m.HeadroomContextPage }))));
const SessionDedupContextPage = withSuspense(lazy(() => import("@/features/context/engine-detail").then((m) => ({ default: m.SessionDedupContextPage }))));
const CcrContextPage = withSuspense(lazy(() => import("@/features/context/engine-detail").then((m) => ({ default: m.CcrContextPage }))));
const LlmlinguaContextPage = withSuspense(lazy(() => import("@/features/context/engine-detail").then((m) => ({ default: m.LlmlinguaContextPage }))));
const LiteContextPage = withSuspense(lazy(() => import("@/features/context/engine-detail").then((m) => ({ default: m.LiteContextPage }))));
const AggressiveContextPage = withSuspense(lazy(() => import("@/features/context/engine-detail").then((m) => ({ default: m.AggressiveContextPage }))));
const UltraContextPage = withSuspense(lazy(() => import("@/features/context/engine-detail").then((m) => ({ default: m.UltraContextPage }))));
const OmniglyphContextPage = withSuspense(lazy(() => import("@/features/context/omniglyph")));
const CompressionStudioPage = withSuspense(lazy(() => import("@/features/compression/compression-studio")));
const CompressionExclusionsPage = withSuspense(lazy(() => import("@/features/compression/compression-exclusions")));
const CliCodePage = withSuspense(lazy(() => import("@/features/agents/cli-code")));
const CliAgentsPage = withSuspense(lazy(() => import("@/features/agents/cli-agents")));
const AcpAgentsPage = withSuspense(lazy(() => import("@/features/agents/acp-agents")));
const CloudAgentsPage = withSuspense(lazy(() => import("@/features/agents/cloud-agents")));
const ConductorPage = withSuspense(lazy(() => import("@/features/agents/conductor")));
const AgentBridgePage = withSuspense(lazy(() => import("@/features/tools/agent-bridge")));
const TrafficInspectorPage = withSuspense(lazy(() => import("@/features/tools/traffic-inspector")));
const DiscoveryPage = withSuspense(lazy(() => import("@/features/discovery/discovery")));
const ApiEndpointsPage = withSuspense(lazy(() => import("@/features/endpoints/api-endpoints")));
const WebhooksPage = withSuspense(lazy(() => import("@/features/webhooks/webhooks")));
const SystemProxyPage = withSuspense(lazy(() => import("@/features/system/proxy")));
const ComboHealthPage = withSuspense(lazy(() => import("@/features/analytics/combo-health")));
const UtilizationPage = withSuspense(lazy(() => import("@/features/analytics/utilization")));
const CachePage = withSuspense(lazy(() => import("@/features/cache/cache")));
const CompressionAnalyticsPage = withSuspense(lazy(() => import("@/features/analytics/compression-analytics")));
const SearchAnalyticsPage = withSuspense(lazy(() => import("@/features/analytics/search-analytics")));
const EvalsPage = withSuspense(lazy(() => import("@/features/analytics/evals")));
const ProviderStatsPage = withSuspense(lazy(() => import("@/features/analytics/provider-stats")));
const P = (navKey: string, title: string) => placeholder(navKey, title);

const migratedPaths = new Set([
  "/home",
  "/dashboard/api-manager",
  "/dashboard/providers",
  "/dashboard/providers/services",
  "/dashboard/services",
  "/dashboard/endpoint",
  "/dashboard/combos",
  "/dashboard/combos/live",
  "/dashboard/quota",
  "/dashboard/costs/quota-share",
  "/dashboard/quota-share",
  "/dashboard/context/settings",
  "/dashboard/compression/settings",
  "/dashboard/context/combos",
  "/dashboard/compression/combos",
  "/dashboard/context/caveman",
  "/dashboard/context/rtk",
  "/dashboard/context/headroom",
  "/dashboard/context/session-dedup",
  "/dashboard/context/ccr",
  "/dashboard/context/llmlingua",
  "/dashboard/context/lite",
  "/dashboard/context/aggressive",
  "/dashboard/context/ultra",
  "/dashboard/context/omniglyph",
  "/dashboard/compression/studio",
  "/dashboard/compression/exclusions",
  "/dashboard/cli-code",
  "/dashboard/cli-agents",
  "/dashboard/acp-agents",
  "/dashboard/cloud-agents",
  "/dashboard/conductor",
  "/dashboard/tools/agent-bridge",
  "/dashboard/tools/traffic-inspector",
  "/dashboard/discovery",
  "/dashboard/api-endpoints",
  "/dashboard/webhooks",
  "/dashboard/system/proxy",
  "/dashboard/analytics",
  "/analytics",
  "/dashboard/analytics/combo-health",
  "/dashboard/analytics/utilization",
  "/dashboard/cache",
  "/dashboard/analytics/compression",
  "/dashboard/analytics/search",
  "/dashboard/analytics/evals",
  "/dashboard/provider-stats",
  "/dashboard/activity",
  "/dashboard/logs",
  "/dashboard/logs/proxy",
  "/dashboard/logs/console",
  "/dashboard/logs/timeline",
  "/dashboard/conversations",
  "/dashboard/health",
  "/dashboard/runtime",
  "/dashboard/audit",
  "/dashboard/mcp",
  "/dashboard/a2a",
  "/dashboard/memory",
  "/dashboard/plugins",
  "/dashboard/batch",
  "/dashboard/settings/general",
  "/dashboard/settings/security",
  "/dashboard/settings/routing",
]);
const migratedMenuRoutes = flattenNav()
  .filter((item) => !migratedPaths.has(item.to) && !item.to.startsWith("http"))
  .map((item) => ({ path: item.to.replace(/^\//, ""), element: createElement(P(item.key, item.label)) }));

export const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <HomePage /> },
      { path: "home", element: <HomePage /> },
      { path: "dashboard/endpoint", element: <EndpointsPage /> },
      { path: "dashboard/api-manager", element: <ApiManagerPage /> },
      { path: "dashboard/providers", element: <ProvidersPage /> },
      { path: "dashboard/providers/services", element: <EmbeddedServicesPage /> },
      { path: "dashboard/services", element: <Navigate to="/dashboard/providers/services" replace /> },
      { path: "dashboard/providers/new", element: <ProviderEditorPage /> },
      { path: "dashboard/providers/:providerId/connections/:id", element: <ProviderEditorPage /> },
      { path: "dashboard/providers/:id", element: <ProviderDetailPage /> },
      { path: "dashboard/combos", element: <CombosPage /> },
      { path: "dashboard/combos/live", element: <CombosLivePage /> },
      { path: "dashboard/combos/:id", element: <ComboControlCenter /> },
      { path: "dashboard/quota", element: <QuotaPage /> },
      { path: "dashboard/costs/quota-share", element: <QuotaSharePage /> },
      { path: "dashboard/quota-share", element: <QuotaSharePage /> },
      // 压缩与上下文
      { path: "dashboard/context/settings", element: <CompressionSettingsPage /> },
      { path: "dashboard/compression/settings", element: <Navigate to="/dashboard/context/settings" replace /> },
      { path: "dashboard/context/combos", element: <CompressionCombosPage /> },
      { path: "dashboard/compression/combos", element: <Navigate to="/dashboard/context/combos" replace /> },
      { path: "dashboard/context/caveman", element: <CavemanContextPage /> },
      { path: "dashboard/context/rtk", element: <RtkContextPage /> },
      { path: "dashboard/context/headroom", element: <HeadroomContextPage /> },
      { path: "dashboard/context/session-dedup", element: <SessionDedupContextPage /> },
      { path: "dashboard/context/ccr", element: <CcrContextPage /> },
      { path: "dashboard/context/llmlingua", element: <LlmlinguaContextPage /> },
      { path: "dashboard/context/lite", element: <LiteContextPage /> },
      { path: "dashboard/context/aggressive", element: <AggressiveContextPage /> },
      { path: "dashboard/context/ultra", element: <UltraContextPage /> },
      { path: "dashboard/context/omniglyph", element: <OmniglyphContextPage /> },
      { path: "dashboard/compression/studio", element: <CompressionStudioPage /> },
      { path: "dashboard/compression/exclusions", element: <CompressionExclusionsPage /> },
      // 智能体与网关工具
      { path: "dashboard/cli-code", element: <CliCodePage /> },
      { path: "dashboard/cli-agents", element: <CliAgentsPage /> },
      { path: "dashboard/acp-agents", element: <AcpAgentsPage /> },
      { path: "dashboard/cloud-agents", element: <CloudAgentsPage /> },
      { path: "dashboard/conductor", element: <ConductorPage /> },
      { path: "dashboard/tools/agent-bridge", element: <AgentBridgePage /> },
      { path: "dashboard/tools/traffic-inspector", element: <TrafficInspectorPage /> },
      { path: "dashboard/discovery", element: <DiscoveryPage /> },
      { path: "dashboard/api-endpoints", element: <ApiEndpointsPage /> },
      { path: "dashboard/webhooks", element: <WebhooksPage /> },
      { path: "dashboard/system/proxy", element: <SystemProxyPage /> },
      // 分析
      { path: "dashboard/analytics", element: <AnalyticsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "dashboard/analytics/combo-health", element: <ComboHealthPage /> },
      { path: "dashboard/analytics/utilization", element: <UtilizationPage /> },
      { path: "dashboard/cache", element: <CachePage /> },
      { path: "dashboard/analytics/compression", element: <CompressionAnalyticsPage /> },
      { path: "dashboard/analytics/search", element: <SearchAnalyticsPage /> },
      { path: "dashboard/analytics/evals", element: <EvalsPage /> },
      { path: "dashboard/provider-stats", element: <ProviderStatsPage /> },
      { path: "dashboard/costs", element: <Navigate to="/dashboard/analytics" replace /> },
      { path: "costs", element: <Navigate to="/dashboard/analytics" replace /> },
      // 监控
      { path: "dashboard/activity", element: <ActivityPage /> },
      { path: "activity", element: <ActivityPage /> },
      { path: "dashboard/logs/activity", element: <Navigate to="/dashboard/activity" replace /> },
      { path: "dashboard/logs", element: <RequestLogsPage /> },
      { path: "logs", element: <RequestLogsPage /> },
      { path: "dashboard/logs/proxy", element: <ProxyLogsPage /> },
      { path: "dashboard/logs/console", element: <ConsoleLogsPage /> },
      { path: "dashboard/logs/timeline", element: <LogTimelinePage /> },
      { path: "dashboard/conversations", element: <ConversationsPage /> },
      { path: "dashboard/health", element: <HealthPage /> },
      { path: "health", element: <HealthPage /> },
      { path: "dashboard/runtime", element: createElement(P("runtime", "Runtime")) },
      { path: "dashboard/audit", element: createElement(P("audit", "Audit")) },
      // 代理能力
      { path: "dashboard/mcp", element: createElement(P("mcp", "MCP")) },
      { path: "dashboard/a2a", element: createElement(P("a2a", "A2A")) },
      { path: "dashboard/memory", element: createElement(P("memory", "Memory")) },
      { path: "dashboard/plugins", element: createElement(P("plugins", "Plugins")) },
      { path: "dashboard/batch", element: createElement(P("batch", "Batch")) },
      // 配置
      { path: "dashboard/settings/general", element: createElement(P("settings-general", "General Settings")) },
      { path: "dashboard/settings/security", element: createElement(P("settings-security", "Security")) },
      { path: "dashboard/settings/routing", element: createElement(P("settings-routing", "Routing")) },
      ...migratedMenuRoutes,
      // 兜底
      { path: "*", element: createElement(P("not-found", "Page not found")) },
    ],
  },
]);
