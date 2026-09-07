export interface ConnectionRuntimeState {
  connectionId: string;
  refreshCircuitStreak: number;
  refreshCircuitUntil: string | null;
  refreshLastFailAt: string | null;
  warmupCircuitStreak: number;
  warmupCircuitUntil: string | null;
  warmupLastFailAt: string | null;
  lastWarmupAt: string | null;
  lastWarmupResult: string | null;
  warmupTokensUsed: number;
  updatedAt: string;
}
export function getConnectionRuntimeState(connectionId: string): ConnectionRuntimeState | null;
export function upsertWarmupState(connectionId: string, patch: { lastWarmupAt: string; lastResult: string; tokensUsed: number }): Promise<void>;
export function upsertWarmupCircuit(connectionId: string, patch: { streak: number; until: string; lastFailAt: string }): Promise<void>;
export function clearWarmupCircuit(connectionId: string): Promise<void>;
export function markForbidden(connectionId: string, at: string): Promise<void>;
