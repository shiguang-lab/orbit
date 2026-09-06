type HeaderReader = {
  get?: (name: string) => string | null | undefined;
};

type RequestLike = {
  headers?: HeaderReader | null;
} | null;

export function getRequestId(): string | null;
export function withRequestId<T>(
  request: RequestLike,
  handler: () => T | Promise<T>,
): Promise<T>;
export function addRequestIdHeader(
  headers?: Record<string, string>,
): Record<string, string>;
export function attachRequestIdToResponse(request: RequestLike, response: Response): Response;
export function generateRequestId(): string;
