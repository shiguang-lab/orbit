import { Controller, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../../common/web-route.dispatcher.js";
import { ZedImportService } from "./zed-import.service.js";

@Controller("api/providers/zed")
export class ZedImportController {
  constructor(
    private readonly routes: WebRouteDispatcher,
    private readonly zed: ZedImportService,
  ) {}

  @Post("discover")
  discover(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.zed.discover(req));
  }

  @Post("import")
  import(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.zed.import(req));
  }

  @Post("manual-import")
  manualImport(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.zed.manualImport(req));
  }
}
