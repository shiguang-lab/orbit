export interface ConnectionRecoveryTickResult {
  scanned: number;
  recovered: number;
  recoveredIds: string[];
}
export interface RecoverableConnectionInput {
  id: string;
  testStatus?: string | null;
  rateLimitedUntil?: string | null;
  lastErrorAt?: string | null;
}
export function resolveConnectionRecoveryIntervalMs(rawValue?: string): number;
export function runConnectionRecoveryTick(dependencies?: {
  nowMs?: number;
  loadConnections?: () => Promise<RecoverableConnectionInput[]>;
  clearConnectionError?: (connectionId: string, current: RecoverableConnectionInput) => Promise<void>;
  logger?: { info?: (message: string) => void; warn?: (message: string) => void };
}): Promise<ConnectionRecoveryTickResult>;
