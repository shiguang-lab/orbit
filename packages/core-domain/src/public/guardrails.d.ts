export interface GuardrailExecutionResult {
  blocked: boolean;
  error?: string;
  guardrail: string;
  message?: string;
  meta?: Record<string, unknown> | null;
  modified: boolean;
  skipped: boolean;
  stage: "pre" | "post";
}
export interface GuardrailContext {
  disabledGuardrails?: string[] | null;
  [key: string]: unknown;
}
export interface GuardrailEntry {
  name: string;
  enabled: boolean;
  priority: number;
}
export interface GuardrailPreCallResult {
  blocked: boolean;
  guardrail?: string;
  message?: string;
  payload: unknown;
  results: GuardrailExecutionResult[];
}
export interface GuardrailRegistry {
  list(): GuardrailEntry[];
  runPreCallHooks(payload: unknown, context?: GuardrailContext): Promise<GuardrailPreCallResult>;
}
export function registerDefaultGuardrails(): GuardrailRegistry;
