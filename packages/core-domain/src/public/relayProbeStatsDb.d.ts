export interface RelayProbeStats {
  tested: number;
  alive: number;
}

export function recordRelayProbe(alive: boolean): void;
export function getRelayProbeStats(): RelayProbeStats;
