import { deleteCompletedBatches } from "@shiguang-gateway/core-domain/edge/local-db";
import { getApiKeyRequestScope } from "./api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions, jsonResponse } from "./cors.js";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function DELETE(request: Request) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;

  // Allow session-authenticated (dashboard) requests; for API-key requests, require a key
  if (!scope.isSessionAuth && !scope.apiKeyId) {
    return jsonResponse(
      { error: { message: "Authentication required", type: "invalid_request_error" } },
      { status: 401, headers: CORS_HEADERS }
    );
  }

  const result = deleteCompletedBatches();

  return jsonResponse(
    { deleted: true, deletedBatches: result.deletedBatches, deletedFiles: result.deletedFiles },
    { headers: CORS_HEADERS }
  );
}
