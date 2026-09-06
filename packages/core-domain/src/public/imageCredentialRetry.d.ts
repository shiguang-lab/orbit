export interface ImageGenerationResult {
  success: boolean;
  status?: number;
  error?: unknown;
  data?: unknown;
  retryable?: boolean;
}

export interface ImageCredentialRetryOptions {
  provider: string;
  requestedModel: string | null;
  credentials: any;
  execute: (credentials: any) => Promise<ImageGenerationResult>;
  selectNextCredentials?: (
    provider: string,
    requestedModel: string | null,
    excludedConnectionIds: Set<string>,
  ) => Promise<any>;
}

export interface ImageCredentialRetryResult {
  credentials: any;
  result: ImageGenerationResult;
}

export function executeImageWithCredentialFallback(
  options: ImageCredentialRetryOptions,
): Promise<ImageCredentialRetryResult>;
