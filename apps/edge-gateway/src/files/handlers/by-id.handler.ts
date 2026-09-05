import { getFile, deleteFile, formatFileResponse } from "@shiguang-gateway/core-domain/db/files";
import { getApiKeyRequestScope } from "../../common/api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions, jsonResponse } from "../../common/cors.js";

export async function OPTIONS() {
  return handleCorsOptions();
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;
  const apiKeyId = scope.apiKeyId;

  const { id } = await params;
  const file = getFile(id);

  if (!file || (file.apiKeyId !== null && file.apiKeyId !== apiKeyId && !scope.isSessionAuth)) {
    return jsonResponse(
      { error: { message: "File not found", type: "invalid_request_error" } },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  return jsonResponse(formatFileResponse(file), { headers: CORS_HEADERS });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;
  const apiKeyId = scope.apiKeyId;

  const { id } = await params;
  const file = getFile(id);

  if (!file) {
    return jsonResponse(
      { error: { message: "File not found", type: "invalid_request_error" } },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  // Allow session-authenticated (dashboard) requests to delete any file;
  // for API-key-authenticated requests, enforce scope.
  if (!scope.isSessionAuth && file.apiKeyId !== null && file.apiKeyId !== apiKeyId) {
    return jsonResponse(
      { error: { message: "File not found", type: "invalid_request_error" } },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  deleteFile(id);

  return jsonResponse(
    {
      id,
      object: "file",
      deleted: true,
    },
    { headers: CORS_HEADERS }
  );
}
