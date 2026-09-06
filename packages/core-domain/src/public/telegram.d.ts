export interface TelegramUpdate {
  [key: string]: unknown;
}
export function extractChatMessage(update: TelegramUpdate): {
  chatId: number;
  text: string;
  messageId?: number;
} | null;
export function sendTelegramMessage(payload: Record<string, unknown>): Promise<unknown>;
export function getTelegramBotToken(): string;
export function isTelegramEnabled(): boolean;
export function verifyInitData(initData: string, botToken: string): boolean;
export function parseInitData(initData: string): Record<string, string>;
export function proxyChat(userId: number, message: string): Promise<string>;
export function formatTelegramGatewayError(error: unknown): string;
export function resolveGatewayBaseUrl(): string;
