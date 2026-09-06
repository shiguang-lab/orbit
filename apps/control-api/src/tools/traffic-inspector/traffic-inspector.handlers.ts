import { createHash, timingSafeEqual } from "node:crypto";
import {
  InspectorAnnotationPutSchema,
  InspectorCaptureModeActionSchema,
  InspectorListQuerySchema,
  InspectorSystemProxyActionSchema,
  InspectorTlsInterceptToggleSchema,
  InterceptedRequestSchema,
  addDNSEntries,
  apply,
  buildErrorBody,
  clearSystemProxy,
  getCachedPassword,
  getHttpProxyHandle,
  getSystemProxyState,
  globalTrafficBuffer,
  getIngestTokenForBootstrap,
  isTlsInterceptEnabled,
  listCustomHosts,
  maskSecret,
  removeCustomHost,
  removeDNSEntries,
  revert,
  sanitizeHeaders,
  setHttpProxyHandle,
  setSystemProxyApplied,
  setTlsIntercept,
  startHttpProxyServer,
  toggleCustomHost,
} from "@shiguang-gateway/core-domain/control/traffic-inspector";
import { InspectorCustomHostSchema } from "@shiguang-gateway/core-domain/control/traffic-inspector";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

const jsonError = (status: number, message: string): Response =>
  new Response(JSON.stringify(buildErrorBody(status, message)), {
    status,
    headers: { "content-type": "application/json" },
  });

export async function captureHttpProxy(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const parsed = InspectorCaptureModeActionSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");
  if (parsed.data.action === "stop") {
    const handle = getHttpProxyHandle();
    if (!handle) return Response.json({ ok: true, running: false, port: null });
    try {
      await handle.stop();
      setHttpProxyHandle(null);
      return Response.json({ ok: true, running: false, port: null });
    } catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "Failed to stop HTTP proxy"); }
  }
  const existing = getHttpProxyHandle();
  if (existing) return Response.json({ ok: true, running: true, port: existing.port });
  const port = Number(process.env.INSPECTOR_HTTP_PROXY_PORT ?? "8080") || 8080;
  try {
    const handle = await startHttpProxyServer(port);
    setHttpProxyHandle(handle);
    return Response.json({ ok: true, running: true, port: handle.port }, { status: 201 });
  } catch (error) {
    if ((error as NodeJS.ErrnoException)?.code === "EADDRINUSE") {
      return new Response(JSON.stringify({ error: { message: `Port ${port} is already in use`, type: "conflict", code: "EADDRINUSE", port } }), { status: 409, headers: { "content-type": "application/json" } });
    }
    return jsonError(500, sanitizeErrorMessage(error) || "Failed to start HTTP proxy");
  }
}

export async function captureSystemProxy(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const parsed = InspectorSystemProxyActionSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");
  const port = parsed.data.port ?? (Number(process.env.INSPECTOR_HTTP_PROXY_PORT ?? "8080") || 8080);
  const guardMinutes = parsed.data.guardMinutes ?? (Number(process.env.INSPECTOR_SYSTEM_PROXY_GUARD_MINUTES ?? "30") || 30);
  if (parsed.data.action === "revert") {
    try {
      const previousState = getSystemProxyState().previousState;
      if (previousState) await revert(previousState);
      clearSystemProxy();
      return Response.json({ ok: true, applied: false });
    } catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "Failed to revert system proxy"); }
  }
  try {
    const result = await apply(port);
    setSystemProxyApplied(port, result.previousState, guardMinutes);
    return Response.json({ ok: true, applied: true, port, platform: result.platform, guardUntil: getSystemProxyState().guardUntil });
  } catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "Failed to apply system proxy"); }
}

export async function toggleTlsIntercept(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const parsed = InspectorTlsInterceptToggleSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");
  setTlsIntercept(parsed.data.enabled);
  return Response.json({ ok: true, tlsIntercept: { enabled: isTlsInterceptEnabled() } });
}

export async function exportHar(request: Request): Promise<Response> {
  const rawQuery: Record<string, string> = {};
  new URL(request.url).searchParams.forEach((value, key) => { rawQuery[key] = value; });
  const parsed = InspectorListQuerySchema.safeParse(rawQuery);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Invalid query");
  try {
    const har = (await import("@shiguang-gateway/core-domain/control/traffic-inspector")).toHar(globalTrafficBuffer.list(parsed.data));
    return new Response(JSON.stringify(har, null, 2), { status: 200, headers: { "content-type": "application/json", "content-disposition": 'attachment; filename="traffic.har"', "cache-control": "no-store" } });
  } catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "HAR export failed"); }
}

