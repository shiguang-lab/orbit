import { isAdminIdentity, resolveGatewayIdentity } from "./gateway-session.js";

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

/** Browser sessions are exclusively verified gateway SSO assertions. */
export async function isDashboardSessionAuthenticated(
  request?: DashboardSessionRequest | null,
): Promise<boolean> {
  if (!request?.headers) return false;
  const headers = request.headers instanceof Headers
    ? Object.fromEntries(request.headers.entries())
    : request.headers;
  return isAdminIdentity(await resolveGatewayIdentity({ headers }));
}
