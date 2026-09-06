/**
 * Shared provider client identity contracts.
 *
 * The profile is persisted by management APIs and consumed by both the
 * provider OAuth integration and the streaming engine.  Keep this module
 * transport-neutral: request/header application belongs to the owning app.
 */
export const ANTIGRAVITY_CLIENT_PROFILE_VALUES = ["ide", "cli"] as const;

export type AntigravityClientProfile = (typeof ANTIGRAVITY_CLIENT_PROFILE_VALUES)[number];

export const DEFAULT_ANTIGRAVITY_CLIENT_PROFILE: AntigravityClientProfile = "ide";

export type AntigravityClientProfileSetting = AntigravityClientProfile;

export const ANTIGRAVITY_CLIENT_PROFILE_OPTIONS: Array<{
  value: AntigravityClientProfileSetting;
  labelKey: "antigravityClientProfileIde" | "antigravityClientProfileCli";
}> = [
  { value: "ide", labelKey: "antigravityClientProfileIde" },
  { value: "cli", labelKey: "antigravityClientProfileCli" },
];

export function normalizeAntigravityClientProfile(value: unknown): AntigravityClientProfile {
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "ide" || normalized === "cli") {
      return normalized;
    }
    // Read-only compatibility for values persisted before the official CLI profile
    // replaced ShiguangGateway's synthetic harness/sdk naming. New writes are validated
    // against ANTIGRAVITY_CLIENT_PROFILE_VALUES and cannot reintroduce these aliases.
    if (normalized === "harness" || normalized === "sdk") {
      return "cli";
    }
  }
  return DEFAULT_ANTIGRAVITY_CLIENT_PROFILE;
}

export const normalizeAntigravityClientProfileSetting = normalizeAntigravityClientProfile;
