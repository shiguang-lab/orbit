import { Controller, Delete, Get, Inject, Param, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { BatchesService } from "./batches.service.js";

@Controller(["v1/batches", "api/v1/batches"])
export class BatchesController {
  constructor(
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(BatchesService) private readonly batchesService: BatchesService
  ) {}

  @Get()
  getBatches(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.batchesService.handleGetBatches(r));
  }

  @Post()
  createBatch(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.batchesService.handleCreateBatch(r));
  }

  @Delete("delete-completed")
  deleteCompleted(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(req, reply, (r) => this.batchesService.handleDeleteCompleted(r));
  }

  @Get(":id")
  getBatch(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      req,
      reply,
      (webReq) => this.batchesService.handleGetBatch(webReq, id),
      { id }
    );
  }

  @Delete(":id")
  deleteBatch(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      req,
      reply,
      (webReq) => this.batchesService.handleDeleteBatch(webReq, id),
      { id }
    );
  }

  @Post(":id/cancel")
  cancelBatch(@Param("id") id: string, @Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(
      req,
      reply,
      (webReq) => this.batchesService.handleCancelBatch(webReq, id),
      { id }
    );
  }

}
