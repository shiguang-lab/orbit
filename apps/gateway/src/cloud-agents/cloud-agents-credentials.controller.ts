import { Controller, Inject, Get, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

const load = (specifier: string): Promise<Record<string, any>> => import(specifier as string);

@Controller(["v1/agents/credentials", "api/v1/agents/credentials"])
export class CloudAgentsCredentialsController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/credentials.js");
      return route.OPTIONS(r);
    });
  }

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/credentials.js");
      return route.GET(r);
    });
  }

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/credentials.js");
      return route.POST(r);
    });
  }
}
