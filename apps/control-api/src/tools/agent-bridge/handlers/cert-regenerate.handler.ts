import { generateCert } from "@orbit/core/control/agent-bridge";
import { failure } from "./common.js";

export async function POST(): Promise<Response> {
  try {
    const result = await generateCert({ force: true });
    return Response.json({ ok: true, certPath: result.cert, keyPath: result.key });
  } catch (error) { return failure(error); }
}
