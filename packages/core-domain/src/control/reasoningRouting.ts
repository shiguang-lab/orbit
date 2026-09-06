/**
 * Control-plane contract for reasoning-routing rule administration.
 *
 * Persistence and policy evaluation are shared with the edge request path,
 * while HTTP transport and authentication belong to apps/control-api.
 */
export {
  createReasoningRoutingRule,
  deleteReasoningRoutingRule,
  getReasoningRoutingRuleById,
  getReasoningRoutingRuleReferenceErrors,
  getReasoningRoutingRules,
  invalidateReasoningRoutingRuleCache,
  updateReasoningRoutingRule,
} from "../lib/db/reasoningRoutingRules.ts";
export type {
  ReasoningBudgetAction,
  ReasoningEffort,
  ReasoningEffortMode,
  ReasoningRoutingRule,
  ReasoningRoutingRuleInput,
  ReasoningRuleScope,
  ReasoningSourceEffort,
  ReasoningTargetKind,
} from "../lib/db/reasoningRoutingRules.ts";

export { reasoningRuleDataToInput } from "../lib/reasoningRouting/input.ts";
export {
  createReasoningRoutingRuleSchema,
  simulateReasoningRoutingSchema,
  updateReasoningRoutingRuleSchema,
} from "../shared/validation/schemas/reasoningRouting.ts";
export {
  resolveReasoningRoutingRule,
  resolveReasoningSourceModels,
  validateCodexWsDecision,
} from "../lib/reasoningRouting/policy.ts";

// Model lookup and Codex transport resolution are part of the shared routing
// policy used by the simulation endpoint and the edge request pipeline.
export { getComboForModel, getModelInfo } from "../sse/services/model.ts";
export { resolveCodexWsModelInfo } from "../app/api/internal/codex-responses-ws/modelResolution.ts";
