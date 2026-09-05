import { createBatch, listBatches, countBatches } from "@shiguang-gateway/core-domain/db/batches";
import { getFile } from "@shiguang-gateway/core-domain/db/files";
import { v1BatchCreateSchema } from "@shiguang-gateway/core-domain/edge/batches-validation-schemas";
import { getApiKeyRequestScope } from "./api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions, jsonResponse } from "./cors.js";
import { formatBatchResponse } from "./format-batch-response.js";
import { parseBatchListLimit } from "./parse-list-limit.js";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(request: Request) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;
  const apiKeyId = scope.apiKeyId;

  try {
    const body = await request.json();
    const validation = v1BatchCreateSchema.safeParse(body);
    if (!validation.success) {
      return jsonResponse(
        {
          error: {
            message: validation.error.message,
            type: "invalid_request_error",
          },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }
    const validated = validation.data;

    const inputFile = getFile(validated.input_file_id);
    if (!inputFile || (inputFile.apiKeyId !== null && inputFile.apiKeyId !== apiKeyId)) {
      return jsonResponse(
        { error: { message: "Input file not found", type: "invalid_request_error" } },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const batch = createBatch({
      endpoint: validated.endpoint as any,
      completionWindow: validated.completion_window,
      inputFileId: validated.input_file_id,
      metadata: validated.metadata,
      apiKeyId,
      outputExpiresAfterSeconds: validated.output_expires_after?.seconds || null,
      outputExpiresAfterAnchor: validated.output_expires_after?.anchor || null,
    });

    return jsonResponse(formatBatchResponse(batch), { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[BATCHES] Create failed:", error);
    return jsonResponse(
      {
        error: {
          message: error instanceof Error ? error.message : "Create failed",
          type: "invalid_request_error",
        },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }
}

export async function GET(request: Request) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;
  const apiKeyId = scope.apiKeyId;

  const url = new URL(request.url);
  const parsedLimit = parseBatchListLimit(url.searchParams.get("limit"));
  if (!parsedLimit.ok) {
    return jsonResponse(
      { error: { message: parsedLimit.message, type: "invalid_request_error" } },
      { status: 400, headers: CORS_HEADERS }
    );
  }
  const limit = parsedLimit.limit;
  const after = url.searchParams.get("after") || undefined;

  const batches = listBatches(apiKeyId || undefined, limit + 1, after);
  const hasMore = batches.length > limit;
  const data = hasMore ? batches.slice(0, limit) : batches;

  const formattedData = data.map((b) => formatBatchResponse(b));

  const totalCount = countBatches(apiKeyId || undefined);

  return jsonResponse(
    {
      object: "list",
      data: formattedData,
      first_id: formattedData.length > 0 ? formattedData[0].id : null,
      last_id: formattedData.length > 0 ? formattedData.at(-1)?.id ?? null : null,
      has_more: hasMore,
      total_count: totalCount,
    },
    { headers: CORS_HEADERS }
  );
}
