export function toJsonErrorPayload(
  rawError: unknown,
  fallbackMessage?: string,
): Record<string, unknown>;
export function extractErrorMessage(value: unknown): string | null;
export function describeUpstreamFailure(
  value: unknown,
  fallback?: string,
  maxLength?: number,
): string;
