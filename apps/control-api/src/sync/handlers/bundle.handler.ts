import { buildConfigSyncEnvelope } from "@shiguang-gateway/core-domain/control/sync-bundle";
import { getSyncTokenFromRequest, markSyncTokenUsed, validateSyncToken } from "@shiguang-gateway/core-domain/control/sync-tokens";
import { createErrorResponse, createErrorResponseFromUnknown } from "@shiguang-gateway/core-domain/shared/error-response";

function matchesEtag(request: Request, version: string) {
  const ifNoneMatch = request.headers.get("if-none-match");
  if (!ifNoneMatch) return false;
  return ifNoneMatch.split(",").map((part) => part.trim()).filter(Boolean)
    .some((candidate) => candidate === version || candidate === `"${version}"`);
}

function responseHeaders(version: string) {
  return {
    etag: `"${version}"`,
    "x-config-version": version,
    "cache-control": "private, no-store",
  };
}

export async function GET(request: Request) {
  try {
    const syncToken = await validateSyncToken(getSyncTokenFromRequest(request));
    if (!syncToken) return createErrorResponse({ status: 401, message: "Invalid sync token" });

    const { version, bundle } = await buildConfigSyncEnvelope();
    await markSyncTokenUsed(syncToken);
    const headers = responseHeaders(version);
    if (matchesEtag(request, version)) return new Response(null, { status: 304, headers });
    return Response.json({ version, bundle }, { headers });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to build sync bundle");
  }
}