export async function patchHost(request: Request, host: string): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const parsed = (InspectorCustomHostSchema as any).pick({ enabled: true }).safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");
  try {
    toggleCustomHost(decodeURIComponent(host), parsed.data.enabled);
    const updated = listCustomHosts().find((item) => item.host === decodeURIComponent(host));
    return updated ? Response.json(updated) : jsonError(404, "Host not found");
  } catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "Failed to toggle host"); }
}

export async function deleteHost(host: string): Promise<Response> {
  const decodedHost = decodeURIComponent(host);
  try { removeCustomHost(decodedHost); } catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "Failed to remove host"); }
  const sudoPassword = getCachedPassword();
  if (!sudoPassword) return new Response(null, { status: 204, headers: { "x-dns-warning": "DNS routing requires the MITM proxy to be running with a cached sudo password" } });
  try { await removeDNSEntries([decodedHost], sudoPassword); } catch { return new Response(null, { status: 204, headers: { "x-dns-warning": `DNS entry for ${decodedHost} could not be removed — restart the proxy or remove manually` } }); }
  return new Response(null, { status: 204 });
}

export async function getRequest(id: string): Promise<Response> {
  const entry = globalTrafficBuffer.get(id);
  return entry ? Response.json(entry) : jsonError(404, "Request not found");
}

export async function annotateRequest(request: Request, id: string): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const parsed = InspectorAnnotationPutSchema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");
  const entry = globalTrafficBuffer.get(id) as Record<string, unknown> | null;
  if (!entry) return jsonError(404, "Request not found");
  try { const updated = { ...entry, annotation: parsed.data.annotation }; globalTrafficBuffer.update(id, updated); return Response.json(updated); }
  catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "Failed to update annotation"); }
}

export async function replayRequest(id: string): Promise<Response> {
  const entry = globalTrafficBuffer.get(id) as { path: string; method: string; requestBody?: string | null; requestHeaders: Record<string, string> } | null;
  if (!entry) return jsonError(404, "Request not found");
  const base = process.env.SHIGUANG_GATEWAY_BASE_URL ?? process.env.INTERNAL_BASE_URL ?? "http://127.0.0.1:8787";
  const replayHeaders: Record<string, string> = { "content-type": "application/json", "x-shiguangGateway-source": "inspector-replay" };
  const auth = entry.requestHeaders.authorization ?? entry.requestHeaders.Authorization;
  if (auth && !auth.includes("***")) replayHeaders.authorization = auth;
  try {
    const upstream = await fetch(`${base}${entry.path}`, { method: entry.method, headers: replayHeaders, body: entry.requestBody ?? undefined });
    return new Response(await upstream.text(), { status: upstream.status, headers: { "content-type": upstream.headers.get("content-type") ?? "application/json" } });
  } catch (error) { return jsonError(502, sanitizeErrorMessage(error) || "Replay failed"); }
}

function tokenMatches(received: string): boolean { const expected = getIngestTokenForBootstrap(); if (!received) return false; const a = createHash("sha256").update(expected).digest(); const b = createHash("sha256").update(received).digest(); return timingSafeEqual(a, b); }

export async function ingestRequest(request: Request): Promise<Response> {
  const auth = request.headers.get("authorization") ?? "";
  if (!tokenMatches(auth.startsWith("Bearer ") ? auth.slice(7) : "")) return jsonError(403, "Invalid or missing ingest token");
  let body: unknown;
  try { body = await request.json(); } catch { return jsonError(400, "Invalid JSON body"); }
  const schema = (InterceptedRequestSchema as any).partial().required({ id: true, timestamp: true, method: true, host: true, path: true, source: true, requestHeaders: true, requestSize: true, responseHeaders: true, responseSize: true, status: true });
  const parsed = schema.safeParse(body);
  if (!parsed.success) return jsonError(400, parsed.error.issues[0]?.message ?? "Validation error");
  try {
    const data = parsed.data as Record<string, any>;
    const entry: Record<string, any> = { ...data, requestHeaders: sanitizeHeaders(data.requestHeaders || {}), responseHeaders: sanitizeHeaders(data.responseHeaders || {}) };
    entry.requestBody = data.requestBody != null ? maskSecret(data.requestBody) : null;
    entry.responseBody = data.responseBody != null ? maskSecret(data.responseBody) : null;
    globalTrafficBuffer.push(entry);
    return Response.json({ ok: true, id: entry.id });
  } catch (error) { return jsonError(500, sanitizeErrorMessage(error) || "Ingest failed"); }
}
