import type { z } from "zod";

export type ReasoningRuleScope = "global" | "apiKey" | "combo" | "model" | "connection";
export type ReasoningEffort = "none" | "low" | "medium" | "high" | "xhigh" | "max" | "ultra";
export type ReasoningSourceEffort = "any" | "missing" | ReasoningEffort;
export type ReasoningEffortMode = "inherit" | "default" | "force";
export type ReasoningTargetKind = "keep" | "model" | "combo";
export type ReasoningBudgetAction = "preserve" | "remove" | "set";

export interface ReasoningRoutingRule {
  id: string;
  name: string;
  description: string;
  scope: ReasoningRuleScope;
  apiKeyId: string | null;
  comboId: string | null;
  connectionId: string | null;
  modelPattern: string | null;
  sourceEffort: ReasoningSourceEffort;
  requestTags: string[];
  tagMatchMode: "any" | "all";
  effortMode: ReasoningEffortMode;
  targetEffort: ReasoningEffort | null;
  targetKind: ReasoningTargetKind;
  targetModel: string | null;
  targetComboId: string | null;
  budgetAction: ReasoningBudgetAction;
  budgetTokens: number | null;
  priority: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ReasoningRoutingRuleInput = Omit<ReasoningRoutingRule, "id" | "createdAt" | "updatedAt">;

export function getReasoningRoutingRules(options?: { enabledOnly?: boolean }): Promise<ReasoningRoutingRule[]>;
export function getReasoningRoutingRuleById(id: string): Promise<ReasoningRoutingRule | null>;
export function createReasoningRoutingRule(rule: ReasoningRoutingRuleInput): Promise<ReasoningRoutingRule>;
export function updateReasoningRoutingRule(id: string, patch: Partial<ReasoningRoutingRuleInput>): Promise<ReasoningRoutingRule | null>;
export function deleteReasoningRoutingRule(id: string): Promise<boolean>;
export function invalidateReasoningRoutingRuleCache(): void;
export function getReasoningRoutingRuleReferenceErrors(rule: ReasoningRoutingRuleInput): string[];
export function reasoningRuleDataToInput(
  data: ReasoningRoutingRuleInput | Partial<ReasoningRoutingRuleInput> | Record<string, unknown>,
): ReasoningRoutingRuleInput;

export interface ReasoningRoutingSimulationInput {
  model: string;
  effort: ReasoningSourceEffort | "signal";
  thinkingBudgetTokens?: number | null;
  apiKeyId?: string | null;
  requestTags: string[];
  transport: "http" | "codex-ws";
}

export const createReasoningRoutingRuleSchema: z.ZodType<ReasoningRoutingRuleInput>;
export const updateReasoningRoutingRuleSchema: z.ZodType<Partial<ReasoningRoutingRuleInput>>;
export const simulateReasoningRoutingSchema: z.ZodType<ReasoningRoutingSimulationInput>;

export interface ReasoningRuleDecision {
  rule: ReasoningRoutingRule;
  sourceModel: string;
  sourceEffort: Exclude<ReasoningSourceEffort, "any"> | "signal";
  targetModel: string;
  targetCombo: Record<string, unknown> | null;
  targetEffort: ReasoningEffort | null;
  capability: "supported" | "unsupported" | "unknown";
  requiresReasoning: boolean;
  warnings: string[];
}

export interface ReasoningRoutingInput {
  sourceModel: string;
  sourceModelAliases?: string[];
  sourceEffort: Exclude<ReasoningSourceEffort, "any"> | "signal";
  hasReasoningSignal: boolean;
  hasThinkingBudget?: boolean;
  apiKeyId?: string | null;
  comboId?: string | null;
  connectionId?: string | null;
  requestTags?: string[];
  connectionOnly?: boolean;
  capabilityModel?: string | null;
}

export function resolveReasoningRoutingRule(input: ReasoningRoutingInput): Promise<ReasoningRuleDecision | null>;
export function resolveReasoningSourceModels(
  model: string,
  resolve: (model: string) => Promise<{ provider?: string | null; model?: string | null }>,
): Promise<{ normalized: string; aliases: string[] }>;
export function validateCodexWsDecision(decision: ReasoningRuleDecision): string | null;

export function resolveCodexWsModelInfo(
  requestedModel: string,
  resolve: (model: string) => Promise<{ provider?: string | null; model?: string | null; [key: string]: unknown }>,
): Promise<{ provider?: string | null; model?: string | null; [key: string]: unknown }>;
