export interface UnifiedModelsResponseOptions {
  scheduleBackgroundRefresh?: (task: Promise<unknown>) => void;
}

export function getUnifiedModelsResponse(
  request: Request,
  corsHeaders?: Record<string, string>,
  options?: UnifiedModelsResponseOptions,
): Promise<Response>;
