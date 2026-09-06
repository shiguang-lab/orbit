/** Control-plane contract for the runtime guardrail registry. */
export { registerDefaultGuardrails } from "../lib/guardrails/registry.ts";
export type {
  GuardrailExecutionResult,
  GuardrailContext,
} from "../lib/guardrails/base.ts";
