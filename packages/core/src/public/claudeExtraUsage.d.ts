interface ClaudeExtraUsageConnectionState {
  provider?: string | null;
  providerSpecificData?: unknown;
  testStatus?: string | null;
  lastError?: string | null;
  lastErrorAt?: string | null;
  lastErrorType?: string | null;
  lastErrorSource?: string | null;
  errorCode?: string | number | null;
  rateLimitedUntil?: string | null;
  backoffLevel?: number | null;
}

interface ClaudeExtraUsageUpdate {
  [field: string]: unknown;
  testStatus: string | null;
  lastError: string | null;
  lastErrorAt: string | null;
  lastErrorType: string | null;
  lastErrorSource: string | null;
  errorCode: number | null;
  rateLimitedUntil: string | null;
  backoffLevel: number;
}

export function isClaudeExtraUsageBlockEnabled(
  provider: string | null | undefined,
  providerSpecificData: unknown,
): boolean;
export function buildClaudeExtraUsageConnectionUpdate(
  connection: ClaudeExtraUsageConnectionState,
  usage: unknown,
): ClaudeExtraUsageUpdate | null;
