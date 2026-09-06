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
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";

@Controller("api")
export class ProvidersController {
  constructor(
    @Inject(ProvidersService) private readonly providersService: ProvidersService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher
  ) {}

  @Post("providers/:id/refresh")
  refreshProvider(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply
  ) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => this.providersService.handleRefreshProvider(req, id),
      { id }
    );
  }

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
  async stats(@Res() reply: FastifyReply) {
    try {
      const data = await this.providersService.getStats();
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

  @Post("providers/validate")
  validateProvider(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) =>
      this.providersService.handleValidateProvider(req)
    );
  }

  @Get("providers/openrouter-stats")
  async openRouterStats(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await isAuthenticated(request.raw as unknown as Request))) {
      return reply
        .status(401)
        .send({ error: { message: "Authentication required", type: "invalid_request_error" } });
    }
    try {
      const forceRefresh = new URL(request.raw.url ?? "", "http://localhost").searchParams.get("refresh") === "true";
      const result = await this.providersService.getOpenRouterStats(forceRefresh);
      if (forceRefresh) {
        return reply.send({
          object: "list",
          data: result.data,
          meta: {
            source: result.ok ? "fresh" : "error",
            count: result.data.length,
            error: result.error ?? undefined,
          },
        });
      }
      return reply.send({
        object: "list",
        data: result.data,
        meta: {
          source: result.fromCache ? (result.stale ? "stale-cache" : "cache") : "fresh",
          cachedAt: result.cachedAt ?? undefined,
          stale: result.stale,
          count: result.data.length,
        },
      });
    } catch (error) {
      console.error("Failed to load OpenRouter provider stats", error);
      return reply.status(500).send({ error: "Failed to load OpenRouter provider stats" });
    }
  }

  @Get("providers/quota-windows")
  async quotaWindows(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (authError) return reply.status(authError.status).send(await authError.json());
    try {
      return reply.send(await this.providersService.getQuotaWindows());
    } catch (error) {
      console.error("Error fetching quota windows:", error);
      return reply.status(500).send({ error: "Failed to fetch quota windows" });
    }
  }

  @Get("providers/expiration")
  providerExpiration(@Res() reply: FastifyReply) {
    try {
      return reply.send(this.providersService.getProviderExpirations());
    } catch (error) {
      console.error("Failed to fetch provider expiration metadata", error);
      return reply.status(500).send({ error: "Failed to fetch expiration metadata." });
    }
  }

  @Get("providers/health-matrix")
  async providerHealthMatrix(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    const authError = await requireManagementAuth(request.raw as unknown as Request);
    if (authError) return reply.status(authError.status).send(await authError.json());
    const query = new URL(request.raw.url ?? "", "http://localhost").searchParams;
    const providerRaw = query.get("provider");
    const rangeRaw = query.get("range");
    const includeHealthyRaw = query.get("includeHealthy");
    const validRange = rangeRaw === null || ["1h", "24h", "7d", "30d"].includes(rangeRaw);
    const validInclude = includeHealthyRaw === null || ["true", "false", "1", "0"].includes(includeHealthyRaw);
    if (!validRange || !validInclude || (providerRaw !== null && providerRaw.trim().length === 0)) {
      return reply.status(400).send(buildErrorBody(400, "Invalid provider health matrix query"));
    }
    try {
      return reply.send(
        await this.providersService.getProviderHealthMatrix({
          provider: providerRaw,
          range: rangeRaw,
          includeHealthy:
            includeHealthyRaw === null || includeHealthyRaw === "true" || includeHealthyRaw === "1",
        })
      );
    } catch (error) {
      console.error("Failed to build provider health matrix", error);
      return reply.status(500).send(buildErrorBody(500, "Failed to build provider health matrix"));
    }
  }
}
