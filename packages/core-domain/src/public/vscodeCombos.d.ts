export declare function OPTIONS(): Response;
export declare function GET(request: Request, context: { params: Promise<{ token: string; slug?: string[] }> | { token: string; slug?: string[] } }): Promise<Response>;
export declare function POST(request: Request, context: { params: Promise<{ token: string; slug?: string[] }> | { token: string; slug?: string[] } }): Promise<Response>;
