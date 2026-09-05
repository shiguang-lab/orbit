import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

const load = (specifier: string): Promise<any> => import(specifier as string);

const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
export const ELEVENLABS_CORS_HEADERS = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, x-api-key, anthropic-version, x-shiguangGateway-connection, X-ShiguangGateway-Lease-Owner, X-ShiguangGateway-Lease-Generation, x-internal-test, accept",
} as const;
const ALLOWED_RESPONSE_HEADERS = [
  "content-type",
  "content-disposition",
  "request-id",
  "retry-after",
] as const;

type ElevenLabsCredentials = {
  apiKey?: string | null;
  accessToken?: string | null;
  allExpired?: boolean;
};

export function elevenLabsOptionsResponse(): Response {
  return new Response(null, { status: 204, headers: ELEVENLABS_CORS_HEADERS });
}

export function isSafeElevenLabsVoiceId(value: string): boolean {
  return /^[A-Za-z0-9_-]+$/.test(value);
}

function proxyResponseHeaders(upstream: Response): Headers {
  const headers = new Headers(ELEVENLABS_CORS_HEADERS);
  for (const name of ALLOWED_RESPONSE_HEADERS) {
    const value = upstream.headers.get(name);
    if (value) headers.set(name, value);
  }
  return headers;
}

export async function proxyElevenLabsRequest(
  request: Request,
  pathname: string,
  init: Omit<RequestInit, "headers"> = {},
): Promise<Response> {
  const [
    { getProviderCredentialsWithQuotaPreflight, clearRecoveredProviderState },
    { isAllRateLimitedCredentials, rateLimitedProviderResponse },
    { buildErrorBody },
  ] = await Promise.all([
    load("@shiguang-gateway/core-domain/sse/auth"),
    load("@shiguang-gateway/core-domain/edge/rate-limit"),
    load("@shiguang-gateway/open-sse/utils/error.ts"),
  ]);
  const credentials = (await getProviderCredentialsWithQuotaPreflight(
    "elevenlabs",
  )) as ElevenLabsCredentials | null;
  if (credentials && isAllRateLimitedCredentials(credentials)) {
    return rateLimitedProviderResponse("elevenlabs", credentials);
  }
  const apiKey = credentials?.apiKey || credentials?.accessToken;
  if (!apiKey || credentials?.allExpired) {
    return new Response(
      JSON.stringify(buildErrorBody(401, "No credentials for provider: elevenlabs")),
      { status: 401, headers: { ...ELEVENLABS_CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${ELEVENLABS_API_BASE}${pathname}`);
  upstreamUrl.search = incomingUrl.search;
  const headers = new Headers();
  headers.set("xi-api-key", apiKey);
  const contentType = request.headers.get("content-type");
  if (contentType) headers.set("content-type", contentType);
  const accept = request.headers.get("accept");
  if (accept) headers.set("accept", accept);

  try {
    const upstream = await fetch(upstreamUrl, { ...init, headers });
    if (upstream.ok) await clearRecoveredProviderState(credentials as Record<string, unknown>);
    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: proxyResponseHeaders(upstream),
    });
  } catch (error) {
    return new Response(
      JSON.stringify(
        buildErrorBody(
          502,
          sanitizeErrorMessage(error instanceof Error ? error.message : "ElevenLabs request failed"),
        ),
      ),
      { status: 502, headers: { ...ELEVENLABS_CORS_HEADERS, "Content-Type": "application/json" } },
    );
  }
}
