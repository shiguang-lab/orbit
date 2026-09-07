import { Controller, Delete, Get, Inject, Options, Param, Post, Put, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { PlaygroundService } from "./playground.service.js";

@Controller("api/playground")
export class PlaygroundController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(PlaygroundService) private readonly playground: PlaygroundService,
  ) {}

  @Options("improve-prompt") improvePromptOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.playground.improvePromptOptions()); }
  @Post("improve-prompt") improvePrompt(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.playground.improvePrompt(r)); }

  @Post("simulate-route") simulateRoute(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.playground.simulateRoute(r)); }

  @Options("presets") presetsOptions(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.playground.presetsOptions()); }
  @Get("presets") presetsGet(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.playground.presetsGet(r)); }
  @Post("presets") presetsPost(@Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.playground.presetsPost(r)); }

  @Options("presets/:id") presetOptions(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, () => this.playground.presetOptions()); }
  @Get("presets/:id") presetGet(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.playground.presetGet(r, id), { id }); }
  @Put("presets/:id") presetPut(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.playground.presetPut(r, id), { id }); }
  @Delete("presets/:id") presetDelete(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) { return this.routes.dispatch(req, reply, (r) => this.playground.presetDelete(r, id), { id }); }
}
