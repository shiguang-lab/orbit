export type OutboundUrlGuardMode = "none" | "public-only" | "block-metadata";
export function arePrivateProviderUrlsAllowed(): boolean;
export function getProviderValidationGuard(): OutboundUrlGuardMode;
export function getProviderOutboundGuard(): OutboundUrlGuardMode;
export function parseAndValidateWebhookUrl(input: string | URL): URL;
