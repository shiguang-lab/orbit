/** Batch API values shared by the edge HTTP app and background worker. */
export const SUPPORTED_BATCH_ENDPOINTS = [
  "/v1/responses",
  "/v1/chat/completions",
  "/v1/embeddings",
  "/v1/completions",
  "/v1/moderations",
  "/v1/images/generations",
  "/v1/videos/generations",
] as const;

export type SupportedBatchEndpoint = (typeof SUPPORTED_BATCH_ENDPOINTS)[number];

export const DEFAULT_BATCH_EXPIRATION_SECONDS = 30 * 24 * 60 * 60;
