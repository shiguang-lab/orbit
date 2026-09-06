export type PendingRequestScope = {
  id: string | null | undefined;
  model: string;
  provider: string;
  connectionId: string | null;
};
export type PendingRequestMetadata = {
  clientEndpoint?: string | null;
  clientRequest?: unknown;
  providerRequest?: unknown;
  providerUrl?: string | null;
  providerResponse?: unknown;
  clientResponse?: unknown;
  status?: number | null;
  error?: string | null;
  errorCode?: string | null;
  stage?: string | null;
  stageUpdatedAt?: number | null;
  correlationId?: string | null;
  sessionTag?: string | null;
};
export function updatePendingScope(scope: PendingRequestScope, metadata: PendingRequestMetadata): void;
export function finalizePendingScope(scope: PendingRequestScope, metadata: PendingRequestMetadata): void;
