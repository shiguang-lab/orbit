export type BudgetResetInterval = "daily" | "weekly" | "monthly";
export interface BudgetSummary {
  dailyTotal: number;
  monthlyTotal: number;
  totalEntries: number;
  budget: Record<string, unknown> | null;
  totalCostToday: number;
  totalCostMonth: number;
  totalCostPeriod: number;
  activeLimitUsd: number;
  resetInterval: BudgetResetInterval | null;
  resetTime: string | null;
  budgetResetAt: number | null;
  lastBudgetResetAt: number | null;
  periodStartAt: number | null;
  nextResetAt: number | null;
  dailyLimitUsd: number;
  weeklyLimitUsd: number;
  monthlyLimitUsd: number;
  warningThreshold: number | null;
}
export function setBudget(apiKeyId: string, config: Record<string, unknown>): Record<string, unknown>;
export function getCostSummary(apiKeyId: string): BudgetSummary;
export function checkBudget(apiKeyId: string, additionalCost?: number): Record<string, unknown>;
export function recordCost(apiKeyId: string, cost: number): void;
