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
  ],
})
export class AppModule {}
