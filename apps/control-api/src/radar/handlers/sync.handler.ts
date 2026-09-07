import { syncRadar } from "@orbit/core/radar/sync/catalog";
import { authorize, handleCorsOptions, json, internalError, withRadarSyncBody } from "../common.js";
export function OPTIONS() { return handleCorsOptions(); }
export async function POST(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  const bodyError = await withRadarSyncBody(request); if (bodyError) return bodyError;
  try { return json(await syncRadar()); } catch (cause) { return internalError(cause, "Radar sync failed"); }
}
