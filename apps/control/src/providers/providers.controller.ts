import { toWebRequest } from "@orbit/http/web-handler";
import {
  Body,
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
import { POST as testProviderConnection } from "./handlers/provider-test/provider-test.handler.js";
import { ProviderPolicyService } from "./provider-policy.service.js";
import { ProviderClientService } from "./provider-client.service.js";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import {
  updateCcAliasSettingSchema,
  updateInterceptionRulesSchema,
  updateParamFilterConfigSchema,
} from "@orbit/core/control/provider-validation-schemas";
import {
  listProviders,
  createProvider,
  updateProviders,
  deleteProviders,
} from "./handlers/provider-management.js";
import { bulkCreateProviders } from "./handlers/provider-bulk.js";
import { importProviders } from "./handlers/provider-import.js";
import {
  getProviderModels as getProviderModelsDiscovery,
  getProviderCatalogModels,
  syncProviderModels,
} from "./provider-models-discovery/index.js";
import {
  DELETE as deleteProviderDetail,
  GET as getProviderDetail,
  PUT as updateProviderDetail,
} from "./handlers/provider-detail.js";
import { getProviderCatalog } from "./handlers/provider-catalog.js";
import { POST as loginProvider } from "./handlers/provider-login/provider-login.js";

@Controller("api")
export class ProvidersController {
  constructor(
    @Inject(ProvidersService) private readonly providersService: ProvidersService,
    @Inject(WebRouteDispatcher) private readonly routes: WebRouteDispatcher,
    @Inject(ProviderPolicyService) private readonly providerPolicy: ProviderPolicyService,
    @Inject(ProviderClientService) private readonly providerClient: ProviderClientService,
  ) {}

  @Get("providers")
  list(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, listProviders);
  }

  @Post("providers")
  create(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, createProvider);
  }

  @Patch("providers")
  update(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, updateProviders);
  }

  @Delete("providers")
  remove(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, deleteProviders);
  }

  @Post("providers/bulk")
  bulk(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, bulkCreateProviders);
  }

  @Post("providers/import")
  import(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, importProviders);
  }

  @Get("providers/catalog")
  catalog(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, getProviderCatalog);
  }

  @Get("providers/:id")
  getProvider(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) =>
      getProviderDetail(webRequest, { params: { id } })
    );
  }

  @Put("providers/:id")
  updateProvider(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) =>
      updateProviderDetail(webRequest, { params: { id } })
    );
  }

  @Patch("providers/:id")
  patchProvider(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) =>
      updateProviderDetail(webRequest, { params: { id } })
    );
  }

  @Delete("providers/:id")
  deleteProvider(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) =>
      deleteProviderDetail(webRequest, { params: { id } })
    );
  }

  @Post("providers/:id/login")
  loginProvider(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (webRequest) =>
      loginProvider(webRequest, { params: { id } })
    );
  }

  @Get("providers/:id/cc-alias")
  async getCcAlias(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    try { return reply.send(this.providerPolicy.getCcAlias(id)); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Put("providers/:id/cc-alias")
  async updateCcAlias(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorizeManagement(request, reply))) return;
    const validation = validateBody(updateCcAliasSettingSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      this.providerPolicy.updateCcAlias(id, validation.data);
      return reply.send({ success: true });
    } catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Get("providers/:id/interception-rules")
  async getInterceptionRules(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    try { return reply.send(this.providerPolicy.getInterception(id)); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Put("providers/:id/interception-rules")
  async updateInterceptionRules(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorizeManagement(request, reply))) return;
    const validation = validateBody(updateInterceptionRulesSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    try {
      this.providerPolicy.updateInterception(id, validation.data);
      return reply.send({ success: true });
    } catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Delete("providers/:id/interception-rules")
  async deleteInterceptionRules(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    try { this.providerPolicy.deleteInterception(id); return reply.send({ success: true }); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Get("providers/:id/param-filters")
  async getParamFilters(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    try { return reply.send(this.providerPolicy.getParamFilters(id)); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Put("providers/:id/param-filters")
  async updateParamFilters(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorizeManagement(request, reply))) return;
    const validation = validateBody(updateParamFilterConfigSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    const { block, allow, models, autoLearn } = validation.data;
    try {
      this.providerPolicy.updateParamFilters(id, { block: block ?? [], allow: allow ?? [], models, autoLearn: autoLearn ?? false });
      return reply.send({ success: true });
    } catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Delete("providers/:id/param-filters")
  async deleteParamFilters(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    try { this.providerPolicy.deleteParamFilters(id); return reply.send({ success: true }); }
    catch (error) { return reply.status(500).send(buildErrorBody(500, sanitizeErrorMessage(error))); }
  }

  @Get("providers/client")
  async providerClientConnections(@Res() reply: FastifyReply) {
    try { return reply.send(await this.providerClient.listConnections()); }
    catch (error) {
      console.log("Error fetching providers for client:", error);
      return reply.status(500).send({ error: "Failed to fetch providers" });
    }
  }

  @Get("providers/web-session-contract")
  async webSessionContract(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeManagement(request, reply))) return;
    return reply.send(this.providerClient.getWebSessionContract());
  }

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

  @Get("providers/:id/models")
  providerModelsDiscovery(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, getProviderModelsDiscovery, { id });
  }

  @Get("providers/:id/catalog-models")
  providerCatalogModels(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, getProviderCatalogModels, { id });
  }

  @Post("providers/:id/sync-models")
  syncProviderModels(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(request, reply, syncProviderModels, { id });
  }

  @Post("providers/:id/refresh-token")
  refreshProviderToken(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.providersService.handleRefreshProviderToken(req, id), { id });
  }

  @Post("providers/:id/refresh-cursor")
  refreshCursor(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.providersService.handleRefreshCursorToken(req, id), { id });
  }

  @Get("providers/:id/chatgpt-web-codex-doctor")
  chatgptWebCodexDoctor(@Param("id") id: string, @Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    return this.routes.dispatch(request, reply, (req) => this.providersService.handleChatgptWebCodexDoctor(req, id), { id });
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
    const rawReq = toWebRequest(request);
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
    if (!(await isAuthenticated(toWebRequest(request)))) {
      return reply
        .status(401)
        .send({ error: { message: "Authentication required", type: "invalid_request_error" } });
    }
    try {
      const forceRefresh = new URL(request.raw.url ?? "", "http://localhost").searchParams.get("refresh") === "true";
      if (forceRefresh) {
        const result = await this.providersService.getOpenRouterStats(true);
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
      const result = await this.providersService.getOpenRouterStats(false);
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
    const authError = await requireManagementAuth(toWebRequest(request));
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
    const authError = await requireManagementAuth(toWebRequest(request));
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

  @Post("providers/:id/test")
  testProvider(
    @Param("id") id: string,
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
  ) {
    return this.routes.dispatch(
      request,
      reply,
      (req) => testProviderConnection(req, { params: { id } }),
      { id },
    );
  }

  private async authorizeManagement(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }
}
