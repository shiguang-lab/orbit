export const CHATGPT_WEB_RETIRED_ERROR_CODE: string;
export function isCommonChatGptWebRetirementError(
  error: unknown,
): error is Error & { code: string; status: 410 };

