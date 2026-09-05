import { NextResponse } from "next/server";
import { getLoginJob } from "../../../../../../lib/services/cliproxyapi/loginManager.ts";
import { isAuthenticated } from "../../../../../../shared/utils/apiAuth.ts";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const job = getLoginJob(id);
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json(job);
}
