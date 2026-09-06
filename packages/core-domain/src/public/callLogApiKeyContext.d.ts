export interface CallLogApiKeyContext {
  apiKeyId: string | null;
  apiKeyName: string | null;
}

export function runWithCallLogApiKeyContext<TResult>(
  context: CallLogApiKeyContext,
  callback: () => TResult,
): TResult;

export function getCallLogApiKeyContext(): CallLogApiKeyContext | null;
