import { NextRequest, NextResponse } from "next/server";
import { isAuthenticated } from "../../../../../shared/utils/apiAuth.ts";
import { validateBody, isValidationFailure } from "../../../../../shared/validation/helpers.ts";
import { QdrantSearchSchema } from "../../../../../shared/schemas/qdrant.ts";
import { searchSemanticMemory } from "../../../../../lib/memory/qdrant.ts";
import { sanitizeErrorMessage } from "../../../../../../../open-sse/utils/error.ts";

export async function POST(request: NextRequest) {
  if (!(await isAuthenticated(request))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      { error: { message: "Invalid JSON body", details: [] } },
      { status: 400 },
    );
  }

  const validation = validateBody(QdrantSearchSchema, rawBody);
  if (isValidationFailure(validation)) {
    return NextResponse.json(validation.error, { status: 400 });
  }

  const { query, topK } = validation.data;

  try {
    const result = await searchSemanticMemory(query, topK);
    return NextResponse.json({
      ok: result.ok,
      results: result.results ?? [],
    });
  } catch (err: unknown) {
    const message = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: { message } }, { status: 500 });
  }
}
