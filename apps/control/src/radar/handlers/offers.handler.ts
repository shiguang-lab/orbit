import { getRadarOffers } from "@orbit/core/radar/read";
import { authorize, handleCorsOptions, json, internalError } from "../common.js";
export function OPTIONS() { return handleCorsOptions(); }
export async function GET(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  try { return json(getRadarOffers(), { headers: { "Cache-Control": "no-store" } }); }
  catch (cause) { return internalError(cause, "Failed to load Radar offers"); }
}
