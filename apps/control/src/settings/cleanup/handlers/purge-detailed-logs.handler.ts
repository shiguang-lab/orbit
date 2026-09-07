// @ts-nocheck
import { purgeDetailedLogs } from "@orbit/core/db/cleanup";
import { isAuthenticated } from "@orbit/core/control/authenticated";

export async function POST(request: Request) {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const result = await purgeDetailedLogs();
    return Response.json({ deleted: result.deleted, errors: result.errors });
  } catch (err: unknown) {
    const error = err instanceof Error ? err.message : String(err);
    return Response.json({ error }, { status: 500 });
  }
}
