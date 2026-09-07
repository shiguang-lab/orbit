import { z } from "zod";
import { requireManagementAuth } from "@orbit/core/control/management-auth";

const schema = z.object({ method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD", "OPTIONS"]).default("GET"), path: z.string().min(1).startsWith("/").refine((p) => !p.startsWith("//")).refine((p) => ["/api/", "/v1/", "/v1beta/", "/a2a", "/.well-known/agent.json"].some((x) => p.startsWith(x))), headers: z.record(z.string(), z.string()).default({}), body: z.any().optional() });
const blocked = new Set(["connection", "content-length", "cookie", "host", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade", "x-forwarded-for", "x-forwarded-host", "x-forwarded-proto"]);

export async function POST(request: Request): Promise<Response> {
  const auth = await requireManagementAuth(request); if (auth) return auth;
  try {
    const parsed = schema.safeParse(await request.json()); if (!parsed.success) return Response.json({ error: parsed.error.issues[0]?.message || "Invalid request" }, { status: 400 });
    const { method, path: targetPath, headers, body } = parsed.data; const base = (process.env.ORBIT_BASE_URL || process.env.EDGE_GATEWAY_INTERNAL_URL || new URL(request.url).origin).replace(/\/+$/, ""); const url = new URL(targetPath, base); if (url.origin !== new URL(base).origin) return Response.json({ error: "Path must be same-origin" }, { status: 400 });
    const forward: Record<string, string> = {}; for (const [k, v] of Object.entries(headers)) if (!blocked.has(k.toLowerCase())) forward[k] = v; const cookie = request.headers.get("cookie"); if (cookie && !forward.Cookie) forward.Cookie = cookie; if (body !== undefined && !forward["Content-Type"]) forward["Content-Type"] = "application/json";
    const started = performance.now(); const res = await fetch(url, { method, headers: forward, body: body !== undefined && method !== "GET" ? typeof body === "string" ? body : JSON.stringify(body) : undefined }); const contentType = res.headers.get("content-type") || ""; const responseBody = contentType.includes("application/json") ? await res.json() : (await res.text()).slice(0, 10000); const responseHeaders: Record<string, string> = {}; res.headers.forEach((v, k) => { responseHeaders[k] = v; });
    return Response.json({ status: res.status, statusText: res.statusText, headers: responseHeaders, body: responseBody, latencyMs: Math.round(performance.now() - started), contentType });
  } catch (error) { return Response.json({ status: 0, statusText: "Network Error", headers: {}, body: { error: error instanceof Error ? error.message : "Request failed" }, latencyMs: 0, contentType: "application/json" }); }
}
