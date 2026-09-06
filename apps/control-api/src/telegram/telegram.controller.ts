import { Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { TelegramService } from "./telegram.service.js";

@Controller("api/telegram")
export class TelegramController {
  constructor(
    private readonly telegram: TelegramService,
    private readonly routes: WebRouteDispatcher,
  ) {}

  @Post("update")
  update(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.telegram.update(req));
  }
}
