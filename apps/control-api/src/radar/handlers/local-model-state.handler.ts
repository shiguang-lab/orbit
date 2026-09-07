import { z } from "zod";
import { clearRadarLocalModelOverride, listRadarLocalModelState, setRadarLocalModelOverride, setRadarModelTombstone } from "@orbit/core/radar/store";
import { readRequestBodyWithLimit, RequestBodyTooLargeError } from "@orbit/core/shared/body-size-guard";
import { authorize, error, handleCorsOptions, json, internalError } from "../common.js";
const providerSchema = z.string().trim().regex(/^[a-z0-9][a-z0-9._-]{0,99}$/i);
const modelIdSchema = z.string().trim().min(1).max(200).refine((value) => !/[\u0000-\u001f\u007f]/.test(value));
const identityShape = { provider: providerSchema, modelId: modelIdSchema };
const overrideSchema = z.object({ ...identityShape, displayName: z.string().trim().min(1).max(160).refine((value) => !/[\u0000-\u001f\u007f]/.test(value)).nullable().optional(), enabled: z.boolean().nullable().optional() }).strict().refine((value) => Object.prototype.hasOwnProperty.call(value, "displayName") || Object.prototype.hasOwnProperty.call(value, "enabled"));
const tombstoneSchema = z.object({ ...identityShape, tombstoned: z.boolean() }).strict();
const identitySchema = z.object(identityShape).strict();
const limit = 4 * 1024;
async function readJson(request: Request): Promise<{ ok: true; value: unknown } | { ok: false; status: 400 | 413; message: string }> {
  try { const bytes = await readRequestBodyWithLimit(request, limit); return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown }; }
  catch (cause) { return { ok: false, status: cause instanceof RequestBodyTooLargeError ? 413 : 400, message: cause instanceof RequestBodyTooLargeError ? "Request body too large" : "Invalid request body" }; }
}
function stateResponse() { return json({ states: listRadarLocalModelState() }, { headers: { "Cache-Control": "no-store" } }); }
export function OPTIONS() { return handleCorsOptions(); }
export async function GET(request: Request) { const auth = await authorize(request); if (auth) return auth; try { return stateResponse(); } catch (cause) { return internalError(cause, "Failed to update Radar local state"); } }
export async function PATCH(request: Request) {
  const auth = await authorize(request); if (auth) return auth; const body = await readJson(request); if (!body.ok) return error(body.status, body.message); const parsed = overrideSchema.safeParse(body.value); if (!parsed.success) return error(400, "Invalid Radar local override");
  try { const { provider, modelId, displayName, enabled } = parsed.data; const patch: { displayName?: string | null; enabled?: boolean | null } = {}; if (Object.prototype.hasOwnProperty.call(parsed.data, "displayName")) patch.displayName = displayName; if (Object.prototype.hasOwnProperty.call(parsed.data, "enabled")) patch.enabled = enabled; if (!setRadarLocalModelOverride(provider, modelId, patch)) return error(400, "Invalid Radar local override"); return stateResponse(); } catch (cause) { return internalError(cause, "Failed to update Radar local state"); }
}
export async function PUT(request: Request) {
  const auth = await authorize(request); if (auth) return auth; const body = await readJson(request); if (!body.ok) return error(body.status, body.message); const parsed = tombstoneSchema.safeParse(body.value); if (!parsed.success) return error(400, "Invalid Radar tombstone");
  try { const { provider, modelId, tombstoned } = parsed.data; if (!setRadarModelTombstone(provider, modelId, tombstoned)) return error(400, "Invalid Radar tombstone"); return stateResponse(); } catch (cause) { return internalError(cause, "Failed to update Radar local state"); }
}
export async function DELETE(request: Request) {
  const auth = await authorize(request); if (auth) return auth; const parsed = identitySchema.safeParse({ provider: new URL(request.url).searchParams.get("provider"), modelId: new URL(request.url).searchParams.get("modelId") }); if (!parsed.success) return error(400, "provider and modelId are required");
  try { if (!clearRadarLocalModelOverride(parsed.data.provider, parsed.data.modelId)) return error(400, "Invalid Radar local override"); return stateResponse(); } catch (cause) { return internalError(cause, "Failed to update Radar local state"); }
}
