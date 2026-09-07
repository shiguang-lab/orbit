import { AgentBridgeUpstreamCaPostSchema, configureUpstreamCa, resolveMitmDataDir } from "@orbit/core/control/agent-bridge";
import { errorResponse, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import fs from "node:fs";
import path from "node:path";

const caPathFile = path.join(resolveMitmDataDir(), "mitm", "upstream-ca.path");
function readPath(): string | null { try { return fs.existsSync(caPathFile) ? fs.readFileSync(caPathFile, "utf8").trim() || null : null; } catch { return null; } }
function writePath(value: string): void { fs.mkdirSync(path.dirname(caPathFile), { recursive: true }); fs.writeFileSync(caPathFile, `${value}\n`); }
export function GET(): Response { return Response.json({ path: process.env.AGENTBRIDGE_UPSTREAM_CA_CERT || readPath() || null }); }
export async function POST(request: Request): Promise<Response> {
  let body: unknown; try { body = await request.json(); } catch { return errorResponse(400, "Invalid JSON body"); }
  const parsed = AgentBridgeUpstreamCaPostSchema.safeParse(body);
  if (!parsed.success) return errorResponse(400, "Invalid request body");
  const value = parsed.data.path;
  if (!fs.existsSync(value)) return errorResponse(400, `Upstream CA file not found: ${value}`);
  try { writePath(value); } catch (error) { return errorResponse(500, sanitizeErrorMessage(error instanceof Error ? error.message : String(error))); }
  try { configureUpstreamCa(value); } catch (error) { return errorResponse(400, sanitizeErrorMessage(error instanceof Error ? error.message : String(error))); }
  return Response.json({ ok: true, path: value });
}
