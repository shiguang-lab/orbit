export function attachShiguangGatewayMetaHeaders(
  headers: Headers | Record<string, string>,
  metadata: Record<string, unknown>,
): void;
export function buildShiguangGatewayResponseMetaHeaders(
  metadata: Record<string, unknown>,
): Record<string, string>;
export function buildShiguangGatewaySseMetadataComment(metadata: Record<string, unknown>): string;
export function attachShiguangGatewayMetaToResponse(
  response: Response,
  metadata: Record<string, unknown>,
): Response;
