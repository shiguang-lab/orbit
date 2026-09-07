import { z } from "zod";
import { CORS_HEADERS } from "@orbit/contracts/cors";
import { handleCorsOptions } from "../common/cors.js";
import { enforceApiKeyPolicy } from "@orbit/core/runtime/api-key-policy";
import { extractApiKey, isValidApiKey } from "@orbit/inference/services/auth";
import { buildErrorBody } from "@orbit/inference/utils/error";
import {
  isVideoBridgeDrilldownRemoteAccessEnabled,
  VIDEO_DRILLDOWN_VARIANTS,
  VideoDrilldownLifecycle,
  VideoDrilldownCache,
  type VideoDrilldownVariant,
} from "@orbit/core/edge/video-bridge-drilldown";

const sharedLifecycle = new VideoDrilldownLifecycle({
  cache: new VideoDrilldownCache({
    maxEntries: 64,
    maxEntriesPerPrincipal: 16,
    maxBytesPerPrincipal: 64 * 1024 * 1024,
    maxTotalBytes: 256 * 1024 * 1024,
    ttlMs: 10 * 60 * 1000,
  }),
});

const HandleSchema = z.string().regex(/^[0-9a-f]{64}$/, "handle must be an opaque 64-character hex value");
const VariantSchema = z.enum(VIDEO_DRILLDOWN_VARIANTS as [VideoDrilldownVariant, ...VideoDrilldownVariant[]]);
const BoundedIntSchema = z.string().regex(/^\d{1,9}$/).transform(Number);
const NonNegativeNumberSchema = z.string().refine((value) => value.length > 0 && value.length <= 64 && Number.isFinite(Number(value))).transform(Number).refine((value) => value >= 0);
const ReadQuerySchema = z.object({
  end: NonNegativeNumberSchema.optional(),
  frames: BoundedIntSchema.pipe(z.number().int().min(1).max(8)).optional(),
  handle: HandleSchema,
  page: BoundedIntSchema.pipe(z.number().int().min(0)).optional(),
  start: NonNegativeNumberSchema.optional(),
  variant: VariantSchema.optional(),
}).strict();
const DeleteQuerySchema = z.object({ handle: HandleSchema }).strict();

function corsJson(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

function corsError(status: number, message: string, type: string): Response {
  return corsJson(status, buildErrorBody(status, message, null, { type }));
}

async function resolvePrincipal(request: Request): Promise<{ error?: Response; principalId?: string }> {
  const apiKey = extractApiKey(request);
  if (!apiKey) return { error: corsError(401, "Authentication is required", "authentication_required") };
  if (!(await isValidApiKey(apiKey))) return { error: corsError(401, "The provided API key is invalid", "authentication_required") };
  const policy = await enforceApiKeyPolicy(request, null);
  if (policy.rejection) return { error: policy.rejection };
  const principalId = policy.apiKeyInfo?.id;
  if (!principalId) return { error: corsError(401, "Authentication is required", "authentication_required") };
  return { principalId };
}

export function OPTIONS(): Response {
  return handleCorsOptions();
}

/** Consumer surface for opaque Video Bridge drill-down handles. */
export async function handle(request: Request): Promise<Response> {
  if (!isVideoBridgeDrilldownRemoteAccessEnabled()) return corsError(403, "Video Bridge drill-down remote access is disabled", "feature_disabled");
  if (request.method !== "GET" && request.method !== "DELETE") return corsError(405, "Method not allowed", "invalid_request");
  const resolved = await resolvePrincipal(request);
  if (resolved.error) return resolved.error;
  const principalId = resolved.principalId!;
  const query: Record<string, string> = {};
  for (const [key, value] of new URL(request.url).searchParams) query[key] = value;

  if (request.method === "DELETE") {
    const parsed = DeleteQuerySchema.safeParse(query);
    if (!parsed.success) return corsError(400, "A valid drill-down handle is required", "invalid_request");
    return corsJson(200, { removed: sharedLifecycle.deleteHandle(principalId, parsed.data.handle) });
  }
  const parsed = ReadQuerySchema.safeParse(query);
  if (!parsed.success) return corsError(400, "Invalid Video Bridge drill-down query", "invalid_request");
  const page = await sharedLifecycle.resolve(principalId, parsed.data.handle, {
    endSeconds: parsed.data.end,
    frameCount: parsed.data.frames,
    page: parsed.data.page,
    startSeconds: parsed.data.start,
    variant: parsed.data.variant,
  });
  if (!page) return corsError(404, "Video Bridge drill-down result was not found", "not_found");
  return corsJson(200, page);
}
