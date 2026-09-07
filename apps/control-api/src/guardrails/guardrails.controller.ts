import { toWebRequest } from "@shiguang-gateway/web-handler-adapter";
import { Controller, Get, Options, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { GuardrailsService } from "./guardrails.service.js";

@Controller("api/guardrails")
export class GuardrailsController {
  constructor(private readonly guardrails: GuardrailsService) {}

  @Get()
  async list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const response = await this.guardrails.list(toWebRequest(request));
    return this.send(reply, response);
  }

  @Options()
  listOptions(@Res() reply: FastifyReply) {
    return reply.status(204).send();
  }

  @Post("test")
  async test(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const response = await this.guardrails.test(toWebRequest(request));
    return this.send(reply, response);
  }

  @Options("test")
  testOptions(@Res() reply: FastifyReply) {
    return reply.status(204).send();
  }

  private async send(reply: FastifyReply, response: Response) {
    const body = await response.json().catch(() => undefined);
    return reply.status(response.status).send(body);
  }
}
