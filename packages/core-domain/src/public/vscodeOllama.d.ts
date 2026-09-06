type VscodeModelsResolver = (request: Request, headers?: Record<string, string>) => Promise<Response>;
export declare function SHOW_OPTIONS(): Response;
export declare function SHOW_POST(request: Request, context: { params?: Promise<{ token: string }> | { token: string } }, resolveModels: VscodeModelsResolver): Promise<Response>;
export declare function TAGS_OPTIONS(): Response;
export declare function TAGS(request: Request, context: { params?: Promise<{ token: string }> | { token: string } }, resolveModels: VscodeModelsResolver): Promise<Response>;
