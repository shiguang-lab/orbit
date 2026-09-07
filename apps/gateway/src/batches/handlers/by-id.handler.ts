import { getBatch, deleteBatch } from "@orbit/core/db/batches";
import { getApiKeyRequestScope } from "../../common/api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions, jsonResponse } from "../../common/cors.js";
import { formatBatchResponse } from "./format-batch-response.js";

export async function OPTIONS() {
  return handleCorsOptions();
}

function scopeCheck(
  scope: { isSessionAuth: boolean; apiKeyId: string | null },
  recordApiKeyId: string | null | undefined
): boolean {
  if (scope.isSessionAuth) return true;
  if (recordApiKeyId === null || recordApiKeyId === undefined) return true;
  return recordApiKeyId === scope.apiKeyId;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;

  const { id } = await params;
  const batch = getBatch(id);

  if (!batch || !scopeCheck(scope, batch.apiKeyId)) {
    return jsonResponse(
      { error: { message: "Batch not found", type: "invalid_request_error" } },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return jsonResponse(formatBatchResponse(batch), { headers: CORS_HEADERS });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;

  const { id } = await params;
  const batch = getBatch(id);

  if (!batch || !scopeCheck(scope, batch.apiKeyId)) {
    return jsonResponse(
      { error: { message: "Batch not found", type: "invalid_request_error" } },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Only allow deleting terminal batches (completed, failed, cancelled, expired)
  const terminal = ["completed", "failed", "cancelled", "expired"];
  if (!terminal.includes(batch.status)) {
    return jsonResponse(
      { error: { message: "Only terminal batches can be deleted", type: "invalid_request_error" } },
      { status: 409, headers: CORS_HEADERS }
    );
  }

  deleteBatch(id);

  return jsonResponse({ id, object: "batch", deleted: true }, { headers: CORS_HEADERS });
}
