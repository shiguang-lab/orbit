import { sanitizeErrorMessage } from "@orbit/utils/errors";

export function formatTelegramGatewayError(error: unknown): string {
  return `⚠️ Gateway error: ${sanitizeErrorMessage(error)}`;
}
