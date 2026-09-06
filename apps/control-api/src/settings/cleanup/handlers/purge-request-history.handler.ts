// @ts-nocheck
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import {
  purgeCallLogs,
  purgeDetailedLogs,
} from "@shiguang-gateway/core-domain/control/database-cleanup";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const callLogs = await purgeCallLogs();
    const detailedLogs = await purgeDetailedLogs();
    const errors = callLogs.errors + detailedLogs.errors;

    return Response.json(
      {
        deleted: callLogs.deleted,
        deletedArtifacts: callLogs.deletedArtifacts ?? 0,
        deletedDetailedLogs: detailedLogs.deleted,
        errors,
      },
      { status: errors > 0 ? 500 : 200 },
    );
  } catch {
    return Response.json(buildErrorBody(500, "Failed to purge request history"), { status: 500 });
  }
}
