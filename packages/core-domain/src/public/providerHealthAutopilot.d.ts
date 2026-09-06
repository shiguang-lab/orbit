export type ProviderAutopilotActionType = "clear_provider_breaker" | "clear_connection_cooldown" | "clear_stale_connection_error" | "clear_model_lockout" | "reactivate_connection" | "deactivate_connection";
export interface ProviderAutopilotTarget { provider: string; connectionId?: string; model?: string; }
export interface ProviderAutopilotOptions { provider?: string | null; includeHealthy?: boolean; includeActions?: boolean; }
export interface ExecuteProviderAutopilotActionInput { type: ProviderAutopilotActionType; target: ProviderAutopilotTarget; preconditionsHash: string; dryRun?: boolean; confirm?: boolean; }
export function buildProviderHealthAutopilotReport(options?: ProviderAutopilotOptions): Promise<unknown>;
export function executeProviderHealthAutopilotAction(input: ExecuteProviderAutopilotActionInput): Promise<{ status: number; body: unknown }>;
