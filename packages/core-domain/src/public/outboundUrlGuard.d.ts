export type OutboundUrlGuardErrorCode = "OUTBOUND_URL_GUARD_BLOCKED" | "OUTBOUND_URL_INVALID";

export class OutboundUrlGuardError extends Error {
  code: OutboundUrlGuardErrorCode;
  url: string;
  hostname?: string | null;
}

export function parseOutboundUrl(input: string | URL): URL;
export function parseAndValidatePublicUrl(input: string | URL): URL;
export function parseAndValidateNonMetadataUrl(input: string | URL): URL;
