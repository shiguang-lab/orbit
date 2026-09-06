export type AutoDisableBannedScope = "all" | "subscription";

export function normalizeAutoDisableBannedScope(value: unknown): AutoDisableBannedScope;

export function shouldAutoDisableBannedConnection(input: {
  enabled?: boolean | null;
  scope?: unknown;
  authType?: string | null;
  providerId?: string | null;
  webCookieProviderIds?: Iterable<string> | Record<string, unknown>;
}): boolean;
