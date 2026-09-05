export function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response>;
export function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response>;
