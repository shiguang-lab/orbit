export function getBodySizeLimit(pathname: string, settings?: Record<string, unknown>): number;
export class RequestBodyTooLargeError extends Error {
  readonly limit: number;
  constructor(limit: number);
}
export function readRequestBodyWithLimit(request: Request, limit: number): Promise<Uint8Array>;
