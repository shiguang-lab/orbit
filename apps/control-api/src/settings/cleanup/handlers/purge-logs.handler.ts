// @ts-nocheck
import { getCallLogRetentionDays } from "@shiguang-gateway/core-domain/shared/log-env";
import { deleteCallLogsBefore } from "@shiguang-gateway/core-domain/usage/call-logs";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const retentionMs = getCallLogRetentionDays() * 24 * 60 * 60 * 1000;
    const cutoff = new Date(Date.now() - retentionMs).toISOString();
    const result = deleteCallLogsBefore(cutoff);
    return Response.json({
      deleted: result.deletedRows,
      deletedArtifacts: result.deletedArtifacts,
    });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ error }, { status: 500 });
  }
}
