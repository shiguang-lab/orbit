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
} from "../lib/db/reasoningRoutingRules.js";
export type {
  ReasoningBudgetAction,
  ReasoningEffort,
  ReasoningEffortMode,
  ReasoningRoutingRule,
  ReasoningRoutingRuleInput,
  ReasoningRuleScope,
  ReasoningSourceEffort,
  ReasoningTargetKind,
} from "../lib/db/reasoningRoutingRules.js";

export { reasoningRuleDataToInput } from "../lib/reasoningRouting/input.js";
export {
  createReasoningRoutingRuleSchema,
  simulateReasoningRoutingSchema,
  updateReasoningRoutingRuleSchema,
} from "../shared/validation/schemas/reasoningRouting.js";
export {
  resolveReasoningRoutingRule,
  resolveReasoningSourceModels,
  validateCodexWsDecision,
} from "../lib/reasoningRouting/policy.js";

// Model lookup and Codex transport resolution are part of the shared routing
// policy used by the simulation endpoint and the edge request pipeline.
export { getComboForModel, getModelInfo } from "@shiguang-gateway/open-sse/services/runtimeModel";
export { resolveCodexWsModelInfo } from "../edge/codexResponsesWsModel.js";
