import { NextResponse } from "next/server";
import { isAuthenticated } from "../../../../shared/utils/apiAuth.ts";
import { listEmbeddingProviders } from "../../../../lib/memory/embedding/index.ts";
import { sanitizeErrorMessage } from "../../../../../../open-sse/utils/error.ts";

export async function GET(request: Request) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const providers = await listEmbeddingProviders();
    return NextResponse.json({ providers });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
