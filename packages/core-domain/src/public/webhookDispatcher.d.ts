export function encryptMetadata(meta: Record<string, string>): string;
export function decryptMetadata(encrypted: string | null): Record<string, string> | null;
