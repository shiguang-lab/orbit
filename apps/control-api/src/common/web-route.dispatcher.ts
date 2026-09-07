import { Injectable } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import {
  dispatchWebRoute,
  type WebRouteHandler,
} from "@orbit/http/web-handler";

/** Bridges app-owned Web Request handlers to Nest's Fastify transport. */
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
