export interface GuardrailLog {
  debug?: (tag: string, message: string, meta?: Record<string, unknown>) => void;
  info?: (tag: string, message: string, meta?: Record<string, unknown>) => void;
  warn?: (tag: string, message: string, meta?: Record<string, unknown>) => void;
  error?: (tag: string, message: string, meta?: Record<string, unknown>) => void;
}

export interface GuardrailContext {
  apiKeyInfo?: Record<string, unknown> | null;
  disabledGuardrails?: string[] | null;
  endpoint?: string | null;
  headers?: Headers | Record<string, unknown> | null;
  log?: GuardrailLog | Console | null;
  method?: string | null;
  model?: string | null;
  provider?: string | null;
  signal?: AbortSignal;
  sourceFormat?: string | null;
  stream?: boolean;
  targetFormat?: string | null;
}

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

export interface GuardrailPreCallResult<TPayload> {
  blocked: boolean;
  guardrail?: string;
  message?: string;
  payload: TPayload;
  results: GuardrailExecutionResult[];
}

export interface GuardrailPostCallResult<TResponse> {
  blocked: boolean;
  guardrail?: string;
  message?: string;
  response: TResponse;
  results: GuardrailExecutionResult[];
}

export function resolveDisabledGuardrails(input: {
  apiKeyInfo?: Record<string, unknown> | null;
  body?: unknown;
  headers?: Headers | Record<string, unknown> | null;
}): string[];

export function evaluateGuardrailsPreCall<TPayload = unknown>(
  payload: TPayload,
  context?: GuardrailContext,
): Promise<GuardrailPreCallResult<TPayload>>;

export function evaluateGuardrailsPostCall<TResponse = unknown>(
  response: TResponse,
  context?: GuardrailContext,
): Promise<GuardrailPostCallResult<TResponse>>;
