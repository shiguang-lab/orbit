export type TokenLimitScopeType = "model" | "provider" | "global";
export type BudgetResetInterval = "daily" | "weekly" | "monthly";

export interface TokenLimit {
  id: string;
  apiKeyId: string;
  scopeType: TokenLimitScopeType;
  scopeValue?: string;
  tokenLimit: number;
  resetInterval?: BudgetResetInterval;
  resetTime?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TokenWindowState {
  windowStart: string;
  didReset: boolean;
  periodStartAt: number;
  nextResetAt: number;
}

export interface UpsertTokenLimitInput {
  id?: string;
  apiKeyId: string;
  scopeType: TokenLimitScopeType;
  scopeValue?: string;
  tokenLimit: number;
  resetInterval?: BudgetResetInterval;
  resetTime?: string;
  enabled?: boolean;
}

export function listTokenLimits(apiKeyId: string): TokenLimit[];
export function upsertTokenLimit(input: UpsertTokenLimitInput): TokenLimit;
export function deleteTokenLimit(id: string): boolean;

export function getTokenLimitsForRequest(
  apiKeyId: string,
  provider: string,
  model: string,
): TokenLimit[];
export function resetWindowIfElapsed(limit: TokenLimit, now?: number): TokenWindowState;
export function getWindowUsage(limit: TokenLimit, now?: number): number;
export function incrementWindowTokens(
  limitId: string,
  windowStart: string,
  tokens: number,
): number;
export function logTokenLimitReset(
  limitId: string,
  prevTokens: number,
  windowStart: string,
): void;
