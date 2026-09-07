export interface KimiJwtPayload {
  sub?: string;
  iss?: string;
  aud?: string[];
  exp?: number;
  iat?: number;
  region?: string;
  space_id?: string;
  typ?: string;
  membership?: { level?: number };
  [key: string]: unknown;
}

export function parseKimiJwt(token: string): KimiJwtPayload | null;
export function getKimiTokenExpiration(token: string): {
  expiresAtSec: number;
  issuedAtSec: number;
  remainingSec: number;
  isExpired: boolean;
} | null;
export function isKimiTokenExpiringSoon(token: string, thresholdSec?: number): boolean;
