import { Module } from "@nestjs/common";
import { HealthModule as ProcessHealthModule, HttpKernelModule } from "@shiguang-gateway/http-kernel";
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
import { EvalsModule } from "./evals/evals.module.js";
import { AssessmentModule } from "./assessment/assessment.module.js";
import { PluginsModule } from "./plugins/plugins.module.js";
import { QuotaModule } from "./quota/quota.module.js";
import { ModelsModule } from "./models/models.module.js";
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

@Module({
  imports: [
    HttpKernelModule,
    ProcessHealthModule,
    InfrastructureModule,
    HealthModule,
    AuthModule,
    GatewayModule,
    ProvidersModule,
    KeysModule,
    AnalyticsModule,
    DbBackupsModule,
    CacheModule,
    PricingModule,
    EvalsModule,
    AssessmentModule,
    PluginsModule,
    QuotaModule,
    ModelsModule,
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
  ],
})
export class AppModule {}
