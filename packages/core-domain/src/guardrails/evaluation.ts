import type { GuardrailContext } from "../lib/guardrails/base.js";
import {
  guardrailRegistry,
  resolveDisabledGuardrails,
} from "../lib/guardrails/registry.js";

export { resolveDisabledGuardrails };
export type { GuardrailContext };

export function evaluateGuardrailsPreCall<TPayload = unknown>(
  payload: TPayload,
  context: GuardrailContext = {},
) {
  return guardrailRegistry.runPreCallHooks(payload, context);
}

export function evaluateGuardrailsPostCall<TResponse = unknown>(
  response: TResponse,
  context: GuardrailContext = {},
) {
  return guardrailRegistry.runPostCallHooks(response, context);
}
