import type { FastifyInstance, FastifyRequest } from "fastify";

const LOCAL_ENDPOINT_PREFIX = "/api/local/";

function hasForwardingHeaders(headers: FastifyRequest["headers"]): boolean {
  return [
    "forwarded",
    "x-forwarded-for",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-real-ip",
  ].some((name) => headers[name] !== undefined);
}

function isLoopbackAddress(address: string | undefined): boolean {
  if (!address) return false;
  const normalized = address.toLowerCase().replace(/^::ffff:/, "");
  return normalized === "127.0.0.1" || normalized === "::1";
}

export function isDirectLoopbackOrigin(
  headers: FastifyRequest["headers"],
  peerIp: string | undefined,
): boolean {
  return !hasForwardingHeaders(headers) && isLoopbackAddress(peerIp);
}

export function isDirectLoopbackLocalRequest(
  request: Pick<FastifyRequest, "headers" | "socket">,
): boolean {
  return isDirectLoopbackOrigin(request.headers, request.socket.remoteAddress);
}

/** Install the control-plane locality gate before authentication exemptions. */
export function installControlLocalOnlyGuard(app: FastifyInstance): void {
  app.addHook("preHandler", async (request, reply) => {
    const pathname = new URL(request.url, "http://control-api").pathname;
    if (!pathname.startsWith(LOCAL_ENDPOINT_PREFIX)) return;
    if (isDirectLoopbackLocalRequest(request)) return;

    return reply.status(403).send({
      error: {
        type: "invalid_request",
        code: "LOCAL_ONLY",
        message: "This endpoint requires localhost access",
      },
      requestId: request.id,
    });
  });
}
