export interface ConnectionFields {
  apiKey?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  idToken?: string | null;
  [key: string]: unknown;
}
export function isEncryptionEnabled(): boolean;
export function encrypt(value: string | null | undefined): string | null | undefined;
export function decrypt(value: string | null | undefined): string | null | undefined;
