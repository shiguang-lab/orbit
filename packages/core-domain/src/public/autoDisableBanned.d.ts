export const AUTO_DISABLE_BANNED_SCOPES: readonly ["all", "subscription"];
export type AutoDisableBannedScope = "all" | "subscription";
export function normalizeAutoDisableBannedScope(value: unknown): AutoDisableBannedScope;
