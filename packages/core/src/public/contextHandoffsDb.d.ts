export interface HandoffPayload {
  id?: string;
  sessionId: string;
  comboName: string;
  fromAccount: string;
  summary: string;
  keyDecisions: string[];
  taskProgress: string;
  activeEntities: string[];
  messageCount: number;
  model: string;
  lastModel?: string;
  warningThresholdPct: number;
  generatedAt: string;
  expiresAt: string;
  createdAt?: string;
}

export function upsertHandoff(payload: HandoffPayload): void;
export function getHandoff(sessionId: string, comboName: string): HandoffPayload | null;
export function deleteHandoff(sessionId: string, comboName: string): void;
export function cleanupExpiredHandoffs(): number;
export function hasActiveHandoff(sessionId: string, comboName: string): boolean;
export function recordSessionModelUsage(
  sessionId: string,
  comboName: string,
  modelStr: string,
  provider: string,
  connectionId?: string,
): void;
export function getLastSessionModel(sessionId: string, comboName: string): string | null;
export function deleteSessionModelHistory(sessionId: string, comboName: string): number;
