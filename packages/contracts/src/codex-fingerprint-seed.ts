export const CODEX_FINGERPRINT_MODES = ["off", "device", "session", "full"] as const;
export type CodexFingerprintMode = (typeof CODEX_FINGERPRINT_MODES)[number];
export const CODEX_FINGERPRINT_MODE_KEY = "codexFingerprintMode";
export const CODEX_FINGERPRINT_SEED_KEY = "codexFingerprintSeed";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function nonEmptyString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized || null;
}

export function getCodexFingerprintSeed(
  providerSpecificData?: Record<string, unknown> | null,
): string | null {
  const value = providerSpecificData?.[CODEX_FINGERPRINT_SEED_KEY];
  return typeof value === "string" && UUID_PATTERN.test(value.trim()) ? value.trim() : null;
}

export function codexFingerprintModeRequiresSeed(mode: CodexFingerprintMode): boolean {
  return mode === "device" || mode === "session" || mode === "full";
}

export function isCodexOAuthCredentials(
  credentials?: { accessToken?: unknown; refreshToken?: unknown } | null,
): boolean {
  return Boolean(nonEmptyString(credentials?.accessToken) || nonEmptyString(credentials?.refreshToken));
}

export function getCodexFingerprintMode(
  providerSpecificData?: Record<string, unknown> | null,
  isOAuth = true,
): CodexFingerprintMode {
  if (!isOAuth) return "off";
  const raw = (
    nonEmptyString(providerSpecificData?.[CODEX_FINGERPRINT_MODE_KEY]) ||
    nonEmptyString(providerSpecificData?.codex_fingerprint_mode) ||
    ""
  ).toLowerCase();
  return (CODEX_FINGERPRINT_MODES as readonly string[]).includes(raw)
    ? (raw as CodexFingerprintMode)
    : "session";
}

export function ensureCodexFingerprintSeed(
  providerSpecificData?: Record<string, unknown> | null,
  credentials?: { accessToken?: unknown; refreshToken?: unknown } | null,
  existingProviderSpecificData?: Record<string, unknown> | null,
): Record<string, unknown> | undefined {
  const next = { ...(providerSpecificData || {}) };
  delete next[CODEX_FINGERPRINT_SEED_KEY];
  if (!isCodexOAuthCredentials(credentials)) return Object.keys(next).length > 0 ? next : undefined;

  const existingSeed = getCodexFingerprintSeed(existingProviderSpecificData);
  if (existingSeed) {
    next[CODEX_FINGERPRINT_SEED_KEY] = existingSeed;
    return next;
  }
  if (codexFingerprintModeRequiresSeed(getCodexFingerprintMode(next, true))) {
    next[CODEX_FINGERPRINT_SEED_KEY] = globalThis.crypto.randomUUID();
    return next;
  }
  return Object.keys(next).length > 0 ? next : undefined;
}
