import { timingSafeEqual } from "node:crypto";
import { readFileSync } from "node:fs";

export const INTERNAL_SERVICE_AUTH_HEADER = "x-shiguang-gateway-internal-service-token";
const PEER_LOCALITY_HEADER = "x-shiguangGateway-peer-locality";

function configuredToken(): string {
  const inlineToken = process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN?.trim();
  if (inlineToken) return inlineToken;
  const tokenFile = process.env.SHIGUANG_GATEWAY_INTERNAL_SERVICE_TOKEN_FILE?.trim();
  if (!tokenFile) return "";
  try { return readFileSync(tokenFile, "utf8").trim(); } catch { return ""; }
}

export function getInternalServiceAuthHeaders(): Record<string, string> {
  const token = configuredToken();
  return token ? { [INTERNAL_SERVICE_AUTH_HEADER]: token } : {};
}

export function isInternalServiceRequest(request: Request): boolean {
  const expected = configuredToken();
  const provided = request.headers.get(INTERNAL_SERVICE_AUTH_HEADER)?.trim() || "";
  if (!expected || !provided) return false;
  const actualBytes = Buffer.from(provided, "utf8");
  const expectedBytes = Buffer.from(expected, "utf8");
  return actualBytes.length === expectedBytes.length && timingSafeEqual(actualBytes, expectedBytes);
}

export function isTrustedLoopbackInternalServiceRequest(request?: Request | null): boolean {
  return Boolean(request?.headers && request.headers.get(PEER_LOCALITY_HEADER) === "loopback" && isInternalServiceRequest(request));
}
