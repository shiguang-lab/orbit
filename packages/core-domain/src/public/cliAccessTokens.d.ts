import type { AccessScope } from "./cliAccessScopes.d.ts";
export interface AccessTokenRecord {
  id: string; name: string; scope: AccessScope; tokenPrefix: string;
  createdAt: string; lastUsedAt: string | null; expiresAt: string | null; revokedAt: string | null;
}
export interface VerifiedAccessToken { id: string; name: string; scope: AccessScope; }
export function createAccessToken(input: { name: string; scope?: AccessScope | string; expiresAt?: string | null }): { record: AccessTokenRecord; secret: string };
export function verifyAccessToken(secret: string | null | undefined): VerifiedAccessToken | null;
export function listAccessTokens(): AccessTokenRecord[];
export function getAccessToken(id: string): AccessTokenRecord | null;
export function revokeAccessToken(idOrPrefix: string): boolean;
