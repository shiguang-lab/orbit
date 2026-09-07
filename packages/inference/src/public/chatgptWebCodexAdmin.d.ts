export interface ChatGptWebCodexSecrets {
  cookie?: string;
  storageState?: Record<string, unknown>;
  runtimeKey?: string;
}

export function getChatGptWebCodexDoctorStatus(connection: {
  id?: unknown;
  apiKey?: unknown;
  providerSpecificData?: unknown;
  lastError?: unknown;
}): Promise<Record<string, unknown>>;
export function finalizeValidatedChatGptWebCodexSecrets(
  encodedCredential: string,
  validationId: string,
): { encodedCredential: string; storageState: Record<string, unknown> };
export function decodeChatGptWebCodexSecrets(value: string): ChatGptWebCodexSecrets;
export function encodeChatGptWebCodexSecrets(secrets: ChatGptWebCodexSecrets): string;
