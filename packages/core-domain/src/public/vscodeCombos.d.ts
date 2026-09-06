type VscodeModelsResolver = (request: Request, headers?: Record<string, string>) => Promise<Response>;
export declare function OPTIONS(): Response;
export declare function GET(request: Request, context: { params: Promise<{ token: string; slug?: string[] }> | { token: string; slug?: string[] } }, resolveModels: VscodeModelsResolver): Promise<Response>;
export declare function POST(request: Request, context: { params: Promise<{ token: string; slug?: string[] }> | { token: string; slug?: string[] } }, resolveModels: VscodeModelsResolver): Promise<Response>;
