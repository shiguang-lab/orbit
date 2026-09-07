import { createHash } from "node:crypto";
import { z } from "zod";
import { CORS_HEADERS } from "@orbit/contracts/cors";
import { handleCorsOptions } from "../common/cors.js";
import { createInjectionGuard } from "@orbit/core/middleware/prompt-injection";
import {
  checkRateLimit,
  getRelayTokenByHash,
  recordRelayUsage,
} from "@orbit/core/db/relayProxies";
import { buildErrorBody } from "@orbit/inference/utils/error";
import { getProviderPluginManifestHeader } from "@orbit/inference/config/providerPluginManifestUrl";

const BifrostRequestSchema = z.object({
  model: z.string().min(1, "model is required"),
  messages: z.array(z.unknown()).min(1, "messages must be a non-empty array"),
  stream: z.boolean().optional(),
}).passthrough();
const JSON_CORS_HEADERS = { ...CORS_HEADERS, "Content-Type": "application/json" } as const;
const BIFROST_BASE_URL = process.env.BIFROST_BASE_URL?.replace(/\/$/, "");
const BIFROST_API_KEY = process.env.BIFROST_API_KEY || process.env.ORBIT_BIFROST_KEY;
const BIFROST_TIMEOUT_MS = Number(process.env.BIFROST_TIMEOUT_MS || "30000");
const BIFROST_STREAMING_ENABLED = process.env.BIFROST_STREAMING_ENABLED !== "0";
const BIFROST_ENABLED = process.env.BIFROST_ENABLED !== "0";
const injectionGuard = createInjectionGuard();
const ipBuckets = new Map<string, { count: number; windowStart: number }>();
const RELAY_IP_PER_MINUTE = Number(process.env.RELAY_IP_PER_MINUTE || "30");

