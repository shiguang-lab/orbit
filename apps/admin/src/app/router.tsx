/** 路由表：createBrowserRouter + 按域懒加载分包 */
import { createBrowserRouter, Navigate } from "react-router-dom";
import { lazy, Suspense, type ComponentType, createElement } from "react";
import { Shell } from "@/shell/layout";
import { PageSkeleton } from "@/shared/components/PageSkeleton";
import { translate, useI18n } from "@/i18n";
import LoginPage from "@/features/auth/login";

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

// 成本
const PricingPage = withSuspense(lazy(() => import("@/features/costs/pricing")));
const BudgetPage = withSuspense(lazy(() => import("@/features/costs/budget")));
const FreeTiersPage = withSuspense(lazy(() => import("@/features/costs/free-tiers")));
const FreeProviderRankingsPage = withSuspense(lazy(() => import("@/features/costs/free-provider-rankings")));
const RadarPage = withSuspense(lazy(() => import("@/features/costs/radar")));

// 监控
const RuntimePage = withSuspense(lazy(() => import("@/features/runtime/runtime")));
const ResilienceConnectionsPage = withSuspense(lazy(() => import("@/features/resilience/resilience-connections")));
const AuditPage = withSuspense(lazy(() => import("@/features/audit/audit")));
const AuditMcpPage = withSuspense(lazy(() => import("@/features/audit/audit-mcp")));
const AuditA2aPage = withSuspense(lazy(() => import("@/features/audit/audit-a2a")));

// 开发工具
const TranslatorPage = withSuspense(lazy(() => import("@/features/devtools/translator")));
const PlaygroundPage = withSuspense(lazy(() => import("@/features/devtools/playground")));
const SearchToolsPage = withSuspense(lazy(() => import("@/features/devtools/search-tools")));

// 智能体能力
const McpPage = withSuspense(lazy(() => import("@/features/capabilities/mcp")));
const A2aPage = withSuspense(lazy(() => import("@/features/capabilities/a2a")));
const MemoryPage = withSuspense(lazy(() => import("@/features/capabilities/memory")));
const AgentSkillsPage = withSuspense(lazy(() => import("@/features/capabilities/agent-skills")));
const ChaosPage = withSuspense(lazy(() => import("@/features/capabilities/chaos")));
const OmniSkillsPage = withSuspense(lazy(() => import("@/features/capabilities/omni-skills")));
const PluginsPage = withSuspense(lazy(() => import("@/features/capabilities/plugins")));

// 其它功能
const LeaderboardPage = withSuspense(lazy(() => import("@/features/other/leaderboard")));
const ProfilePage = withSuspense(lazy(() => import("@/features/other/profile")));
const TokensPage = withSuspense(lazy(() => import("@/features/other/tokens")));
const MediaPage = withSuspense(lazy(() => import("@/features/other/media")));
const BatchPage = withSuspense(lazy(() => import("@/features/other/batch")));
const BatchFilesPage = withSuspense(lazy(() => import("@/features/other/batch-files")));

// 系统配置
const SettingsGeneralPage = withSuspense(lazy(() => import("@/features/settings/settings-general")));
const SettingsAppearancePage = withSuspense(lazy(() => import("@/features/settings/settings-appearance")));
const SettingsAiPage = withSuspense(lazy(() => import("@/features/settings/settings-ai")));
const SettingsModalityBridgePage = withSuspense(lazy(() => import("@/features/settings/settings-modality-bridge")));
const SettingsSecurityPage = withSuspense(lazy(() => import("@/features/settings/settings-security")));
const SettingsRoutingPage = withSuspense(lazy(() => import("@/features/settings/settings-routing")));
const SettingsResiliencePage = withSuspense(lazy(() => import("@/features/settings/settings-resilience")));
const SettingsAdvancedPage = withSuspense(lazy(() => import("@/features/settings/settings-advanced")));
const SettingsAccessTokensPage = withSuspense(lazy(() => import("@/features/settings/settings-access-tokens")));
const SettingsFeatureFlagsPage = withSuspense(lazy(() => import("@/features/settings/settings-feature-flags")));
const SettingsCachePage = withSuspense(lazy(() => import("@/features/settings/settings-cache")));
const SettingsSidebarPage = withSuspense(lazy(() => import("@/features/settings/settings-sidebar")));

