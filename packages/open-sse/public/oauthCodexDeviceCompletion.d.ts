export type CodexDeviceCompletionResult = { status: number; body: unknown };
export function getCodexDeviceTicket(token: string): CodexDeviceCompletionResult;
export function completeCodexDeviceFlow(
  token: string,
  rawBody: unknown
): Promise<CodexDeviceCompletionResult>;
