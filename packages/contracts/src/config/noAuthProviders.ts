import { NOAUTH_PROVIDERS } from "./providerCatalog.js";

type ProviderWithAlias = { alias?: string };
type NoAuthProviderEntry = { id: string; alias?: string };

const noAuthProviderEntries = Object.values(NOAUTH_PROVIDERS) as NoAuthProviderEntry[];

// Search providers are resolved in open-sse but their aliases are owned by the
// provider catalog. Keeping this small alias table here avoids making the
// streaming package import the legacy core-domain catalog.
const SEARCH_PROVIDER_ALIASES: Readonly<Record<string, string>> = {
  "perplexity-search": "pplx-search",
  "anysearch-search": "anysearch",
  firecrawl: "fc",
  "google-pse-search": "google-pse",
  "nimble-search": "nimble",
  "linkup-search": "linkup",
  "searchapi-search": "searchapi",
  "youcom-search": "youcom-search",
  "searxng-search": "searxng",
  "x-search": "x_search",
  "xquik-search": "xquik",
};

function providerAlias(providerId: string): string | undefined {
  const noAuth = (NOAUTH_PROVIDERS as Record<string, ProviderWithAlias>)[providerId];
  return noAuth?.alias || SEARCH_PROVIDER_ALIASES[providerId];
}

export function normalizeBlockedProviderSet(blockedProviders: unknown): Set<string> {
  const entries = blockedProviders instanceof Set ? Array.from(blockedProviders) : blockedProviders;
  return new Set(
    Array.isArray(entries)
      ? entries.filter(
          (provider): provider is string => typeof provider === "string" && provider.length > 0
        )
      : []
  );
}

export function isProviderBlockedByIdOrAlias(providerId: string, blockedProviders: unknown): boolean {
  const blockedProviderSet = normalizeBlockedProviderSet(blockedProviders);
  const baseId = providerId.replace(/-search$/, "");
  const alias = providerAlias(providerId);
  return (
    blockedProviderSet.has(providerId) ||
    blockedProviderSet.has(baseId) ||
    (typeof alias === "string" && blockedProviderSet.has(alias))
  );
}

export function isNoAuthProviderKey(...keys: Array<string | null | undefined>): boolean {
  return noAuthProviderEntries.some((provider) =>
    keys.some((key) => key === provider.id || key === provider.alias)
  );
}

export function isNoAuthProviderBlocked(
  blockedProviders: unknown,
  ...keys: Array<string | null | undefined>
): boolean {
  const blockedProviderSet = normalizeBlockedProviderSet(blockedProviders);
  return noAuthProviderEntries.some(
    (provider) =>
      keys.some((key) => key === provider.id || key === provider.alias) &&
      (blockedProviderSet.has(provider.id) ||
        (typeof provider.alias === "string" && blockedProviderSet.has(provider.alias)))
  );
}

export function partitionNoAuthEntriesByBlocked<
  T extends { providerId: string; provider: { alias?: string } },
>(entries: T[], blockedProviders: unknown): { visible: T[]; blocked: T[] } {
  const blockedProviderSet = normalizeBlockedProviderSet(blockedProviders);
  const visible: T[] = [];
  const blocked: T[] = [];
  for (const entry of entries) {
    const alias = typeof entry.provider.alias === "string" ? entry.provider.alias : null;
    const isBlocked =
      blockedProviderSet.has(entry.providerId) || (alias !== null && blockedProviderSet.has(alias));
    (isBlocked ? blocked : visible).push(entry);
  }
  return { visible, blocked };
}

export function isNoAuthRawProviderPrefix(providerId: string, prefix: string): boolean {
  const provider = noAuthProviderEntries.find((entry) => entry.id === providerId);
  return typeof provider?.alias === "string" && provider.alias !== providerId && prefix === providerId;
}
