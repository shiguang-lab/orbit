export function buildSlackPayload(event: string, data: Record<string, unknown>): Record<string, unknown>;
export function buildDiscordPayload(event: string, data: Record<string, unknown>): Record<string, unknown>;
export function buildTelegramUrl(botToken: string): string;
export function buildTelegramPayload(event: string, data: Record<string, unknown>, chatId: string): Record<string, unknown>;
