import type { AccessScope } from "./cliAccessScopes.d.ts";
export const ACCESS_TOKEN_PREFIX: string;
export type AccessTokenVerdict =
  | { kind: "absent" } | { kind: "error" } | { kind: "invalid" }
  | { kind: "insufficient"; have: AccessScope; need: AccessScope }
  | { kind: "ok"; scope: AccessScope; id: string; name: string };
export function extractBearer(request: Request): string | null;
export function evaluateAccessTokenAuth(request: Request): AccessTokenVerdict;
