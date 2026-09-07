import { Controller, Delete, Get, Inject, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

const load = (specifier: string): Promise<Record<string, any>> => import(specifier as string);

@Controller(["v1/agents/tasks", "api/v1/agents/tasks"])
export class CloudAgentsTasksController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/tasks.js");
      return route.OPTIONS(r);
    });
  }

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/tasks.js");
      return route.GET(r);
    });
  }

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/tasks.js");
      return route.POST(r);
    });
  }

  @Delete()
  remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/tasks.js");
      return route.DELETE(r);
    });
  }
}
