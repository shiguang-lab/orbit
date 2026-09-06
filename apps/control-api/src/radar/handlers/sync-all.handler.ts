import { syncRadar } from "@shiguang-gateway/core-domain/control/radar-sync";
import { syncRadarIntel } from "@shiguang-gateway/core-domain/control/radar-intel-sync";
import { syncRadarOffers } from "@shiguang-gateway/core-domain/control/radar-offers-sync";
import { syncRadarReferrals } from "@shiguang-gateway/core-domain/control/radar-referrals-sync";
import { authorize, handleCorsOptions, json, internalError, withRadarSyncBody } from "../common.js";
export function OPTIONS() { return handleCorsOptions(); }
export async function POST(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  const bodyError = await withRadarSyncBody(request); if (bodyError) return bodyError;
  try { return json({ catalog: await syncRadar(), referrals: await syncRadarReferrals(), offers: await syncRadarOffers(), intel: await syncRadarIntel() }); }
  catch (cause) { return internalError(cause, "Radar aggregate sync failed"); }
}
