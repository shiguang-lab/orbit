export function getSpecialtyModelsResponse(
  request: Request | undefined,
  pathname: string,
  predicate: (model: Record<string, unknown>) => boolean,
): Promise<Response>;

