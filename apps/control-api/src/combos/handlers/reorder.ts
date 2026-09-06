import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { isCloudEnabled } from "@shiguang-gateway/core-domain/db/settings";
import { getConsistentMachineId } from "@shiguang-gateway/core-domain/shared/utils/machineId";
import { syncToCloud } from "@shiguang-gateway/core-domain/sync/cloud";
import { reorderCombos } from "@shiguang-gateway/core-domain/db/combos";
import { z } from "zod";

const reorderSchema = z.object({
  comboIds: z.array(z.string().trim().min(1).max(200)).min(1).max(1000),
}).superRefine((value, ctx) => {
  if (new Set(value.comboIds).size !== value.comboIds.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["comboIds"], message: "comboIds must be unique" });
  }
});

export async function reorder(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 });
  }

  const validation = reorderSchema.safeParse(rawBody);
  if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

  try {
    const combos = await reorderCombos(validation.data.comboIds);
    await syncToCloudIfEnabled();
    return Response.json({ combos });
  } catch (error) {
    console.error("Error reordering combos:", error);
    return Response.json({ error: "Failed to reorder combos" }, { status: 500 });
  }
}

async function syncToCloudIfEnabled(): Promise<void> {
  try {
    if (!(await isCloudEnabled())) return;
    await syncToCloud(await getConsistentMachineId());
  } catch (error) {
    console.warn("Error syncing combos to cloud:", error);
  }
}
