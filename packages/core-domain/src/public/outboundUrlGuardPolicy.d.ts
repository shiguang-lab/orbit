export type OutboundUrlGuardMode = "none" | "public-only" | "block-metadata";
export function getProviderValidationGuard(): OutboundUrlGuardMode;
