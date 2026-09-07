import fs from "node:fs";
import path from "node:path";
import { resolveMitmDataDir } from "@orbit/core/control/agent-bridge";
import { failure } from "./common.js";

export async function GET(): Promise<Response> {
  const certPath = path.join(resolveMitmDataDir(), "mitm", "server.crt");
  if (!fs.existsSync(certPath)) {
    return new Response(JSON.stringify({ error: { message: "Certificate not found. Generate one first via POST /api/tools/agent-bridge/cert/regenerate" } }), { status: 404 });
  }
  try {
    const pem = fs.readFileSync(certPath);
    return new Response(pem, {
      status: 200,
      headers: {
        "Content-Type": "application/x-pem-file",
        "Content-Disposition": 'attachment; filename="orbit-mitm.crt"',
        "Content-Length": String(pem.length),
      },
    });
  } catch (error) { return failure(error); }
}
