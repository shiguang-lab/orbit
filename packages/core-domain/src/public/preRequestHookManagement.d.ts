export type MiddlewareHookScope =
  | { type: "global" }
  | { type: "combo"; comboId: string };

export interface MiddlewareHookConfig {
  name: string;
  description: string;
  priority: number;
  scope: MiddlewareHookScope;
  enabled: boolean;
  code: string;
  createdAt: string;
  updatedAt: string;
  runCount: number;
  lastError?: string;
}

export interface MiddlewareHookLogEntry {
  id: string;
  hookName: string;
  requestId: string;
  durationMs: number;
  mutated: boolean;
  skipped: boolean;
  error?: string;
  timestamp: string;
}

export function registerHook(config: MiddlewareHookConfig): void;
export function unregisterHook(name: string): boolean;
export function getAllHooks(): MiddlewareHookConfig[];
export function getHookLogs(hookName?: string, limit?: number): MiddlewareHookLogEntry[];
