export type PendingRequestScope = {
  id: string | null | undefined;
  model: string;
  provider: string;
  connectionId: string | null;
};
export function updatePendingScope(scope: PendingRequestScope, metadata: Record<string, any>): void;
export function finalizePendingScope(scope: PendingRequestScope, metadata: Record<string, any>): void;
export function readCallArtifact(relativePath: string | null): {
  artifact: Record<string, any> | null;
  state: "ready" | "missing" | "corrupt";
};
export function getMonthlyProviderTokensForConnection(provider: string, connectionId: string): number;
export function getConnectionSpendUsdSinceAdded(
  provider: string,
  connectionId: string,
): Promise<{ costUsd: number; requests: number }>;
