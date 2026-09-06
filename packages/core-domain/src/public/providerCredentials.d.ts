export function updateProviderCredentials(
  connectionId: string,
  newCredentials: Record<string, unknown>,
): Promise<unknown>;

export function resolveCopilotTokenBaseUrl(
  provider: string,
  credentials?: Record<string, unknown>,
): string | undefined;
