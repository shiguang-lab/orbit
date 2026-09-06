import { Module } from "@nestjs/common";
import { HttpKernelModule } from "@shiguang-gateway/http-kernel";
import { ProcessHealthModule } from "./process-health/process-health.module.js";
import { AuthModule } from "./auth/auth.module.js";
import { GatewayModule } from "./gateway/gateway.module.js";
import { HealthModule } from "./health/health.module.js";
import { InfrastructureModule } from "./infrastructure/infrastructure.module.js";
import { KeysModule } from "./keys/keys.module.js";
import { AnalyticsModule } from "./analytics/analytics.module.js";
import { DbBackupsModule } from "./db-backups/db-backups.module.js";
import { CacheModule } from "./cache/cache.module.js";
import { PricingModule } from "./pricing/pricing.module.js";
import { ProvidersModule } from "./providers/providers.module.js";
import { DiscoveryModule } from "./discovery/discovery.module.js";
import { EvalsModule } from "./evals/evals.module.js";
import { AssessmentModule } from "./assessment/assessment.module.js";
import { PoliciesModule } from "./policies/policies.module.js";
import { PluginsModule } from "./plugins/plugins.module.js";
import { QuotaModule } from "./quota/quota.module.js";
import { ModelsModule } from "./models/models.module.js";
import { ModelCapabilityOverridesModule } from "./models/model-capability-overrides.module.js";
import { CombosModule } from "./combos/combos.module.js";
import { LogsModule } from "./logs/logs.module.js";
import { WebhooksModule } from "./webhooks/webhooks.module.js";
import { MemoryModule } from "./memory/memory.module.js";
import { SettingsModule } from "./settings/settings.module.js";
import { RateLimitsModule } from "./rate-limits/rate-limits.module.js";
import { VersionManagerModule } from "./version-manager/version-manager.module.js";
import { BifrostModule } from "./bifrost/bifrost.module.js";
import { ProxyModule } from "./proxy/proxy.module.js";
import { ProxiesModule } from "./proxies/proxies.module.js";
import { CacheSettingsModule } from "./cache-settings/cache-settings.module.js";
import { SettingsSecurityModule } from "./settings/security/security.module.js";
import { SettingsConfigModule } from "./settings/config/settings-config.module.js";
import { OAuthModule } from "./oauth/oauth.module.js";
import { OneproxyModule } from "./settings/oneproxy/oneproxy.module.js";
import { TierConfigModule } from "./settings/tier-config/tier-config.module.js";
import { SystemModule } from "./system/system.module.js";
import { FreeProxiesModule } from "./settings/free-proxies/free-proxies.module.js";
import { ProviderAuthImportModule } from "./providers/auth/provider-auth-import.module.js";
import { ProviderBulkWebSessionModule } from "./providers/bulk-web-session/provider-bulk-web-session.module.js";
import { CompressionModule } from "./settings/compression/compression.module.js";
import { QdrantModule } from "./settings/qdrant/qdrant.module.js";
import { MitmModule } from "./settings/mitm/mitm.module.js";
import { ReasoningRoutingModule } from "./settings/reasoning-routing/reasoning-routing.module.js";
import { TaskRoutingModule } from "./settings/task-routing/task-routing.module.js";
import { ModelAliasesModule } from "./settings/model-aliases/model-aliases.module.js";
import { CcDiscoveryMetricsModule } from "./settings/cc-discovery-metrics/cc-discovery-metrics.module.js";
import { NotionSettingsModule } from "./settings/notion/notion.module.js";
import { ObsidianSettingsModule } from "./settings/obsidian/obsidian.module.js";
import { LocalCorpusModule } from "./settings/local-corpus/local-corpus.module.js";
import { ProxySettingsModule } from "./settings/proxy/proxy-settings.module.js";
import { QuotaSettingsModule } from "./settings/quota/quota.module.js";
import { DarioAdminModule } from "./services/dario-admin.module.js";
import { DarioModule } from "./services/dario/dario.module.js";
import { NinerouterModule } from "./services/ninerouter/ninerouter.module.js";
import { UsageModule } from "./usage/usage.module.js";
import { GamificationModule } from "./gamification/gamification.module.js";
import { CliToolsModule } from "./cli-tools/cli-tools.module.js";
import { CliproxyModule } from "./services/cliproxy/cliproxy.module.js";
import { MuxModule } from "./services/mux/mux.module.js";
import { EmbeddedServiceLogsModule } from "./services/embedded-service-logs.module.js";
import { SyncModule } from "./sync/sync.module.js";
import { RadarModule } from "./radar/radar.module.js";
import { ResilienceModule } from "./resilience/resilience.module.js";
import { ToolsModule } from "./tools/tools.module.js";
import { AgentBridgeModule } from "./tools/agent-bridge/agent-bridge.module.js";
import { RegisteredKeysModule } from "./registered-keys/registered-keys.module.js";
import { PlaygroundModule } from "./playground/playground.module.js";
import { CloudModule } from "./cloud/cloud.module.js";
import { SkillsModule } from "./skills/skills.module.js";
import { McpModule } from "./mcp/mcp.module.js";
import { CompressionManagementModule } from "./compression/compression-management.module.js";
import { ProxySubscriptionsModule } from "./proxy-subscriptions/proxy-subscriptions.module.js";
import { MiddlewareHooksModule } from "./middleware-hooks/middleware-hooks.module.js";
import { SearchProvidersModule } from "./search/providers/search-providers.module.js";
import { IssuesModule } from "./issues/issues.module.js";
import { AcpModule } from "./acp/acp.module.js";
import { CliAccessModule } from "./cli-access/cli-access.module.js";
import { BatchesModule } from "./batches/batches.module.js";
import { AgentSkillsModule } from "./agent-skills/agent-skills.module.js";
import { ConversationsModule } from "./conversations/conversations.module.js";
import { DbHealthModule } from "./db-health/db-health.module.js";
import { LocalRedisModule } from "./local-redis/local-redis.module.js";
import { StorageModule } from "./storage/storage.module.js";
import { ConductorModule } from "./conductor/conductor.module.js";
import { ChaosModule } from "./chaos/chaos.module.js";
import { AdminModule } from "./admin/admin.module.js";
import { JobsModule } from "./jobs/jobs.module.js";
import { TunnelsModule } from "./tunnels/tunnels.module.js";
import { DocsModule } from "./docs/docs.module.js";
import { GuardrailsModule } from "./guardrails/guardrails.module.js";
import { HeadroomModule } from "./headroom/headroom.module.js";
import { RelayModule } from "./relay/relay.module.js";
import { SessionsModule } from "./sessions/sessions.module.js";
import { ComplianceModule } from "./compliance/compliance.module.js";
import { FilesModule } from "./files/files.module.js";
import { FreeModelsModule } from "./free-models/free-models.module.js";
import { AuthInitModule } from "./auth-init/auth-init.module.js";
import { TagsModule } from "./tags/tags.module.js";
import { TelemetryModule } from "./telemetry/telemetry.module.js";
import { CopilotModule } from "./copilot/copilot.module.js";
import { IssueAgentModule } from "./issue-agent/issue-agent.module.js";
import { FallbackModule } from "./fallback/fallback.module.js";
import { ProxyFallbackModule } from "./proxy-fallback/proxy-fallback.module.js";
import { MonitoringModule } from "./monitoring/monitoring.module.js";
import { NetworkModule } from "./network/network.module.js";
import { FreeTierModule } from "./free-tier/free-tier.module.js";
import { SearchStatsModule } from "./search/stats/search-stats.module.js";
import { TelegramModule } from "./telegram/telegram.module.js";
import { IntelligenceModule } from "./intelligence/intelligence.module.js";
import { EmbeddedServiceProxyModule } from "./services/embedded-service-proxy.module.js";

