import { Module } from "@nestjs/common";
import { HttpKernelModule } from "@shiguang-gateway/http-kernel";
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
import { OneproxyModule } from "./settings/oneproxy/oneproxy.module.js";
import { TierConfigModule } from "./settings/tier-config/tier-config.module.js";
import { SystemModule } from "./system/system.module.js";
import { FreeProxiesModule } from "./settings/free-proxies/free-proxies.module.js";
import { ProviderAuthImportModule } from "./providers/auth/provider-auth-import.module.js";
import { CompressionModule } from "./settings/compression/compression.module.js";
import { QdrantModule } from "./settings/qdrant/qdrant.module.js";
import { ReasoningRoutingModule } from "./settings/reasoning-routing/reasoning-routing.module.js";
import { TaskRoutingModule } from "./settings/task-routing/task-routing.module.js";
import { ModelAliasesModule } from "./settings/model-aliases/model-aliases.module.js";
import { CcDiscoveryMetricsModule } from "./settings/cc-discovery-metrics/cc-discovery-metrics.module.js";

@Module({
  imports: [
    HttpKernelModule,
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
    OneproxyModule,
    TierConfigModule,
    SystemModule,
    FreeProxiesModule,
    ProviderAuthImportModule,
    CompressionModule,
    QdrantModule,
    ReasoningRoutingModule,
    TaskRoutingModule,
    ModelAliasesModule,
    CcDiscoveryMetricsModule,
  ],
})
export class AppModule {}
