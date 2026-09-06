import { Injectable } from "@nestjs/common";
import {
  getSettings,
  updateSettings,
} from "@shiguang-gateway/core-domain/control/settings";
import { getAuditRequestContext, logAuditEvent } from "@shiguang-gateway/core-domain/control/compliance";
import { QuotaStoreSettingsSchema } from "@shiguang-gateway/core-domain/quota/schemas";
import {
  getQuotaAnalyticsSummary,
  getActiveQuotaResetItems,
  resetExpiredQuotaWindows,
  clearProviderQuota,
  resetQuotaStoreSingleton,
} from "@shiguang-gateway/core-domain/quota/state";

function quotaStoreResponse(driver: string, redisUrlConfigured: boolean) {
  return { driver, redisUrlConfigured, redisUrl: null };
}

@Injectable()
export class QuotaSettingsService {
  async get() {
    const settings = await getSettings();
    const raw = settings.quotaStore;
    let driver = process.env.QUOTA_STORE_DRIVER ?? "sqlite";
    let redisUrlConfigured = Boolean(process.env.QUOTA_STORE_REDIS_URL);
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
      const value = raw as Record<string, unknown>;
      if (typeof value.driver === "string") driver = value.driver;
      if (typeof value.redisUrl === "string" && value.redisUrl.length > 0) redisUrlConfigured = true;
    }
    return quotaStoreResponse(driver, redisUrlConfigured);
  }

  async update(body: unknown, request: Request) {
    const parsed = QuotaStoreSettingsSchema.safeParse(body);
    if (!parsed.success) return { error: parsed.error.message, status: 400 } as const;
    const { driver, redisUrl } = parsed.data;
    if (driver === "redis" && !redisUrl) {
      return { error: "Redis URL is required when driver is set to 'redis'", status: 400 } as const;
    }
    const quotaStore: Record<string, unknown> = { driver };
    if (redisUrl) quotaStore.redisUrl = redisUrl;
    await updateSettings({ quotaStore });
    resetQuotaStoreSingleton();
    const ctx = getAuditRequestContext(request);
    logAuditEvent({
      action: "quota.store.driver_changed",
      metadata: { driver, redisUrlConfigured: Boolean(redisUrl) },
      ipAddress: ctx.ipAddress ?? undefined,
      requestId: ctx.requestId,
    });
    return quotaStoreResponse(driver, Boolean(redisUrl));
  }
}

@Injectable()
export class QuotaStateService {
  get() {
    return {
      success: true,
      analytics: getQuotaAnalyticsSummary(),
      resetTimers: getActiveQuotaResetItems(),
      timestamp: new Date().toISOString(),
    };
  }

  resetExpired() {
    const resetCount = resetExpiredQuotaWindows();
    return { success: true, resetCount, message: `Reset ${resetCount} expired quota windows.` };
  }

  clearConnection(connectionId: string, model: string) {
    clearProviderQuota(connectionId);
    return { success: true, message: `Cleared quota state for connection ${connectionId} (${model}).` };
  }
}
