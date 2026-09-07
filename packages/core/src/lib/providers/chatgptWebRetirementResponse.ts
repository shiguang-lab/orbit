import { errorResponse } from "@orbit/utils/errors/error-response";

import {
  assertCommonChatGptWebProviderAvailable,
  CHATGPT_WEB_RETIRED_ERROR_CODE,
  CHATGPT_WEB_RETIRED_MESSAGE,
  isCommonChatGptWebRetiredProviderId,
  isCommonChatGptWebRetirementError,
} from "@orbit/contracts/chatgpt-web-retirement";

export function commonChatGptWebRetirementResponse(): Response {
  return errorResponse(410, CHATGPT_WEB_RETIRED_MESSAGE, {
    type: "provider_error",
    code: CHATGPT_WEB_RETIRED_ERROR_CODE,
  });
}

export function rejectRetiredCommonChatGptWebProvider(providerId: unknown): Response | null {
  return isCommonChatGptWebRetiredProviderId(providerId)
    ? commonChatGptWebRetirementResponse()
    : null;
}

export function assertProviderAvailable(providerId: unknown): void {
  assertCommonChatGptWebProviderAvailable(providerId);
}

export function responseForError(error: unknown): Response | null {
  return isCommonChatGptWebRetirementError(error) ? commonChatGptWebRetirementResponse() : null;
}
