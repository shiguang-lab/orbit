export interface ConductorBridgeOptions {
  hubUrl: string;
  token: string;
  tm: unknown;
  cursor: { get(): string | null; set(value: string): void };
  fetchImpl?: typeof fetch;
  log?: (message: string) => void;
  backoffBaseMs?: number;
}
export interface ConductorBridge {
  start(): void;
  stop(): void;
  state(): "connected" | "reconnecting" | "stopped";
}
export function createConductorBridge(options: ConductorBridgeOptions): ConductorBridge;
