export declare class GrokResetCreditError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string);
}
export declare function listGrokResetCredits(connectionId: string): Promise<{
  availableCount: number;
  credits: Array<{ selectionToken: string; expiresAt: string | null }>;
}>;
export declare function consumeGrokResetCredit(
  connectionId: string,
  idempotencyKey: string,
  creditId?: string,
): Promise<{ outcome: "reset" | "alreadyRedeemed"; usage: Record<string, unknown> }>;
