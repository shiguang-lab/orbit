export function computeClosestRetryAfter(retryAfter: unknown): {
  retryAfter: string | null;
  retryAfterHuman: string;
  waitMs: number | null;
};

export function waitForCooldownAwareRetry(
  waitMs: number,
  signal?: AbortSignal | null,
): Promise<boolean>;
