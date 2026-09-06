/**
 * Secondary guard for the local infrastructure endpoints.
 *
 * When the host runtime supplies request headers, allow either the desktop
 * bearer token or a direct loopback request. Without injected headers, retain
 * the production opt-in behavior used by the existing control runtime.
 */
export function isLocalRequestAllowed(): { allowed: true } | { allowed: false; reason: string } {
  const headers = (globalThis as { __omniRequestHeaders?: Headers }).__omniRequestHeaders;
  if (headers) {
    const expected = process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_TOKEN;
    if (expected) {
      const supplied = headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
      if (supplied && constantTimeEqual(supplied, expected)) {
        return { allowed: true };
      }
    }

    const host = headers.get("host") ?? "";
    const forwardedFor = headers.get("x-forwarded-for") ?? "";
    const isLoopbackHost = /^(localhost|127\.0\.0\.1|::1|\[::1\])(:\d+)?$/.test(host);
    const isLoopbackForward =
      forwardedFor === "" ||
      /^127\.|^::1$|^localhost$/.test(forwardedFor.split(",")[0]?.trim() ?? "");
    if (isLoopbackHost && isLoopbackForward) {
      return { allowed: true };
    }
    return { allowed: false, reason: "non-local origin" };
  }

  if (
    process.env.NODE_ENV === "production" &&
    process.env.SHIGUANG_GATEWAY_LOCAL_ENDPOINTS_ENABLED !== "1"
  ) {
    return { allowed: false, reason: "disabled in production" };
  }

  return { allowed: true };
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
