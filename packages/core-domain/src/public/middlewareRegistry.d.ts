export interface MiddlewareHookConfig {
  name: string;
  description: string;
  priority: number;
  scope: { type: "global" } | { type: "combo"; comboId: string };
  enabled: boolean;
  code: string;
  createdAt: string;
  updatedAt: string;
  runCount: number;
  lastError?: string;
}

export function registerHook(config: MiddlewareHookConfig): void;
export function unregisterHook(name: string): boolean;
export function getAllHooks(): MiddlewareHookConfig[];
export function createHookContext(params: Record<string, unknown>): Record<string, unknown>;
export function initPreRequestRegistry(): void;
export function runHooks(context: Record<string, unknown>, comboId?: string): Promise<Record<string, unknown>>;
export function getHookLogs(hookName?: string, limit?: number): Array<Record<string, unknown>>;
