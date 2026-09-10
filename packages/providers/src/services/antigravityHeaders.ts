import type { AntigravityClientProfile } from "@orbit/contracts/provider-client-profiles";
import {
  getCachedAntigravityCliVersion,
  getCachedAntigravityIdeVersion,
} from "./antigravityVersion.ts";

export const ANTIGRAVITY_IDE_NODE_API_CLIENT = "google-api-nodejs-client/10.3.0";
export const ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT = "gl-node/22.21.1";

// Antigravity presents the native macOS desktop client fingerprint: the upstream
// backend expects the Mac build, so the OS/arch token is pinned to darwin/arm64
// regardless of the host Orbit happens to run on (#8098). The IDE / CLI /
// IDE-Node User-Agent split (#8013) is preserved — only the platform token is fixed.
const ANTIGRAVITY_OS_TYPE = "darwin";
const ANTIGRAVITY_ARCH = "arm64";

function withOptionalBearerAuth(
  headers: Record<string, string>,
  accessToken?: string | null
): Record<string, string> {
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
}

export function antigravityIdeUserAgent(version = getCachedAntigravityIdeVersion()): string {
  return `antigravity/ide/${version} ${ANTIGRAVITY_OS_TYPE}/${ANTIGRAVITY_ARCH}`;
}

export function antigravityCliUserAgent(
  version = getCachedAntigravityCliVersion(),
  authMethod = "consumer"
): string {
  return `antigravity/cli/${version} (aidev_client; os_type=${ANTIGRAVITY_OS_TYPE}; arch=${ANTIGRAVITY_ARCH}; auth_method=${authMethod})`;
}

export function antigravityIdeNodeUserAgent(version = getCachedAntigravityIdeVersion()): string {
  return `antigravity/${version} ${ANTIGRAVITY_OS_TYPE}/${ANTIGRAVITY_ARCH} ${ANTIGRAVITY_IDE_NODE_API_CLIENT}`;
}

export function getAntigravityOAuthUserAgent(profile: AntigravityClientProfile): string {
  return profile === "cli" ? antigravityCliUserAgent() : antigravityIdeNodeUserAgent();
}

export function getAntigravityContentHeaders(
  profile: AntigravityClientProfile,
  accessToken?: string | null
): Record<string, string> {
  return withOptionalBearerAuth(
    {
      "Content-Type": "application/json",
      "User-Agent": profile === "cli" ? antigravityCliUserAgent() : antigravityIdeUserAgent(),
    },
    accessToken
  );
}

export function getAntigravityIdeNodeHeaders(accessToken?: string | null): Record<string, string> {
  return withOptionalBearerAuth(
    {
      "Content-Type": "application/json",
      "User-Agent": antigravityIdeNodeUserAgent(),
      "X-Goog-Api-Client": ANTIGRAVITY_IDE_NODE_X_GOOG_API_CLIENT,
    },
    accessToken
  );
}

/**
 * loadCodeAssist/onboardUser's `metadata` body is a protobuf-JSON-shaped object —
 * ideType/pluginType are int32 enums on the wire, not strings, and platform is
 * required. Sending the bare string "ANTIGRAVITY" with no platform/pluginType reads
 * to Google's backend as an incomplete client identity and gets rejected with 403.
 *
 * orbiot pins the client fingerprint to darwin/arm64 (#8098), so instead of
 * resolving the platform from the host we always emit DARWIN_ARM64 (= 2).
 */
const ANTIGRAVITY_IDE_TYPE_ENUM = 9;
const ANTIGRAVITY_PLUGIN_TYPE_ENUM = 2;
const ANTIGRAVITY_PLATFORM_DARWIN_ARM64_ENUM = 2;

/** Native loadCodeAssist body metadata captured from both official clients. */
export function getAntigravityLoadCodeAssistMetadata(): Record<string, number> {
  return {
    ideType: ANTIGRAVITY_IDE_TYPE_ENUM,
    platform: ANTIGRAVITY_PLATFORM_DARWIN_ARM64_ENUM,
    pluginType: ANTIGRAVITY_PLUGIN_TYPE_ENUM,
  };
}
