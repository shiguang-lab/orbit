export function POST(request: Request, context: { params: Promise<{ path: string[] }> }): Promise<Response>;
export function OPTIONS(): Response;
