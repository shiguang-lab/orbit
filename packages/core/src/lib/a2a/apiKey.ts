import { validateApiKey } from "../db/apiKeys.ts";

export function extractA2AApiKey(request: Request): string | null {
  const authorization = request.headers.get("authorization")?.trim();
  if (authorization?.toLowerCase().startsWith("bearer ")) {
    return authorization.slice(7).trim() || null;
  }
  const anthropicVersion = request.headers.get("anthropic-version");
  const userAgent = request.headers.get("user-agent");
  if (anthropicVersion || (userAgent && /claude-code|claude-cli|anthropic/i.test(userAgent))) {
    const apiKey = request.headers.get("x-api-key")?.trim();
    if (apiKey) return apiKey;
  }
  return request.headers.get("x-goog-api-key")?.trim() || null;
}

export async function isValidA2AApiKey(apiKey: string): Promise<boolean> {
  if (!apiKey) return false;
  const configuredKey = process.env.ORBIT_API_KEY || process.env.ROUTER_API_KEY;
  if (configuredKey && apiKey === configuredKey) return true;
  return validateApiKey(apiKey);
}
