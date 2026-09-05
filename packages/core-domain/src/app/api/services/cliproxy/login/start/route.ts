import { NextResponse } from "next/server";
import { startLoginJob, type CliproxyLoginProvider } from "../../../../../../lib/services/cliproxyapi/loginManager.ts";
import { isAuthenticated } from "../../../../../../shared/utils/apiAuth.ts";

export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as { provider?: string };
    const provider = body.provider as CliproxyLoginProvider;
    if (!provider) {
      return NextResponse.json({ error: "Missing required 'provider' parameter" }, { status: 400 });
    }

    const job = await startLoginJob(provider);
    return NextResponse.json(job);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
