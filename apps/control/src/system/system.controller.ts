import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import { Readable } from "node:stream";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { SystemService, type SystemResult } from "./system.service.js";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) {
      headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
    }
  }
  const host = String(request.headers.host ?? "control");
  return new Request(`http://${host}${request.url}`, { method: request.method, headers });
}

/** HTTP transport for system update and environment operations owned by control. */
@Controller("api/system")
export class SystemController {
  constructor(
    @Inject(SystemService) private readonly system: SystemService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
  ) {}

  @Get("env/repair")
  envRepairStatus(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.system.getEnvRepair(req));
  }

  @Post("env/repair")
  repairEnv(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.system.repairEnv(req));
  }

  @Get("version")
  async version(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return this.send(reply, await this.system.getVersion(this.headers(request)));
  }

  @Post("version")
  async update(@Req() request: FastifyRequest, @Res() reply: FastifyReply): Promise<unknown> {
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply.status(401).send({ error: "Unauthorized" });
    }
    return this.send(reply, await this.system.updateVersion());
  }

  private headers(request: FastifyRequest): Headers {
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (typeof value === "string") headers.set(name, value);
      else if (Array.isArray(value)) {
        headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
      }
    }
    return headers;
  }

  private async send(reply: FastifyReply, response: SystemResult): Promise<unknown> {
    for (const [name, value] of Object.entries(response.headers ?? {})) reply.header(name, value);
    reply.code(response.status);
    if (response.body === undefined || response.body === null) return reply.send();
    if (response.body instanceof ReadableStream) {
      return reply.send(Readable.fromWeb(response.body as never));
    }
    return reply.send(typeof response.body === "string" ? Buffer.from(response.body) : response.body);
  }
}
