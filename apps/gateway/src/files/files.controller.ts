import { Controller, Delete, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { FilesService } from "./files.service.js";

@Controller(["v1/files", "api/v1/files"])
export class FilesController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(FilesService) private readonly filesService: FilesService
  ) {}

  @Get()
  getFiles(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.filesService.handleGetFiles(r));
  }

  @Post()
  createFile(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.filesService.handleCreateFile(r));
  }

  @Get(":id")
  getFile(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      req,
      reply,
      (webReq) => this.filesService.handleGetFile(webReq, id),
      { id }
    );
  }

  @Delete(":id")
  deleteFile(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      req,
      reply,
      (webReq) => this.filesService.handleDeleteFile(webReq, id),
      { id }
    );
  }

  @Get(":id/content")
  getFileContent(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      req,
      reply,
      (webReq) => this.filesService.handleGetFileContent(webReq, id),
      { id }
    );
  }
}
