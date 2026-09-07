import { getRadarCatalog } from "@orbit/core/radar/read";
import { authorize, error, handleCorsOptions, json, internalError } from "../common.js";

export function OPTIONS() { return handleCorsOptions(); }
export async function GET(request: Request) {
  const auth = await authorize(request); if (auth) return auth;
  try { const result = getRadarCatalog(); return json({ entries: result.entries, meta: result.meta }, { headers: { "Cache-Control": "no-store" } }); }
  catch (cause) { return internalError(cause, "Failed to load Radar catalog"); }
}
