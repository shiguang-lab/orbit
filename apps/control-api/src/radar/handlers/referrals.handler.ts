import { getRadarReferrals } from "@orbit/core/radar/read";
import { getRadarReferralsCache } from "@orbit/core/radar/store";
import { shouldSyncReferralsOnRead, syncRadarReferrals } from "@orbit/core/radar/sync/referrals";
import { authorize, handleCorsOptions, json, internalError } from "../common.js";
export function OPTIONS() { return handleCorsOptions(); }
export async function GET(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  try {
    const existing = getRadarReferralsCache();
    if (shouldSyncReferralsOnRead(existing?.fetchedAt ?? null, Date.now())) await syncRadarReferrals();
    const { fixed, campaigns } = getRadarReferrals();
    return json({ fixed, campaigns, tier: getRadarReferralsCache()?.tier ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) { return internalError(cause, "Failed to load Radar referrals"); }
}
