import { getPassthroughProviders } from "@orbit/providers/provider-registry";

/** Preserve the exact model string when a combo redirects into a passthrough provider. */
export function resolvePassthroughModelOverride(input: {
  provider: string;
  resolvedProvider: string;
  originalModel: string;
}): string | null {
  if (input.provider === input.resolvedProvider) return null;
  return getPassthroughProviders().has(input.provider) ? input.originalModel : null;
}
