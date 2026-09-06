import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

export function formatTelegramGatewayError(error: unknown): string {
  return `⚠️ Gateway error: ${sanitizeErrorMessage(error)}`;
}
