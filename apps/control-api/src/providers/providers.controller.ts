import {
  Controller,
  Delete,
  Get,
  Inject,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  Res,
} from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { ProvidersService } from "./providers.service.js";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";

@Controller("api")
export class ProvidersController {
  constructor(
    @Inject(ProvidersService) private readonly providersService: ProvidersService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher
  ) {}

  @Get("provider-metrics")
  metrics(@Res() reply: FastifyReply) {
    try {
      const data = this.providersService.getMetrics();
      return reply.send(data);
    } catch (error) {
      console.error("Failed to load provider metrics", error);
      return reply.status(500).send({ error: "Failed to load provider metrics" });
    }
  }

  @Get("provider-stats")
  stats(@Res() reply: FastifyReply) {
    try {
      const data = this.providersService.getStats();
      return reply.send(data);
    } catch (error) {
      console.error("Error fetching provider stats:", error);
      return reply.status(500).send({ error: "Failed to fetch provider stats" });
    }
  }

  @Get("token-health")
  async tokenHealth(@Res() reply: FastifyReply) {
    try {
      const data = await this.providersService.getTokenHealth();
      return reply.send(data);
    } catch (error: any) {
      return reply.status(500).send({
        error: error?.message || "Failed to fetch token health",
        status: "unknown",
      });
    }
  }

  @Get("synced-available-models")
  async syncedModels(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("provider") provider?: string
  ) {
    const rawReq = request.raw as unknown as Request;
    if (!(await isAuthenticated(rawReq))) {
      return reply
        .status(401)
        .send({ error: { message: "Authentication required", type: "invalid_api_key" } });
    }

    try {
      const data = await this.providersService.getSyncedModels(provider);
      return reply.send(data);
    } catch {
      return reply.status(500).send({
        error: { message: "Failed to fetch synced available models", type: "server_error" },
      });
    }
  }

  @Get("provider-models")
  providerModels(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleGetProviderModels(req)
    );
  }

  @Post("provider-models")
  createProviderModel(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleCreateProviderModel(req)
    );
  }

  @Put("provider-models")
  updateProviderModel(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleUpdateProviderModel(req)
    );
  }

  @Patch("provider-models")
  patchProviderModel(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handlePatchProviderModel(req)
    );
  }

  @Delete("provider-models")
  deleteProviderModel(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleDeleteProviderModel(req)
    );
  }

  @Get("provider-nodes")
  providerNodes(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleGetProviderNodes(req)
    );
  }

  @Post("provider-nodes")
  createProviderNode(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleCreateProviderNode(req)
    );
  }

  @Put("provider-nodes/:id")
  updateProviderNode(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply
  ) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.providersService.handleUpdateProviderNode(req, id),
      { id }
    );
  }

  @Delete("provider-nodes/:id")
  deleteProviderNode(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply
  ) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.providersService.handleDeleteProviderNode(req, id),
      { id }
    );
  }

  @Post("provider-nodes/validate")
  validateProviderNode(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleValidateProviderNode(req)
    );
  }
}
