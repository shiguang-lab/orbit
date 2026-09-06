import { jwtVerify } from "jose";

export interface DashboardSessionRequest {
  cookies?: {
    get?: (name: string) => { value?: string } | undefined;
  };
  headers?: Headers | Record<string, string | string[] | undefined>;
}

export function getCookieValueFromHeader(
  headers: DashboardSessionRequest["headers"],
  name: string,
): string | null {
  const cookieHeader =
    headers instanceof Headers
      ? headers.get("cookie") || headers.get("Cookie")
      : Array.isArray(headers?.cookie)
        ? headers.cookie[0]
        : headers?.cookie;
  if (!cookieHeader) return null;

  for (const segment of cookieHeader.split(";")) {
    const [rawKey, ...rawValue] = segment.split("=");
    if (rawKey?.trim() === name && rawValue.length > 0) {
      return rawValue.join("=").trim();
    }
  }
  return null;
}

export async function isDashboardSessionAuthenticated(
  request?: DashboardSessionRequest | null,
  jwtSecret: string | undefined = process.env.JWT_SECRET,
): Promise<boolean> {
  if (!jwtSecret) return false;

  const token =
    request?.cookies?.get?.("auth_token")?.value ||
    getCookieValueFromHeader(request?.headers, "auth_token");
  if (!token) return false;

  try {
    await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return true;
  } catch {
    return false;
  }
}
