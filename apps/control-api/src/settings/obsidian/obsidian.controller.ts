import { Body, Controller, Delete, Get, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { obsidianTokenSchema, obsidianVaultSchema } from "./obsidian.schemas.js";
import { ObsidianSettingsService } from "./obsidian.service.js";

function toWebRequest(request: FastifyRequest): Request {
  const headers = new Headers();
  for (const [name, value] of Object.entries(request.headers)) {
    if (typeof value === "string") headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.filter((item): item is string => typeof item === "string").join(", "));
  }
  return new Request(`http://${String(request.headers.host ?? "control-api")}${request.url}`, { method: request.method, headers });
}

@Controller("api/settings/obsidian")
export class ObsidianSettingsController {
  constructor(private readonly obsidian: ObsidianSettingsService) {}
  private async authorize(request: FastifyRequest, reply: FastifyReply) { if (await isAuthenticated(request.raw as unknown as Request)) return true; reply.status(401).send({ error: "Unauthorized" }); return false; }

  @Get()
  async get(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { if (!(await this.authorize(request, reply))) return; try { return reply.send(this.obsidian.getSettings()); } catch (error) { return reply.status(500).send({ error: sanitizeErrorMessage(error) }); } }

  @Post()
  async connect(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(obsidianTokenSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: "Missing or invalid token", details: validation.error });
    const result = await this.obsidian.connect(validation.data.token, validation.data.baseUrl);
    return result.status === 200 ? reply.send(result.body) : reply.status(result.status).send({ ...result.body, error: sanitizeErrorMessage(result.body.error) });
  }

  @Delete()
  async disconnect(@Req() request: FastifyRequest, @Res() reply: FastifyReply) { if (!(await this.authorize(request, reply))) return; try { return reply.send(this.obsidian.disconnect()); } catch (error) { return reply.status(500).send({ error: sanitizeErrorMessage(error) }); } }
}
