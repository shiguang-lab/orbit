import fs from "node:fs";
import path from "node:path";
import {
  checkCertInstalled,
  getCachedPassword,
  installCertResult,
  isMitmSudoPasswordRequired,
  normalizeMitmSudoPasswordInput,
  resolveMitmDataDir,
  resolveMitmSudoPassword,
  setCachedPassword,
  uninstallCert,
} from "@orbit/core/control/agent-bridge";
import { failure } from "./common.js";

export async function GET(): Promise<Response> {
  try {
    const certPath = path.join(resolveMitmDataDir(), "mitm", "server.crt");
    const exists = fs.existsSync(certPath);
    const trusted = exists ? await checkCertInstalled(certPath) : false;
    return Response.json({ exists, trusted, path: exists ? certPath : null });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request): Promise<Response> {
  const raw = await request.json().catch(() => ({})) as { sudoPassword?: unknown };
  const bodyPassword = typeof raw.sudoPassword === "string" ? raw.sudoPassword : undefined;
  const sudoPassword = resolveMitmSudoPassword(bodyPassword, getCachedPassword());
  if (isMitmSudoPasswordRequired(sudoPassword)) return new Response(JSON.stringify({ error: { message: "Missing sudoPassword" } }), { status: 400 });
  try {
    const certPath = path.join(resolveMitmDataDir(), "mitm", "server.crt");
    if (!fs.existsSync(certPath)) return new Response(JSON.stringify({ error: { message: "Certificate not found. Generate one first." } }), { status: 404 });
    const result = await installCertResult(sudoPassword, certPath);
    if (result.installed) {
      const supplied = normalizeMitmSudoPasswordInput(bodyPassword);
      if (process.platform !== "win32" && supplied) setCachedPassword(supplied);
      return Response.json({ ok: true, trusted: await checkCertInstalled(certPath) });
    }
    if (result.reason === "canceled") return new Response(JSON.stringify({ error: { message: "User canceled authorization" } }), { status: 409 });
    return Response.json({ ok: false, trusted: false, skippable: true, reason: result.reason, message: result.message, manualGuide: result.manualGuide });
  } catch (error) { return failure(error); }
}

export async function DELETE(request: Request): Promise<Response> {
  const raw = await request.json().catch(() => ({})) as { sudoPassword?: unknown };
  const bodyPassword = typeof raw.sudoPassword === "string" ? raw.sudoPassword : undefined;
  const sudoPassword = resolveMitmSudoPassword(bodyPassword, getCachedPassword());
  if (isMitmSudoPasswordRequired(sudoPassword)) return new Response(JSON.stringify({ error: { message: "Missing sudoPassword" } }), { status: 400 });
  try {
    const certPath = path.join(resolveMitmDataDir(), "mitm", "server.crt");
    if (!fs.existsSync(certPath)) return Response.json({ ok: true, trusted: false });
    await uninstallCert(sudoPassword, certPath);
    const supplied = normalizeMitmSudoPasswordInput(bodyPassword);
    if (process.platform !== "win32" && supplied) setCachedPassword(supplied);
    return Response.json({ ok: true, trusted: await checkCertInstalled(certPath) });
  } catch (error) { return failure(error); }
}
