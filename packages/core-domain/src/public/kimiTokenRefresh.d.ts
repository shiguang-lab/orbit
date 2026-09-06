export interface KimiRefreshResult {
  success: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAtSec?: number;
  error?: string;
}
export function exchangeKimiRefreshToken(
  refreshToken: string,
  baseUrl?: string,
): Promise<KimiRefreshResult>;
export function refreshKimiProviderConnection(connectionId: string): Promise<KimiRefreshResult>;
