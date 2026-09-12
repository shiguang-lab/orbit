export interface UnifiedModelsResponseOptions {
  scheduleBackgroundRefresh?: (task: () => Promise<unknown>) => void;
  /** Return the unprojected catalog for internal management and exact lookups. */
  internal?: boolean;
}

export function getUnifiedModelsResponse(
  request: Request,
  corsHeaders?: Record<string, string>,
  options?: UnifiedModelsResponseOptions,
): Promise<Response>;
