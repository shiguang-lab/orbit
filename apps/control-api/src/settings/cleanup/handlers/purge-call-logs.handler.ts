// @ts-nocheck
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { purgeCallLogs } from "@shiguang-gateway/core-domain/control/database-cleanup";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeCallLogs();
    return Response.json({
      deleted: result.deleted,
      deletedArtifacts: result.deletedArtifacts ?? 0,
      errors: result.errors,
    });
  } catch {
    return Response.json(buildErrorBody(500, "Failed to purge call logs"), { status: 500 });
  }
}
