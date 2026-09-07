export function generateServiceApiKey(prefix?: string): string;
export function getOrCreateApiKey(tool: string): Promise<string>;
export function maskApiKey(plainKey: string): string;
export class ServiceApiKeyDecryptError extends Error {
  constructor(tool: string);
}
