import { Controller, Delete, Get, Inject, Options, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

const load = (specifier: string): Promise<Record<string, any>> => import(specifier as string);

@Controller(["v1/agents/tasks/:id", "api/v1/agents/tasks/:id"])
export class CloudAgentsTaskController {
  constructor(@Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher) {}

  @Options()
  options(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/task-by-id.js");
      return route.OPTIONS(r);
    });
  }

  @Get()
  get(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/task-by-id.js");
      return route.GET(r, { params: Promise.resolve({ id }) });
    }, { id });
  }

  @Post()
  post(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/task-by-id.js");
      return route.POST(r, { params: Promise.resolve({ id }) });
    }, { id });
  }

  @Delete()
  remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Param("id") id: string) {
    return this.routes.dispatch(request, reply, async (r) => {
      const route = await load("./routes/task-by-id.js");
      return route.DELETE(r, { params: Promise.resolve({ id }) });
    }, { id });
  }
}
