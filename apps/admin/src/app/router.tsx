/** 路由表：createBrowserRouter + 按域懒加载分包 */
import { createBrowserRouter } from "react-router-dom";
import { lazy, Suspense, type ComponentType, createElement } from "react";
import { Shell } from "@/shell/layout";
import { Spin } from "antd";
import { flattenNav } from "@/app/nav";
import { translate, useI18n } from "@/i18n";

function withSuspense(Cmp: ComponentType): ComponentType {
  return function LazyWrapper() {
    return (
      <Suspense fallback={<Spin style={{ display: "block", margin: "80px auto" }} />}>
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
const ComboControlCenter = withSuspense(lazy(() => import("@/features/combos/combo-control-center")));
const CostsPage = withSuspense(lazy(() => import("@/features/costs/costs")));
const P = (navKey: string, title: string) => placeholder(navKey, title);

const migratedPaths = new Set([
  "/home",
  "/dashboard/api-manager",
  "/dashboard/providers",
  "/dashboard/endpoint",
  "/dashboard/combos",
  "/dashboard/quota",
  "/dashboard/analytics",
  "/dashboard/costs",
  "/costs",
  "/dashboard/cache",
  "/dashboard/provider-stats",
  "/dashboard/activity",
  "/dashboard/logs",
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
      { path: "dashboard/providers/new", element: <ProviderEditorPage /> },
      { path: "dashboard/providers/:providerId/connections/:id", element: <ProviderEditorPage /> },
      { path: "dashboard/providers/:id", element: <ProviderDetailPage /> },
      { path: "dashboard/combos", element: <CombosPage /> },
      { path: "dashboard/combos/:id", element: <ComboControlCenter /> },
      { path: "dashboard/quota", element: createElement(P("quota", "Provider Quota")) },
      // 分析
      { path: "dashboard/analytics", element: createElement(P("analytics", "Usage")) },
      { path: "dashboard/costs", element: <CostsPage /> },
      { path: "costs", element: <CostsPage /> },
      { path: "dashboard/cache", element: createElement(P("cache", "Cache")) },
      { path: "dashboard/provider-stats", element: createElement(P("provider-stats", "Provider Stats")) },
      // 监控
      { path: "dashboard/activity", element: createElement(P("activity", "Activity")) },
      { path: "dashboard/logs", element: createElement(P("logs", "Request Logs")) },
      { path: "dashboard/health", element: createElement(P("health", "Health")) },
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