const P = (navKey: string, title: string) => placeholder(navKey, title);

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
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
      // 成本
      { path: "dashboard/costs/pricing", element: <PricingPage /> },
      { path: "dashboard/costs/budget", element: <BudgetPage /> },
      { path: "dashboard/free-tiers", element: <FreeTiersPage /> },
      { path: "dashboard/free-provider-rankings", element: <FreeProviderRankingsPage /> },
      { path: "dashboard/radar", element: <RadarPage /> },
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
      { path: "dashboard/runtime", element: <RuntimePage /> },
      { path: "dashboard/resilience/connections", element: <ResilienceConnectionsPage /> },
      { path: "dashboard/audit", element: <AuditPage /> },
      { path: "dashboard/audit/mcp", element: <AuditMcpPage /> },
      { path: "dashboard/audit/a2a", element: <AuditA2aPage /> },
      // 开发工具
      { path: "dashboard/translator", element: <TranslatorPage /> },
      { path: "dashboard/playground", element: <PlaygroundPage /> },
      { path: "dashboard/search-tools", element: <SearchToolsPage /> },
      // 智能体能力
      { path: "dashboard/mcp", element: <McpPage /> },
      { path: "dashboard/a2a", element: <A2aPage /> },
      { path: "dashboard/memory", element: <MemoryPage /> },
      { path: "dashboard/agent-skills", element: <AgentSkillsPage /> },
      { path: "dashboard/chaos", element: <ChaosPage /> },
      { path: "dashboard/omni-skills", element: <OmniSkillsPage /> },
      { path: "dashboard/plugins", element: <PluginsPage /> },
      // 其它功能
      { path: "dashboard/leaderboard", element: <LeaderboardPage /> },
      { path: "dashboard/profile", element: <ProfilePage /> },
      { path: "dashboard/tokens", element: <TokensPage /> },
      { path: "dashboard/cache/media", element: <MediaPage /> },
      { path: "dashboard/batch", element: <BatchPage /> },
      { path: "dashboard/batch/files", element: <BatchFilesPage /> },
      // 系统配置
      { path: "dashboard/settings", element: <Navigate to="/dashboard/settings/general" replace /> },
      { path: "dashboard/settings/general", element: <SettingsGeneralPage /> },
      { path: "dashboard/settings/appearance", element: <SettingsAppearancePage /> },
      { path: "dashboard/settings/ai", element: <SettingsAiPage /> },
      { path: "dashboard/settings/modality-bridge", element: <SettingsModalityBridgePage /> },
      { path: "dashboard/settings/security", element: <SettingsSecurityPage /> },
      { path: "dashboard/settings/routing", element: <SettingsRoutingPage /> },
      { path: "dashboard/settings/resilience", element: <SettingsResiliencePage /> },
      { path: "dashboard/settings/advanced", element: <SettingsAdvancedPage /> },
      { path: "dashboard/settings/access-tokens", element: <SettingsAccessTokensPage /> },
      { path: "dashboard/settings/feature-flags", element: <SettingsFeatureFlagsPage /> },
      { path: "dashboard/settings/cache", element: <SettingsCachePage /> },
      { path: "dashboard/settings/sidebar", element: <SettingsSidebarPage /> },
      { path: "dashboard/settings/pricing", element: <Navigate to="/dashboard/costs/pricing" replace /> },
      // 兜底
      { path: "*", element: createElement(P("not-found", "Page not found")) },
    ],
  },
]);
