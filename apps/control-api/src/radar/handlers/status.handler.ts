import { getRadarCache, getRadarIntelCache, getRadarOffersCache, getRadarReferralsCache, getRadarSettings } from "@shiguang-gateway/core-domain/radar/store";
import { authorize, handleCorsOptions, json, internalError } from "../common.js";
export function OPTIONS() { return handleCorsOptions(); }
function cacheStatus(cache: { version?: string; generatedAt?: string | null; tier: string; fetchedAt: string } | null) {
  if (!cache) return { available: false };
  return { available: true, version: cache.version ?? cache.generatedAt, ...(Object.prototype.hasOwnProperty.call(cache, "generatedAt") ? { generatedAt: cache.generatedAt ?? null } : {}), tier: cache.tier, fetchedAt: cache.fetchedAt };
}
export async function GET(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  try {
    const settings = getRadarSettings();
    return json({ settings: { optIn: settings.optIn, hasSupporterKey: settings.supporterKey !== null }, feeds: { catalog: cacheStatus(getRadarCache()), referrals: cacheStatus(getRadarReferralsCache()), offers: cacheStatus(getRadarOffersCache()), intel: cacheStatus(getRadarIntelCache()) } }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) { return internalError(cause, "Failed to load Radar status"); }
}
