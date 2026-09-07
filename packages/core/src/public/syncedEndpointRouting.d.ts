export type LocalSyncedEndpointRoute = {
  provider: string;
  model: string;
  connectionIds: string[];
};

export function resolveLocalSyncedEndpointRoute(
  modelStr: string,
  endpoint: "embeddings" | "images",
): Promise<LocalSyncedEndpointRoute | null>;
