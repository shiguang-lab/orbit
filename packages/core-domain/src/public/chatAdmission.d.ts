export function withChatAdmission(
  handler: (request: Request, ...args: any[]) => Promise<Response> | Response,
  options?: Record<string, unknown>,
): (request: Request, ...args: any[]) => Promise<Response>;
