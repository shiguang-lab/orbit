import { Injectable, type NestMiddleware } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";

/** Adds a stable correlation id before a request reaches a controller. */
@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: FastifyRequest, response: FastifyReply, next: () => void): void {
    const existing = request.headers["x-request-id"];
    const requestId =
      (Array.isArray(existing) ? existing[0] : existing) ??
      `req-${crypto.randomUUID().slice(0, 8)}${Date.now().toString(36)}`;
    request.id = requestId;
    response.header("x-request-id", requestId);
    next();
  }
}
