import { getBatch, updateBatch } from "@orbit/core/db/batches";
import { getApiKeyRequestScope } from "../../common/api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions, jsonResponse } from "../../common/cors.js";
import { formatBatchResponse } from "./format-batch-response.js";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;
  const apiKeyId = scope.apiKeyId;

  const { id } = await params;
  const batch = getBatch(id);

  if (!batch || (batch.apiKeyId !== null && batch.apiKeyId !== apiKeyId)) {
    return jsonResponse(
      { error: { message: "Batch not found", type: "invalid_request_error" } },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  if (["completed", "failed", "cancelled", "expired"].includes(batch.status)) {
    return jsonResponse(
      {
        error: { message: `Batch ${id} is already ${batch.status}`, type: "invalid_request_error" },
      },
      { status: 400, headers: CORS_HEADERS }
    );
  }

  if (batch.status === "cancelling") {
    return jsonResponse(formatBatchResponse(batch), { headers: CORS_HEADERS });
  }

  updateBatch(id, {
    status: "cancelling",
    cancellingAt: Math.floor(Date.now() / 1000),
  });

  const updatedBatch = getBatch(id);

  return jsonResponse(formatBatchResponse(updatedBatch), { headers: CORS_HEADERS });
}
