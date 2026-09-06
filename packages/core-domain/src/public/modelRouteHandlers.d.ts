export function GET(request: Request): Promise<Response>;
export function PUT(request: Request): Promise<Response>;
export function DELETE(request: Request): Promise<Response>;
export function handleGetModels(request: Request, dependencies?: unknown): Promise<Response>;