@Module({
  imports: [
    HttpKernelModule,
    ProcessHealthModule,
    InfrastructureModule,
    HealthModule,
    AuthModule,
    GatewayModule,
    ProvidersModule,
    DiscoveryModule,
    KeysModule,
    AnalyticsModule,
    DbBackupsModule,
    CacheModule,
    PricingModule,
    EvalsModule,
    AssessmentModule,
    PoliciesModule,
    PluginsModule,
    QuotaModule,
    ModelsModule,
    ModelCapabilityOverridesModule,
    CombosModule,
    LogsModule,
    WebhooksModule,
    MemoryModule,
    SettingsModule,
    RateLimitsModule,
    VersionManagerModule,
    BifrostModule,
    ProxyModule,
    ProxiesModule,
    CacheSettingsModule,
    SettingsSecurityModule,
    SettingsConfigModule,
    OAuthModule,
    OneproxyModule,
    TierConfigModule,
    SystemModule,
    FreeProxiesModule,
    ProviderAuthImportModule,
    ProviderBulkWebSessionModule,
    CompressionModule,
    QdrantModule,
    MitmModule,
    ReasoningRoutingModule,
    TaskRoutingModule,
    ModelAliasesModule,
    CcDiscoveryMetricsModule,
    NotionSettingsModule,
    ObsidianSettingsModule,
    LocalCorpusModule,
    ProxySettingsModule,
    QuotaSettingsModule,
    DarioAdminModule,
    DarioModule,
    NinerouterModule,
    UsageModule,
    GamificationModule,
    CliToolsModule,
    CliproxyModule,
    MuxModule,
    EmbeddedServiceLogsModule,
    SyncModule,
    RadarModule,
    ResilienceModule,
    ToolsModule,
    AgentBridgeModule,
    RegisteredKeysModule,
    PlaygroundModule,
    CloudModule,
    SkillsModule,
    McpModule,
    CompressionManagementModule,
    ProxySubscriptionsModule,
    MiddlewareHooksModule,
    SearchProvidersModule,
    IssuesModule,
    AcpModule,
    CliAccessModule,
    BatchesModule,
    AgentSkillsModule,
    ConversationsModule,
    DbHealthModule,
    LocalRedisModule,
    StorageModule,
    ConductorModule,
    ChaosModule,
    AdminModule,
    JobsModule,
    TunnelsModule,
    DocsModule,
    GuardrailsModule,
    HeadroomModule,
    RelayModule,
    SessionsModule,
    ComplianceModule,
    FilesModule,
    FreeModelsModule,
    AuthInitModule,
    TagsModule,
    TelemetryModule,
    CopilotModule,
    IssueAgentModule,
    FallbackModule,
    ProxyFallbackModule,
    MonitoringModule,
    NetworkModule,
    FreeTierModule,
    SearchStatsModule,
    TelegramModule,
    IntelligenceModule,
    EmbeddedServiceProxyModule,
  ],
})
export class AppModule {}
