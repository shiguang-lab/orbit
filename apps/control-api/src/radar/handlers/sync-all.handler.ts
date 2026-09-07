import { syncRadar } from "@orbit/core/radar/sync/catalog";
import { syncRadarIntel } from "@orbit/core/radar/sync/intel";
import { syncRadarOffers } from "@orbit/core/radar/sync/offers";
import { syncRadarReferrals } from "@orbit/core/radar/sync/referrals";
import { authorize, handleCorsOptions, json, internalError, withRadarSyncBody } from "../common.js";
export function OPTIONS() { return handleCorsOptions(); }
export async function POST(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  const bodyError = await withRadarSyncBody(request); if (bodyError) return bodyError;
  try { return json({ catalog: await syncRadar(), referrals: await syncRadarReferrals(), offers: await syncRadarOffers(), intel: await syncRadarIntel() }); }
  catch (cause) { return internalError(cause, "Radar aggregate sync failed"); }
}
