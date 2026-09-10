import type { ResilienceSettings } from "@orbit/core/resilience/settings";
import type { RoutingHint } from "../../dist/types/services/manifestAdapter.d.ts";
import type { ScoringFactors, ScoringWeights } from "../../dist/types/services/autoCombo/scoring.d.ts";
import type { ResetWindowConfig } from "../../dist/types/services/combo/quotaScoring.d.ts";
import type {
  AutoProviderCandidate,
  ComboLike,
  ComboLogger,
  ResolvedComboTarget,
} from "../../dist/types/services/combo/types.d.ts";

type BuildAutoCandidates = (
  targets: ResolvedComboTarget[],
  comboName: string,
  sessionId?: string | null,
  resetWindowConfig?: ResetWindowConfig,
  resilienceSettings?: ResilienceSettings | null
) => Promise<AutoProviderCandidate[]>;

export interface EvaluateAutoCandidatesOptions {
  targets: ResolvedComboTarget[];
  comboName: string;
  body: Record<string, unknown>;
  taskType: string;
  weights: ScoringWeights;
  sessionId?: string | null;
  resetWindowConfig?: ResetWindowConfig;
  resilienceSettings?: ResilienceSettings | null;
  manifestHint?: RoutingHint | null;
  buildAutoCandidates: BuildAutoCandidates;
}

export declare function evaluateAutoCandidates(options: EvaluateAutoCandidatesOptions): Promise<{
  sourceCandidates: AutoProviderCandidate[];
  candidates: AutoProviderCandidate[];
  routableCandidates: AutoProviderCandidate[];
  scoredTargets: Array<{
    target: ResolvedComboTarget;
    factors: ScoringFactors;
    score: number;
  }>;
}>;

export interface ResolveAutoStrategyDeps {
  orderedTargets: ResolvedComboTarget[];
  body: Record<string, unknown>;
  combo: ComboLike;
  settings: Record<string, unknown> | null | undefined;
  config: { complexityAwareRouting?: boolean; compatFilterFailOpen?: boolean };
  relayOptions?: {
    bypassProviderQuotaPolicy?: boolean;
    sessionId?: string | null;
    mode?: string | null;
    budgetCap?: number | null;
    budgetFallback?: "cheapest" | "strict" | null;
  } | null;
  resilienceSettings: ResilienceSettings;
  log: ComboLogger;
  buildAutoCandidates: BuildAutoCandidates;
}

export type ResolveAutoStrategyResult =
  | { earlyResponse: Response }
  | { orderedTargets: ResolvedComboTarget[]; autoUsedExplicitRouter: boolean };

export declare function resolveAutoStrategyOrder(
  deps: ResolveAutoStrategyDeps
): Promise<ResolveAutoStrategyResult>;
