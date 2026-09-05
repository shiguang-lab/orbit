import { Body, Controller, Delete, Get, Inject, Options, Param, Post, Put, Query, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { PluginsService } from "./plugins.service.js";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { z } from "zod";

const load = (specifier: string): Promise<any> => import(specifier as string);
const { buildErrorBody } = await load("@shiguang-gateway/open-sse/utils/error.ts");

const StatusSchema = z.enum(["installed", "active", "inactive", "error"]).optional();
const InstallPathSchema = z.object({
  path: z.string().min(1).regex(/^\/[^]*$/, "Path must be absolute").refine(
    (p) => !p.includes("\0") && !p.includes(".."),
    "Path must not contain traversal patterns or null bytes"
  ),
});
const InstallMarketplaceSchema = z.object({
  name: z.string().trim().min(1),
});
const ConfigSchema = z.object({
  config: z.record(z.string(), z.unknown()),
});

@Controller("api/plugins")
export class PluginsController {
  constructor(@Inject(PluginsService) private readonly pluginsService: PluginsService) {}

  @Options()
  optionsPlugins(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Get()
  async getPlugins(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Query("status") status?: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    const statusResult = StatusSchema.safeParse(status);
    if (!statusResult.success) {
      return reply.status(400).headers(CORS_HEADERS).send({ error: "Invalid status value", details: statusResult.error.issues });
    }

    try {
      const plugins = this.pluginsService.listPlugins(statusResult.data);
      return reply.headers(CORS_HEADERS).send({ plugins });
    } catch (err) {
      return reply.status(500).headers(CORS_HEADERS).send(buildErrorBody(500, "Failed to list plugins"));
    }
  }

  @Post()
  async postPlugins(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    const parsed = InstallPathSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).headers(CORS_HEADERS).send({ error: "Invalid request", details: parsed.error.issues });
    }

    try {
      const plugin = await this.pluginsService.installPlugin(parsed.data.path);
      return reply.status(201).headers(CORS_HEADERS).send({ plugin });
    } catch (err) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, "Failed to install plugin"));
    }
  }

  @Options("marketplace")
  optionsMarketplace(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Get("marketplace")
  async getMarketplace(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    try {
      const plugins = await this.pluginsService.listMarketplace();
      return reply.headers(CORS_HEADERS).send({ plugins });
    } catch (err) {
      return reply.status(500).headers(CORS_HEADERS).send(buildErrorBody(500, "Failed to list marketplace plugins"));
    }
  }

  @Options("marketplace/install")
  optionsMarketplaceInstall(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Post("marketplace/install")
  async postMarketplaceInstall(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    const parsed = InstallMarketplaceSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, "Missing or invalid 'name' field"));
    }

    try {
      const result = await this.pluginsService.installMarketplace(parsed.data.name);
      return reply.status(201).headers(CORS_HEADERS).send(result);
    } catch (err: any) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, err?.message || "Failed to install marketplace plugin"));
    }
  }

  @Options("scan")
  optionsScan(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Post("scan")
  async postScan(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    try {
      const result = await this.pluginsService.scan();
      return reply.headers(CORS_HEADERS).send({ discovered: result.discovered, errors: result.errors });
    } catch (err) {
      return reply.status(500).headers(CORS_HEADERS).send(buildErrorBody(500, "Failed to scan plugin directory"));
    }
  }

  @Options(":name/activate")
  optionsActivate(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Post(":name/activate")
  async postActivate(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("name") name: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    try {
      const result = await this.pluginsService.activatePlugin(name);
      return reply.headers(CORS_HEADERS).send(result);
    } catch (err) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, "Failed to activate plugin"));
    }
  }

  @Options(":name/deactivate")
  optionsDeactivate(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Post(":name/deactivate")
  async postDeactivate(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("name") name: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    try {
      const result = await this.pluginsService.deactivatePlugin(name);
      return reply.headers(CORS_HEADERS).send(result);
    } catch (err) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, "Failed to deactivate plugin"));
    }
  }

  @Options(":name/config")
  optionsConfig(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Get(":name/config")
  async getConfig(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("name") name: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    const result = this.pluginsService.getPluginConfig(name);
    if (!result) {
      return reply.status(404).headers(CORS_HEADERS).send(buildErrorBody(404, `Plugin '${name}' not found`));
    }
    return reply.headers(CORS_HEADERS).send(result);
  }

  @Put(":name/config")
  async putConfig(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("name") name: string,
    @Body() body: unknown
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    const parsed = ConfigSchema.safeParse(body);
    if (!parsed.success) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, "Invalid request"));
    }

    try {
      const result = this.pluginsService.updatePluginConfig(name, parsed.data.config);
      if (!result) {
        return reply.status(404).headers(CORS_HEADERS).send(buildErrorBody(404, `Plugin '${name}' not found`));
      }
      return reply.headers(CORS_HEADERS).send(result);
    } catch (err: any) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, err?.message || "Failed to update plugin config"));
    }
  }

  @Options(":name")
  optionsPlugin(@Res() reply: FastifyReply) {
    return reply.status(204).headers(CORS_HEADERS).send();
  }

  @Get(":name")
  async getPlugin(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("name") name: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    const plugin = this.pluginsService.getPlugin(name);
    if (!plugin) {
      return reply.status(404).headers(CORS_HEADERS).send({ error: `Plugin '${name}' not found` });
    }
    return reply.headers(CORS_HEADERS).send({ plugin });
  }

  @Delete(":name")
  async deletePlugin(
    @Req() req: FastifyRequest,
    @Res() reply: FastifyReply,
    @Param("name") name: string
  ): Promise<unknown> {
    const rawReq = req.raw as unknown as Request;
    const authError = await requireManagementAuth(rawReq);
    if (authError) return reply.status(authError.status).headers(CORS_HEADERS).send(await authError.json());

    try {
      const result = await this.pluginsService.uninstallPlugin(name);
      return reply.headers(CORS_HEADERS).send(result);
    } catch (err) {
      return reply.status(400).headers(CORS_HEADERS).send(buildErrorBody(400, "Failed to uninstall plugin"));
    }
  }
}
