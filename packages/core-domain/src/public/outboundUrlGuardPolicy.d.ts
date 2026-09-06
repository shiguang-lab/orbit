export type OutboundUrlGuardMode = "none" | "public-only" | "block-metadata";
export function getProviderValidationGuard(): OutboundUrlGuardMode;
export function parseAndValidateWebhookUrl(input: string | URL): URL;
