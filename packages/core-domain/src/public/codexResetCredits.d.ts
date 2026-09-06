export class CodexResetCreditError extends Error { status: number; code: string; }
export function listCodexResetCredits(connectionId: string): Promise<Record<string, unknown>>;
export function consumeCodexResetCredit(connectionId: string, idempotencyKey: string, creditId?: string): Promise<Record<string, unknown>>;
