import { resolvePublicCred } from "../../utils/publicCreds.ts";

export const BUILTIN_ANTIGRAVITY_CLIENT = {
  clientId: resolvePublicCred("antigravity_id"),
  clientSecret: resolvePublicCred("antigravity_alt"),
} as const;

export const BUILTIN_GEMINI_CLIENT = {
  clientId: resolvePublicCred("gemini_id"),
  clientSecret: resolvePublicCred("gemini_alt"),
} as const;

export type GoogleOauthClientMarker = "builtin" | `custom:${string}` | undefined;

function builtinClientFor(provider: string) {
  if (provider === "gemini") return BUILTIN_GEMINI_CLIENT;
  if (provider === "antigravity" || provider === "agy") return BUILTIN_ANTIGRAVITY_CLIENT;
  throw new Error(`no builtin OAuth client registered for provider: ${provider}`);
}

export function selectGoogleRefreshClient(
  provider: string,
  oauthClientMarker: GoogleOauthClientMarker,
  configuredClient: { clientId?: string; clientSecret?: string } | null | undefined
): { clientId: string; clientSecret: string } {
  if (
    typeof oauthClientMarker === "string" &&
    oauthClientMarker.startsWith("custom:") &&
    oauthClientMarker.slice("custom:".length) === configuredClient?.clientId &&
    configuredClient?.clientSecret
  ) {
    return {
      clientId: configuredClient.clientId,
      clientSecret: configuredClient.clientSecret,
    };
  }
  const builtin = builtinClientFor(provider);
  return { clientId: builtin.clientId, clientSecret: builtin.clientSecret };
}
