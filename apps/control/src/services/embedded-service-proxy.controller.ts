import { Controller, Delete, Get, Head, Inject, Options, Param, Patch, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { proxyRequest } from "./embedded-service-proxy.js";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

type EmbedParams = { name: string; "*"?: string };

@Controller("dashboard/providers/services/:name/embed")
export class EmbeddedServiceProxyController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  private dispatch(request: FastifyRequest, reply: FastifyReply, params: EmbedParams) {
    const path = params["*"]?.split("/").filter(Boolean) ?? [];
    return this.routes.dispatch(
      request,
      reply,
      (webRequest) => proxyRequest(webRequest, path, {
        name: params.name,
        publicPrefix: `/dashboard/providers/services/${params.name}/embed`,
        htmlRewrite: true,
      }),
    );
  }

  @Get(["", "*"])
  get(@Param() params: EmbedParams, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply, params);
  }

  @Post(["", "*"])
  post(@Param() params: EmbedParams, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply, params);
  }

  @Put(["", "*"])
  put(@Param() params: EmbedParams, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply, params);
  }

  @Patch(["", "*"])
  patch(@Param() params: EmbedParams, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply, params);
  }

  @Delete(["", "*"])
  delete(@Param() params: EmbedParams, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply, params);
  }

  @Head(["", "*"])
  head(@Param() params: EmbedParams, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply, params);
  }

  @Options(["", "*"])
  options(@Param() params: EmbedParams, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.dispatch(request, reply, params);
  }
}
