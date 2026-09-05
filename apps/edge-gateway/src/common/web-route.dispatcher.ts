import { Injectable } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { dispatchWebRoute, type WebRouteHandler } from "@shiguang-gateway/web-route-compat";

@Injectable()
export class WebRouteDispatcher {
  dispatch(
    request: FastifyRequest,
    reply: FastifyReply,
    handler: WebRouteHandler,
    params: Record<string, string> = {},
  ): Promise<unknown> {
    return dispatchWebRoute(request, reply, handler, params);
  }
}
