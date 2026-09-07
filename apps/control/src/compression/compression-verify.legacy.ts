import { z } from "zod";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { executeEdgeRuntimeCommand } from "../edge-runtime/client.js";

export const dynamic = "force-dynamic";

const VerifyRequestSchema = z.object({
  items: z
    .array(z.object({ id: z.string(), original: z.string(), compressed: z.string() }))
    .min(1)
    .max(20),
  provider: z.string().min(1),
  judgeModel: z.string().min(1),
  costCapUsd: z.number().positive().max(5).default(0.1),
});

export async function POST(req: Request) {
  const authError = await requireManagementAuth(req);
  if (authError) return authError;
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = VerifyRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Invalid request", details: parsed.error.issues },
      { status: 400 }
    );
  }
  const { items, provider, judgeModel, costCapUsd } = parsed.data;
  try {
    const result = await executeEdgeRuntimeCommand<
      { ok: true; value: unknown } | { ok: false; status: number; message: string }
    >({ command: "compression.verify", items, provider, judgeModel, costCapUsd }, { timeoutMs: 120_000 });
    if (!result.ok) return Response.json({ error: result.message }, { status: result.status });
    return Response.json(result.value);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[/api/compression/compare/verify]", msg);
    return Response.json(
      { error: "Verify failed", details: sanitizeErrorMessage(msg) },
      { status: 500 }
    );
  }
}
