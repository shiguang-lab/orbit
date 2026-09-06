export interface PreRequestHookContext {
  body: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  model: string;
  combo?: string;
  apiKeyInfo?: Record<string, unknown>;
  metadata: Record<string, unknown>;
  log: {
    info(tag: string, message: string): void;
    warn(tag: string, message: string): void;
    error(tag: string, message: string): void;
  };
}

export interface CreateHookContextParams {
  body: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  model: string;
  combo?: string;
  apiKeyInfo?: Record<string, unknown>;
  log?: {
    info?(tag: string, message: string): unknown;
    warn?(tag: string, message: string): unknown;
    error?(tag: string, message: string): unknown;
  };
}

export interface HookExecutionResponse {
  status: number;
  body: Record<string, unknown>;
}

export function createHookContext(params: CreateHookContextParams): PreRequestHookContext;
export function runHooks(
  context: PreRequestHookContext,
  comboId?: string,
): Promise<{ context: PreRequestHookContext; response?: HookExecutionResponse }>;
