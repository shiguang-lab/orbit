export interface RegisteredKey {
  id: string;
  keyPrefix: string;
  name: string;
  provider: string;
  accountId: string;
  isActive: boolean;
  revokedAt: string | null;
  expiresAt: string | null;
  idempotencyKey: string | null;
  dailyBudget: number | null;
  hourlyBudget: number | null;
  dailyUsed: number;
  hourlyUsed: number;
  createdAt: string;
  updatedAt: string;
}
export interface RegisteredKeyWithSecret extends RegisteredKey { rawKey: string; }
export interface AccountKeyLimit {
  accountId: string;
  maxActiveKeys: number | null;
  dailyIssueLimit: number | null;
  hourlyIssueLimit: number | null;
  dailyIssued: number;
  hourlyIssued: number;
  updatedAt: string;
}
export interface QuotaCheckResult {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
  provider?: string;
  accountId?: string;
  providerActiveKeys?: number;
  accountActiveKeys?: number;
}
export interface IssueKeyParams {
  name: string;
  provider?: string;
  accountId?: string;
  idempotencyKey?: string;
  expiresAt?: string;
  dailyBudget?: number;
  hourlyBudget?: number;
}
export function checkQuota(provider?: string, accountId?: string): QuotaCheckResult;
export function issueRegisteredKey(params: IssueKeyParams): RegisteredKeyWithSecret | { idempotencyConflict: true; existing: RegisteredKey };
export function listRegisteredKeys(filters?: { provider?: string; accountId?: string }): RegisteredKey[];
export function getRegisteredKey(id: string): RegisteredKey | null;
export function revokeRegisteredKey(id: string): boolean;
export function getAccountKeyLimit(accountId: string): AccountKeyLimit | null;
export function setAccountKeyLimit(accountId: string, limits: { maxActiveKeys?: number | null; dailyIssueLimit?: number | null; hourlyIssueLimit?: number | null }): void;
