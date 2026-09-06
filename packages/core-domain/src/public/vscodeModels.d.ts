export type VscodeModelsResolver = (request: Request, headers?: Record<string, string>) => Promise<Response>;
export declare function GET(
  request: Request,
  context: { params?: Promise<{ token: string }> | { token: string } },
  resolveModels: VscodeModelsResolver,
): Promise<Response>;
export declare function GET_RAW(
  request: Request,
  context: { params?: Promise<{ token: string }> | { token: string } },
  resolveModels: VscodeModelsResolver,
): Promise<Response>;
export declare function OPTIONS(): Response;
export declare function OPTIONS_RAW(): Response;
export declare function enrichModelForVscode(
  model: Record<string, unknown>,
  request: Request,
  options?: { preserveNativeId?: boolean },
): Record<string, unknown>;
export declare function expandVscodeRawModels(models: Record<string, unknown>[]): Record<string, unknown>[];
export declare function getVscodeModelsCatalogResponse(request: Request, resolveModels: VscodeModelsResolver): Promise<{
  status: number;
  headers: Record<string, string>;
  body: { data?: Record<string, unknown>[]; [key: string]: unknown };
}>;
export declare function getVscodeRawModelDisplayName(model: Record<string, unknown>): string;
