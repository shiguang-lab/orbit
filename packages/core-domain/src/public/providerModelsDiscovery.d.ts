export declare function getProviderModels(
  request: Request,
  context?: { params?: Promise<{ id: string }> | { id: string } },
): Promise<Response>;
export declare function syncProviderModels(
  request: Request,
  context?: { params?: Promise<{ id: string }> | { id: string } },
): Promise<Response>;
