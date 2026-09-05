export function GET(request: Request, context: { params: { id: string } }): Promise<Response>;
export function PUT(request: Request, context: { params: { id: string } }): Promise<Response>;
export function DELETE(request: Request, context: { params: { id: string } }): Promise<Response>;
