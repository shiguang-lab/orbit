import { Controller, Get, Inject, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ImagesService } from "./images.service.js";

@Controller(["v1/images", "api/v1/images"])
export class ImagesController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ImagesService) private readonly imagesService: ImagesService
  ) {}

  @Get("generations")
  getGenerations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.imagesService.handleGetGenerations(r));
  }

  @Post("generations")
  generations(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.imagesService.handleGenerations(r));
  }

  @Post("edits")
  edits(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.imagesService.handleEdits(r));
  }


  @Get("upscale")
  getUpscale(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.imagesService.handleGetUpscale(r));
  }

  @Post("upscale")
  upscale(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.imagesService.handleUpscale(r));
  }
}
