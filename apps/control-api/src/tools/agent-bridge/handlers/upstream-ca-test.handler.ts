import crypto from "node:crypto";
import fs from "node:fs";
import { AgentBridgeUpstreamCaPostSchema } from "@shiguang-gateway/core-domain/control/agent-bridge";
import { errorResponse, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
export async function POST(request: Request): Promise<Response> {
  let body: unknown; try { body = await request.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const parsed = AgentBridgeUpstreamCaPostSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "Invalid request body");
  const value = parsed.data.path;
  if (!fs.existsSync(value)) return errorResponse(400, `Upstream CA file not found: ${value}`);
  let pem: string; try { pem = fs.readFileSync(value, "utf8"); } catch (error) { return errorResponse(400, `Unable to read upstream CA file: ${sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}`); }
  if (!pem.includes("-----BEGIN CERTIFICATE-----")) return errorResponse(400, "File is not a PEM certificate (missing a -----BEGIN CERTIFICATE----- block).");
  try { const cert = new crypto.X509Certificate(pem); return Response.json({ ok: true, path: value, subject: cert.subject, validTo: cert.validTo }); }
  catch (error) { return errorResponse(400, `Invalid certificate: ${sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}`); }
}
