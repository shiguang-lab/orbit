export interface QuotaReservationDecision {
  affordable: boolean;
  reason?: "exhausted" | "insufficient_budget" | "unconfigured";
  tokensRemaining?: number;
  estimatedCost?: number;
  remainingRatio: number;
}

export function canAffordRequest(
  connectionId: string,
  model: string,
  requestBody: Record<string, unknown> | null | undefined,
): QuotaReservationDecision;
export function reserveQuota(
  connectionId: string,
  model: string,
  requestBody: Record<string, unknown> | null | undefined,
  options?: { tokenLimit?: number; windowMs?: number },
): void;
