import { getFile, getFileContent } from "@shiguang-gateway/core-domain/edge/local-db";
import { getApiKeyRequestScope } from "./api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions, jsonResponse } from "./cors.js";

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

  const content = getFileContent(id);
  if (!content) {
    return jsonResponse(
      { error: { message: "File content not found", type: "invalid_request_error" } },
      { status: 404, headers: CORS_HEADERS }
    );
  }

  const sanitizedFilename = file.filename.replace(/[^\w.\-()\[\] ]/g, "_").slice(0, 255);
  const encodedFilename = encodeURIComponent(file.filename);

  return new Response(content, {
    headers: {
      ...CORS_HEADERS,
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `attachment; filename="${sanitizedFilename}"; filename*=UTF-8''${encodedFilename}`,
    },
  });
}
