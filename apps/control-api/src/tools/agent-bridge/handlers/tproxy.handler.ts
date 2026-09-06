import { getCaptureStatus, installTproxyCa, startCaptureMode, stopCaptureMode, uninstallTproxyCa } from "@shiguang-gateway/core-domain/control/agent-bridge";
import { errorResponse, sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import { z } from "zod";

export const StartTproxyBodySchema = z.object({ dport: z.number().int().min(1).max(65535).default(443), mark: z.number().int().min(1).default(0x2333), onPort: z.number().int().min(1).max(65535).default(8443), routeTable: z.number().int().min(1).default(233), bypassMark: z.number().int().min(1).default(0x539), sudoPassword: z.string().optional() });
export function GET(): Response { return Response.json(getCaptureStatus()); }
export async function POST(request: Request): Promise<Response> {
  const parsed = StartTproxyBodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return errorResponse(400, "Invalid TPROXY capture config");
  const { sudoPassword = "", ...cfg } = parsed.data;
  try {
    const status = await startCaptureMode({ cfg, installCa: (pem) => installTproxyCa(pem, sudoPassword), uninstallCa: () => uninstallTproxyCa(sudoPassword) });
    return Response.json({ ok: true, status });
  } catch (error) { return errorResponse(500, sanitizeErrorMessage(error instanceof Error ? error.message : String(error))); }
}
export async function DELETE(): Promise<Response> {
  try { return Response.json({ ok: true, status: await stopCaptureMode() }); }
  catch (error) { return errorResponse(500, sanitizeErrorMessage(error instanceof Error ? error.message : String(error))); }
}
