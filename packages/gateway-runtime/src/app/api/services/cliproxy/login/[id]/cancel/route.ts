import { NextResponse } from "next/server";
import { cancelLoginJob } from "../../../../../../../lib/services/cliproxyapi/loginManager.ts";
import { isAuthenticated } from "../../../../../../../shared/utils/apiAuth.ts";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  const success = cancelLoginJob(id);
  return NextResponse.json({ success });
}
