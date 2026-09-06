export const CHATGPT_WEB_RETIRED_MESSAGE: string;
export function isCommonChatGptWebRetiredProviderId(providerId: unknown): providerId is string;
export const CHATGPT_WEB_RETIRED_ERROR_CODE: string;
export function isCommonChatGptWebRetirementError(
  error: unknown,
): error is Error & { code: string; status: 410 };
