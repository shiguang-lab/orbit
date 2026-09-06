export function encryptMetadata(meta: Record<string, string>): string;
export function decryptMetadata(encrypted: string | null): Record<string, string> | null;
export function notifyWebhookEvent(event: string, data: Record<string, any>): void;
