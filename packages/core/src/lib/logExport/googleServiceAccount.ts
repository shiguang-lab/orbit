import { createSign } from "node:crypto";

export interface ServiceAccountKey {
  type?: string;
  project_id?: string;
  client_email: string;
  private_key: string;
  token_uri?: string;
}

const TOKEN_URI = "https://oauth2.googleapis.com/token";
const tokenCache = new Map<string, { token: string; expiresAt: number }>();

export function parseServiceAccountKey(raw: string): ServiceAccountKey {
  let value: unknown;
  try { value = JSON.parse(raw); } catch { throw new Error("Service account key is not valid JSON"); }
  if (!value || typeof value !== "object") throw new Error("Service account key must be a JSON object");
  const key = value as Partial<ServiceAccountKey>;
  if (key.type && key.type !== "service_account") throw new Error("Expected a service_account key");
  if (typeof key.client_email !== "string" || !key.client_email) throw new Error("Service account key is missing client_email");
  if (typeof key.private_key !== "string" || !key.private_key) throw new Error("Service account key is missing private_key");
  return { ...key, client_email: key.client_email, private_key: key.private_key.replace(/\\n/g, "\n"), token_uri: key.token_uri || TOKEN_URI };
}

function b64(value: string): string { return Buffer.from(value).toString("base64url"); }

export async function getServiceAccountAccessToken(
  key: ServiceAccountKey,
  scope: string,
  fetchImpl: typeof fetch = fetch
): Promise<string> {
  const cacheKey = `${key.client_email}::${scope}`;
  const cached = tokenCache.get(cacheKey);
  if (cached && cached.expiresAt - 60_000 > Date.now()) return cached.token;
  const now = Math.floor(Date.now() / 1000);
  const input = `${b64(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64(JSON.stringify({ iss: key.client_email, scope, aud: key.token_uri, iat: now, exp: now + 3600 }))}`;
  const assertion = `${input}.${createSign("RSA-SHA256").update(input).sign(key.private_key, "base64url")}`;
  const response = await fetchImpl(key.token_uri || TOKEN_URI, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }).toString(),
  });
  const body = await response.json().catch(() => null) as { access_token?: string; expires_in?: number; error_description?: string; error?: string } | null;
  if (!response.ok || !body?.access_token) throw new Error(`Google token exchange failed: ${body?.error_description || body?.error || `HTTP ${response.status}`}`);
  tokenCache.set(cacheKey, { token: body.access_token, expiresAt: Date.now() + (body.expires_in ?? 3600) * 1000 });
  return body.access_token;
}

export function __resetServiceAccountTokenCache(): void { tokenCache.clear(); }
