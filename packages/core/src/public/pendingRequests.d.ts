export interface PendingRequestMetadata {
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
}

export interface PendingRequestDetail extends PendingRequestMetadata {
  id: string;
  model: string;
  provider: string;
  connectionId: string | null;
  startedAt: number;
  completedAt?: number | null;
  durationMs?: number | null;
  streamChunks?: {
    provider?: string[];
    openai?: string[];
    client?: string[];
  } | null;
}

export function trackPendingRequest(
  model: string,
  provider: string,
  connectionId: string | null,
  started: boolean,
  metadata?: PendingRequestMetadata,
): string | undefined;
export function getPendingById(): Map<string, PendingRequestDetail>;
export function getCompletedDetails(): Map<string, PendingRequestDetail>;
export function finalizeMostRecentPendingRequest(
  model: string,
  provider: string,
  connectionId: string | null,
  metadata: PendingRequestMetadata,
): void;
export function finalizePendingRequestById(
  id: string | null | undefined,
  metadata: PendingRequestMetadata,
): boolean;
