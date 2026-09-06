import { NOAUTH_PROVIDERS } from "@shiguang-gateway/contracts/config/providerCatalog";
import { REGISTRY } from "@shiguang-gateway/provider-catalog/provider-registry";

export type CredentialRequirement = "none" | "optional" | "oauth" | "required";

export function worksWithoutCredential(req: CredentialRequirement): boolean {
  return req === "none" || req === "optional";
}

export function getCredentialRequirement(providerId: string): CredentialRequirement {
  const entry = REGISTRY[providerId];

  if (entry?.anonymousApiKey) return "optional";

  const noAuth = (NOAUTH_PROVIDERS as Record<string, { noAuth?: boolean }>)[providerId];
  if (noAuth?.noAuth === true) return "none";

  if (!entry) return "required";
  if (entry.authType === "none") return "none";
  if (entry.authType === "optional") return "optional";
  if (entry.authType === "oauth") return "oauth";
  return "required";
}

export function listNoCredentialProviders(): string[] {
  const ids = new Set([...Object.keys(NOAUTH_PROVIDERS), ...Object.keys(REGISTRY)]);
  return [...ids].filter((id) => worksWithoutCredential(getCredentialRequirement(id))).sort();
}

export const NOT_TOKEN_QUANTIFIABLE_BUT_CREDENTIALED: readonly string[] = [
  "agy",
  "blackbox",
  "friendliai",
  "iflytek",
  "liquid",
  "muse-spark-web",
  "sparkdesk",
];

export interface KeylessConsistencyReport {
  unexpected: string[];
  stale: string[];
}

export function checkKeylessCatalogConsistency(
  catalog: readonly { provider: string; freeType: string }[]
): KeylessConsistencyReport {
  const labelledKeyless = [
    ...new Set(catalog.filter((m) => m.freeType === "keyless").map((m) => m.provider)),
  ].sort();

  const credentialed = labelledKeyless.filter(
    (id) => !worksWithoutCredential(getCredentialRequirement(id))
  );

  const recorded = new Set(NOT_TOKEN_QUANTIFIABLE_BUT_CREDENTIALED);
  return {
    unexpected: credentialed.filter((id) => !recorded.has(id)),
    stale: [...recorded].filter((id) => !credentialed.includes(id)).sort(),
  };
}
