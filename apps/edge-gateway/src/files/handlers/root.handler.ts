import { createFile, listFiles, formatFileResponse, countFiles } from "@shiguang-gateway/core-domain/db/files";
import { getApiKeyRequestScope } from "../../common/api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions, jsonResponse } from "../../common/cors.js";

export async function OPTIONS() {
  return handleCorsOptions();
}

const DEFAULT_LIST_LIMIT = 20;
const MAX_LIST_LIMIT = 10000;

export function parseFilesListQuery(searchParams: URLSearchParams):
  | {
      ok: true;
      limit: number;
      after: string | undefined;
      order: "asc" | "desc";
      purpose: string | undefined;
    }
  | { ok: false; response: Response } {
  const rawLimit = searchParams.get("limit");
  let limit = DEFAULT_LIST_LIMIT;

  if (rawLimit !== null) {
    if (!/^\d+$/.test(rawLimit)) {
      return {
        ok: false,
        response: jsonResponse(
          { error: { message: "limit must be a positive integer", type: "invalid_request_error" } },
          { status: 400, headers: CORS_HEADERS }
        ),
      };
    }

    limit = Number.parseInt(rawLimit, 10);
    if (limit < 1 || limit > MAX_LIST_LIMIT) {
      return {
        ok: false,
        response: jsonResponse(
          {
            error: {
              message: `limit must be between 1 and ${MAX_LIST_LIMIT}`,
              type: "invalid_request_error",
            },
          },
          { status: 400, headers: CORS_HEADERS }
        ),
      };
    }
  }

  const orderParam = searchParams.get("order");
  const order = orderParam === "asc" ? "asc" : "desc";

  return {
    ok: true,
    limit,
    after: searchParams.get("after") || undefined,
    order,
    purpose: searchParams.get("purpose") || undefined,
  };
}

export async function POST(request: Request) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;
  const apiKeyId = scope.apiKeyId;

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const purpose = formData.get("purpose") as string;
    const expiresAfterAnchor = formData.get("expires_after[anchor]") as string;
    const expiresAfterSeconds = formData.get("expires_after[seconds]") as string;

    if (!file || !purpose) {
      return jsonResponse(
        { error: { message: "Missing file or purpose", type: "invalid_request_error" } },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const MAX_FILE_BYTES = 512 * 1024 * 1024; // 512 MB
    if (file.size > MAX_FILE_BYTES) {
      return jsonResponse(
        {
          error: {
            message: "File exceeds maximum allowed size of 512 MB",
            type: "invalid_request_error",
          },
        },
        { status: 400, headers: CORS_HEADERS }
      );
    }

    const bytes = file.size;
    const filename = file.name;
    const mimeType = file.type;
    const content = Buffer.from(await file.arrayBuffer());

    let expiresAt: number | undefined;
    if (expiresAfterAnchor === "created_at" && expiresAfterSeconds) {
      const seconds = Number.parseInt(expiresAfterSeconds);
      if (!Number.isNaN(seconds)) {
        expiresAt = Math.floor(Date.now() / 1000) + seconds;
      }
    }

    const record = createFile({
      bytes,
      filename,
      purpose,
      content,
      mimeType,
      apiKeyId,
      expiresAt,
    });

    return jsonResponse(formatFileResponse(record), { headers: CORS_HEADERS });
  } catch (error) {
    console.error("[FILES] Upload failed:", error);
    return jsonResponse(
      { error: { message: "Upload failed", type: "server_error" } },
      { status: 500, headers: CORS_HEADERS }
    );
  }
}

export async function GET(request: Request) {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;
  const apiKeyId = scope.apiKeyId;

  const { searchParams } = new URL(request.url);
  const parsed = parseFilesListQuery(searchParams);
  if (!parsed.ok) return parsed.response;
  const { limit, after, order, purpose } = parsed;

  // We fetch limit + 1 to check if there are more items
  const files = listFiles({
    apiKeyId: apiKeyId || undefined,
    purpose,
    limit: limit + 1,
    after,
    order,
  });

  const hasMore = files.length > limit;
  const data = files.slice(0, limit);
  const totalCount = countFiles({ apiKeyId: apiKeyId || undefined, purpose });

  return jsonResponse(
    {
      object: "list",
      data: data.map((f) => formatFileResponse(f)),
      first_id: data.length > 0 ? data[0].id : null,
      last_id: data.length > 0 ? data.at(-1)?.id ?? null : null,
      has_more: hasMore,
      total_count: totalCount,
    },
    { headers: CORS_HEADERS }
  );
}
