import { Controller, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { HeadroomService } from "./headroom.service.js";

@Controller("api/headroom")
export class HeadroomController {
  constructor(private readonly headroom: HeadroomService) {}

  @Post("start")
  async start(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.send(reply, await this.headroom.start(request.raw as unknown as Request));
  }

  @Post("stop")
  async stop(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.send(reply, await this.headroom.stop(request.raw as unknown as Request));
  }

  @Get("status")
  async status(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.send(reply, await this.headroom.status(request.raw as unknown as Request));
  }

  private async send(reply: FastifyReply, response: Response) {
    const body = await response.json().catch(() => undefined);
    return reply.status(response.status).send(body);
  }
}
