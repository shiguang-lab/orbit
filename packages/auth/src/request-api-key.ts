export type AuthRequestHeaders =
  | Headers
  | { get?: (name: string) => string | null }
  | Record<string, string | string[] | undefined>;

export type ApiKeyRequestLike = {
  headers?: AuthRequestHeaders | null;
  url?: string | null;
};

function readHeaderValue(
  headers: AuthRequestHeaders | null | undefined,
  name: string,
): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === "function") {
    const value = (headers as Headers).get(name) || (headers as Headers).get(name.toLowerCase());
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }
  const record = headers as Record<string, string | string[] | undefined>;
  const value = record[name] || record[name.toLowerCase()] || record[name.toUpperCase()];
  if (Array.isArray(value)) {
    return typeof value[0] === "string" && value[0].trim() ? value[0].trim() : null;
  }
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function readNonEmptyUrlToken(request: ApiKeyRequestLike): string | null {
  if (typeof request.url !== "string" || !request.url.trim()) return null;
  try {
    const segments = new URL(request.url, "http://localhost").pathname
      .split("/")
      .map((segment) => segment.trim())
      .filter(Boolean);
    if (segments[0] === "vscode" && segments[1]) {
      return decodeURIComponent(segments[1]).trim() || null;
    }
    if (segments[0] === "api" && segments[1] === "v1" && segments[2] === "vscode") {
      const index = segments[3] === "raw" || segments[3] === "combos" ? 4 : 3;
      if (segments[index]) return decodeURIComponent(segments[index]).trim() || null;
    }
  } catch {
    return null;
  }
  return null;
}

/** Extract the gateway API key from protocol headers or a scoped VS Code URL. */
export function extractApiKey(
  request: ApiKeyRequestLike,
  options?: { allowUrl?: boolean },
): string | null {
  const authorization =
    readHeaderValue(request.headers, "Authorization") ||
    readHeaderValue(request.headers, "authorization");
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim() || null;
  }

  const anthropicVersion = readHeaderValue(request.headers, "anthropic-version");
  const userAgent = readHeaderValue(request.headers, "user-agent");
  if (anthropicVersion || (userAgent && /claude-code|claude-cli|anthropic/i.test(userAgent))) {
    const apiKey = readHeaderValue(request.headers, "x-api-key");
    if (apiKey) return apiKey;
  }

  const googleApiKey = readHeaderValue(request.headers, "x-goog-api-key");
  if (googleApiKey) return googleApiKey;
  if (options?.allowUrl === false) return null;
  return readNonEmptyUrlToken(request);
}

/** Apply persistent environment keys before consulting the application's key store. */
export async function isValidGatewayApiKey(
  apiKey: string,
  validateStoredKey: (apiKey: string) => boolean | Promise<boolean>,
): Promise<boolean> {
  if (!apiKey) return false;
  const environmentKey = process.env.ORBIT_API_KEY || process.env.ROUTER_API_KEY;
  if (environmentKey && apiKey === environmentKey) return true;
  return await validateStoredKey(apiKey);
}
