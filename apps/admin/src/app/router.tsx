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
  "/dashboard/analytics",
  "/analytics",
  "/dashboard/cache",
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
      // 分析
      { path: "dashboard/analytics", element: <AnalyticsPage /> },
      { path: "analytics", element: <AnalyticsPage /> },
      { path: "dashboard/costs", element: <Navigate to="/dashboard/analytics" replace /> },
      { path: "costs", element: <Navigate to="/dashboard/analytics" replace /> },
      { path: "dashboard/cache", element: createElement(P("cache", "Cache")) },
      { path: "dashboard/provider-stats", element: createElement(P("provider-stats", "Provider Stats")) },
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
