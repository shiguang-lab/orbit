import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HeadroomService } from "./headroom.service.js";

@Controller("api/headroom")
export class HeadroomController {
  constructor(private readonly headroom: HeadroomService) {}

  @Post("start")
  async start(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.send(reply, await this.headroom.start(toWebRequest(request)));
  }

  @Post("stop")
  async stop(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.send(reply, await this.headroom.stop(toWebRequest(request)));
  }

  @Get("status")
  async status(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.send(reply, await this.headroom.status(toWebRequest(request)));
  }

  private async send(reply: FastifyReply, response: Response) {
    const body = await response.json().catch(() => undefined);
    return reply.status(response.status).send(body);
  }
}