function sanitize(value: string | null, max = 256): string {
  return value ? value.replace(/[\r\n]+/g, " ").slice(0, max) : "unknown";
}
function clientIp(request: Request): string {
  return sanitize(request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip"));
}
function extractToken(request: Request): string | null {
  const auth = request.headers.get("authorization") || "";
  const match = auth.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : request.headers.get("x-relay-token");
}
function hashToken(token: string): string { return createHash("sha256").update(token).digest("hex"); }
function checkIpRateLimit(tokenId: string, ip: string): { allowed: boolean; resetIn: number } {
  if (!Number.isFinite(RELAY_IP_PER_MINUTE) || RELAY_IP_PER_MINUTE <= 0) return { allowed: true, resetIn: 0 };
  const now = Math.floor(Date.now() / 1000); const windowStart = Math.floor(now / 60) * 60;
  const key = `${tokenId}|${ip}`; const bucket = ipBuckets.get(key);
  if (!bucket || bucket.windowStart !== windowStart) { ipBuckets.set(key, { count: 1, windowStart }); return { allowed: true, resetIn: 60 - (now % 60) }; }
  if (bucket.count >= RELAY_IP_PER_MINUTE) return { allowed: false, resetIn: 60 - (now % 60) };
  bucket.count++; return { allowed: true, resetIn: 60 - (now % 60) };
}
function finalizeReadableStream(body: ReadableStream<Uint8Array>, onFinalize: (error?: unknown) => void): ReadableStream<Uint8Array> {
  const reader = body.getReader(); let finalized = false;
  const finalize = (error?: unknown) => { if (!finalized) { finalized = true; onFinalize(error); } };
  return new ReadableStream({
    async pull(controller) { try { const { done, value } = await reader.read(); if (done) { finalize(); controller.close(); } else controller.enqueue(value); } catch (error) { finalize(error); controller.error(error); } },
    async cancel(reason) { try { await reader.cancel(reason); } finally { finalize(reason); } },
  });
}

export function OPTIONS(): Response { return handleCorsOptions(); }

export async function POST(request: Request): Promise<Response> {
  const started = Date.now(); const ip = clientIp(request); const userAgent = sanitize(request.headers.get("user-agent"));
  if (!BIFROST_ENABLED) return new Response(JSON.stringify(buildErrorBody(503, "Bifrost sidecar disabled via BIFROST_ENABLED=0. Use /api/v1/relay/chat/completions for the TS path.")), { status: 503, headers: { ...JSON_CORS_HEADERS, "X-Bifrost-Fallback": "/api/v1/relay/chat/completions", "X-Bifrost-Killswitch": "BIFROST_ENABLED=0" } });
  if (!BIFROST_BASE_URL) return new Response(JSON.stringify(buildErrorBody(503, "Bifrost sidecar not configured. Set BIFROST_BASE_URL or use /api/v1/relay/chat/completions for the TS path.")), { status: 503, headers: { ...JSON_CORS_HEADERS, "X-Bifrost-Fallback": "/api/v1/relay/chat/completions" } });
  try {
    const rawToken = extractToken(request);
    if (!rawToken) return new Response(JSON.stringify(buildErrorBody(401, "Missing relay token")), { status: 401, headers: JSON_CORS_HEADERS });
    const token = getRelayTokenByHash(hashToken(rawToken));
    if (!token) return new Response(JSON.stringify(buildErrorBody(401, "Invalid relay token")), { status: 401, headers: JSON_CORS_HEADERS });
    if (token.expiresAt && Math.floor(Date.now() / 1000) > token.expiresAt) return new Response(JSON.stringify(buildErrorBody(401, "Relay token expired")), { status: 401, headers: JSON_CORS_HEADERS });
    const ipCheck = checkIpRateLimit(token.id, ip); if (!ipCheck.allowed) return new Response(JSON.stringify(buildErrorBody(429, "Per-IP rate limit exceeded")), { status: 429, headers: { ...JSON_CORS_HEADERS, "Retry-After": String(ipCheck.resetIn), "X-RateLimit-Scope": "ip" } });
    const rateCheck = checkRateLimit(token.id, token); if (!rateCheck.allowed) return new Response(JSON.stringify(buildErrorBody(429, "Rate limit exceeded")), { status: 429, headers: { ...JSON_CORS_HEADERS, "Retry-After": String(rateCheck.resetIn), "X-RateLimit-Remaining": "0" } });
    const rawBody = await request.clone().json().catch(() => null); if (!rawBody) return new Response(JSON.stringify(buildErrorBody(400, "Invalid JSON body")), { status: 400, headers: JSON_CORS_HEADERS });
    const parsed = BifrostRequestSchema.safeParse(rawBody); if (!parsed.success) return new Response(JSON.stringify(buildErrorBody(400, parsed.error.issues[0]?.message || "Invalid request body")), { status: 400, headers: JSON_CORS_HEADERS });
    const body = parsed.data; const guard = injectionGuard(body);
    if (guard.blocked) return new Response(JSON.stringify({ ...buildErrorBody(400, "Request blocked: potential prompt injection detected"), detections: guard.result.detections.length }), { status: 400, headers: JSON_CORS_HEADERS });
    const allowedModels: string[] = JSON.parse(token.allowedModels); const model = body.model;
    if (allowedModels.length > 0 && !allowedModels.includes("*") && !allowedModels.some((p) => model === p || (p.endsWith("*") && model.startsWith(p.slice(0, -1))))) return new Response(JSON.stringify(buildErrorBody(403, `Model "${model}" not allowed by this relay token`)), { status: 403, headers: JSON_CORS_HEADERS });
    const wantsStream = Boolean(body.stream) && BIFROST_STREAMING_ENABLED;
    const upstreamHeaders: Record<string, string> = { "Content-Type": "application/json", "x-relay-token-id": token.id, "x-relay-client-ip": ip, ...getProviderPluginManifestHeader(new URL(request.url).origin) };
    const requestId = request.headers.get("x-request-id"); if (requestId) upstreamHeaders["x-request-id"] = requestId; if (BIFROST_API_KEY) upstreamHeaders.Authorization = `Bearer ${BIFROST_API_KEY}`;
    const ac = new AbortController(); let timedOut = false; const tid = setTimeout(() => { timedOut = true; ac.abort(); }, BIFROST_TIMEOUT_MS);
    let upstream: Response; try { upstream = await fetch(`${BIFROST_BASE_URL}/v1/chat/completions`, { method: "POST", headers: upstreamHeaders, body: JSON.stringify(body), signal: ac.signal }); } catch (error) { clearTimeout(tid); throw error; }
    const recordUsage = (status: "success" | "error", statusCode: number) => recordRelayUsage(token.id, { requestId: request.headers.get("x-request-id") || undefined, status, statusCode, latencyMs: Date.now() - started, clientIp: ip, userAgent });
    const headers = new Headers(upstream.headers); headers.set("X-Routed-By", "bifrost"); headers.set("X-Relay-Token", token.tokenPrefix + "..."); if (!wantsStream) headers.set("Content-Type", upstream.headers.get("Content-Type") ?? "application/json");
    if (wantsStream && upstream.body) return new Response(finalizeReadableStream(upstream.body, (error) => { clearTimeout(tid); const statusCode = timedOut ? 504 : upstream.status; recordUsage(error || statusCode >= 500 ? "error" : "success", statusCode); }), { status: upstream.status, headers });
    clearTimeout(tid); recordUsage(upstream.status < 500 ? "success" : "error", upstream.status); return new Response(upstream.body, { status: upstream.status, headers });
  } catch (error) {
    const isAbort = error instanceof Error && error.name === "AbortError";
    return new Response(JSON.stringify(buildErrorBody(isAbort ? 504 : 502, isAbort ? `Bifrost sidecar timed out after ${BIFROST_TIMEOUT_MS}ms` : `Bifrost sidecar unreachable: ${error instanceof Error ? error.message : String(error)}`)), { status: isAbort ? 504 : 502, headers: { ...JSON_CORS_HEADERS, "X-Bifrost-Fallback": "/api/v1/relay/chat/completions" } });
  }
}
