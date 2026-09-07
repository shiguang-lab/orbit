export function attachOrbitMetaHeaders(
  headers: Headers | Record<string, string>,
  metadata: Record<string, unknown>,
): void;
export function buildOrbitResponseMetaHeaders(
  metadata: Record<string, unknown>,
): Record<string, string>;
export function buildOrbitSseMetadataComment(metadata: Record<string, unknown>): string;
export function attachOrbitMetaToResponse(
  response: Response,
  metadata: Record<string, unknown>,
): Response;
