import { getCachedPassword, isMitmSudoPasswordRequired, normalizeMitmSudoPasswordInput, repairMitm, resolveMitmSudoPassword, setCachedPassword } from "@shiguang-gateway/core-domain/control/agent-bridge";
import { errorResponse, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { z } from "zod";

export const RepairBodySchema = z.object({ sudoPassword: z.string().optional() });
export async function POST(request: Request): Promise<Response> {
  const raw = await request.json().catch(() => ({}));
  const parsed = RepairBodySchema.safeParse(raw);
  const password = resolveMitmSudoPassword(parsed.success ? parsed.data.sudoPassword : undefined, getCachedPassword());
  if (isMitmSudoPasswordRequired(password)) return errorResponse(400, "Missing sudoPassword");
  try {
    const result = await repairMitm(password);
    const supplied = parsed.success ? normalizeMitmSudoPasswordInput(parsed.data.sudoPassword) : "";
    if (process.platform !== "win32" && supplied) setCachedPassword(supplied);
    return Response.json({ ok: true, repaired: result.repaired });
  } catch (error) { return errorResponse(500, sanitizeErrorMessage(error instanceof Error ? error.message : String(error))); }
}
