import { syncRadarIntel } from "@orbit/core/radar/sync/intel";
import { authorize, handleCorsOptions, json, internalError, withRadarSyncBody } from "../common.js";
export function OPTIONS() { return handleCorsOptions(); }
export async function POST(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  const bodyError = await withRadarSyncBody(request); if (bodyError) return bodyError;
  try { return json(await syncRadarIntel()); } catch (cause) { return internalError(cause, "Radar Intel sync failed"); }
}
