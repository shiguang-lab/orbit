import { AgentBridgeServerActionSchema, checkCertInstalled, generateCert, getCachedPassword, installCertResult, isMitmSudoPasswordRequired, normalizeMitmSudoPasswordInput, resolveMitmDataDir, resolveMitmSudoPassword, setCachedPassword, startMitm, stopMitm, getMitmStatus } from "@shiguang-gateway/core-domain/control/agent-bridge";
import { pickApiKeyForInternalUse } from "@shiguang-gateway/core-domain/db/local-db";
import { errorResponse, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import path from "node:path";

export async function resolveRouterApiKey(rawApiKey: string): Promise<string> {
  if (rawApiKey) return rawApiKey;
  if (process.env.ROUTER_API_KEY) return process.env.ROUTER_API_KEY;
  return (await pickApiKeyForInternalUse("internal-probe")) ?? "";
}

export async function POST(request: Request): Promise<Response> {
  let body: unknown;
  try { body = await request.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const parsed = AgentBridgeServerActionSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "Invalid request body", parsed.error.flatten());
  const raw = body as Record<string, unknown>;
  const supplied = typeof raw.sudoPassword === "string" ? raw.sudoPassword : undefined;
  const password = resolveMitmSudoPassword(supplied, getCachedPassword());
  try {
    if (parsed.data.action === "start") {
      if (supplied) setCachedPassword(normalizeMitmSudoPasswordInput(supplied));
      return Response.json({ ok: true, ...(await startMitm(await resolveRouterApiKey(typeof raw.apiKey === "string" ? raw.apiKey : ""), password)) });
    }
    if (parsed.data.action === "stop") return Response.json({ ok: true, ...(await stopMitm(password || getCachedPassword() || "")) });
    if (parsed.data.action === "restart") {
      const current = await getMitmStatus();
      const pwd = password || getCachedPassword() || "";
      if (current.running) await stopMitm(pwd);
      if (pwd) setCachedPassword(pwd);
      return Response.json({ ok: true, ...(await startMitm(await resolveRouterApiKey(typeof raw.apiKey === "string" ? raw.apiKey : ""), pwd)) });
    }
    if (parsed.data.action === "trust-cert") {
      if (isMitmSudoPasswordRequired(password)) return errorResponse(400, "Missing sudoPassword");
      const certPath = path.join(resolveMitmDataDir(), "mitm", "server.crt");
      const result = await installCertResult(password, certPath);
      if (result.installed) return Response.json({ ok: true, trusted: await checkCertInstalled(certPath) });
      if (result.reason === "canceled") return errorResponse(409, "User canceled authorization");
      return Response.json({ ok: false, trusted: false, skippable: true, reason: result.reason, message: sanitizeErrorMessage(result.message ?? "Certificate install failed"), manualGuide: result.manualGuide });
    }
    const result = await generateCert();
    return Response.json({ ok: true, certPath: result.cert });
  } catch (error) { return errorResponse(500, sanitizeErrorMessage(error instanceof Error ? error.message : String(error))); }
}
