import { toWebRequest } from "@orbit/http/web-handler";
import { Body, Controller, Get, Patch, Post, Req, Res } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import {
  isAuthenticated,
  isAuthRequired,
} from "@orbit/core/control/authenticated";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import {
  isValidationFailure,
  validateBody,
} from "@orbit/core/shared/validation/helpers";
import { updateComboDefaultsSchema } from "@orbit/core/validation/combos";
import { isPaidModelTarget } from "@orbit/core/catalog/free-models";
import {
  SAFE_OUTBOUND_FETCH_PRESETS,
  safeOutboundFetch,
} from "@orbit/core/network/safe-outbound-fetch";
import { APP_CONFIG } from "@orbit/core/shared/app-config";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { SettingsConfigService } from "./settings-config.service.js";

const modelsDevActionSchema = z
  .object({
    action: z.enum(["sync", "start", "stop"]),
    dryRun: z.boolean().optional(),
    syncCapabilities: z.boolean().optional(),
  })
  .strict();

function requestUrl(request: FastifyRequest): URL {
  const protocol = request.protocol || "http";
  const host = request.headers.host || "localhost";
  return new URL(request.url, `${protocol}://${host}`);
}

async function readRequestBody(request: FastifyRequest): Promise<string> {
  const contentType = String(request.headers["content-type"] ?? "");
  const body = request.body as unknown;

  if (contentType.includes("multipart/form-data")) {
    const formData = await toWebRequest(request).formData();
    const file = formData.get("file");
    if (file && typeof file === "object" && "text" in file && typeof file.text === "function") {
      return file.text();
    }
    if (typeof file === "string") return file;
    return "";
  }

  if (Buffer.isBuffer(body)) return body.toString("utf8");
  if (typeof body === "string") return body;
  if (body !== undefined && body !== null) return JSON.stringify(body);

  const chunks: Buffer[] = [];
  for await (const chunk of request.raw) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk)));
  }
  return Buffer.concat(chunks).toString("utf8");
}

@Controller("api/settings")
export class SettingsConfigController {
  constructor(private readonly settingsConfig: SettingsConfigService) {}

  private async authorize(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    const authError = await requireManagementAuth(toWebRequest(request));
    if (!authError) return true;
    reply.status(authError.status).send(await authError.json());
    return false;
  }

  private async authorizeAuthenticated(request: FastifyRequest, reply: FastifyReply): Promise<boolean> {
    if (await isAuthenticated(toWebRequest(request))) return true;
    reply.status(401).send({ error: "Unauthorized" });
    return false;
  }

  @Get("export-json")
  async exportJson(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (await isAuthRequired(toWebRequest(request))) {
      if (!(await isAuthenticated(toWebRequest(request)))) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }
    try {
      const includeHistory = requestUrl(request).searchParams.get("includeHistory") === "true";
      const data = await this.settingsConfig.exportJson(includeHistory);
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      return reply
        .header("Content-Type", "application/json")
        .header("Content-Disposition", `attachment; filename="shiguangGateway-legacy-backup-${timestamp}.json"`)
        .send(JSON.stringify(data, null, 2));
    } catch (error) {
      console.error("[API] Error exporting JSON backup:", error);
      return reply.status(500).send({ error: "Failed to export JSON" });
    }
  }

  @Post("import-json")
  async importJson(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (await isAuthRequired(toWebRequest(request))) {
      if (!(await isAuthenticated(toWebRequest(request)))) {
        return reply.status(401).send({ error: "Unauthorized" });
      }
    }
    try {
      const rawText = await readRequestBody(request);
      if (!rawText.trim()) return reply.status(400).send({ error: "Empty request payload" });
      let data: unknown;
      try {
        data = JSON.parse(rawText);
      } catch {
        return reply.status(400).send({
          error: "Invalid JSON: the file could not be parsed. Please upload a valid .json backup.",
        });
      }
      const counts = await this.settingsConfig.importJson(data as Parameters<SettingsConfigService["importJson"]>[0]);
      console.log(
        `[JSON Import] Imported ${counts.connections} connections, ${counts.nodes} nodes, ` +
          `${counts.combos} combos, ${counts.apiKeys} API keys, ` +
          `${counts.usageHistory} usage rows, ${counts.domainCostHistory} cost rows, ` +
          `${counts.domainBudgets} budgets`,
      );
      return reply.send({ success: true, message: "Legacy JSON database imported successfully", ...counts });
    } catch (error) {
      console.error("[API] Error importing JSON backup:", error);
      return reply.status(500).send({
        error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
      });
    }
  }

  @Get("favicon")
  async favicon(@Res() reply: FastifyReply) {
    try {
      const { base64, url } = await this.settingsConfig.getFaviconData();
      const allowedTypes = new Set([
        "image/png",
        "image/x-icon",
        "image/svg+xml",
        "image/gif",
        "image/webp",
        "image/jpeg",
      ]);
      const maxSize = 50 * 1024;
      let faviconData = base64;
      const isValidData = (value: string): boolean => {
        const match = value.match(/^data:([^;]+);base64,(.+)$/);
        if (!match || !allowedTypes.has(match[1])) return false;
        return Buffer.from(match[2], "base64").length <= maxSize;
      };
      if (!faviconData && url) {
        try {
          const response = await safeOutboundFetch(url, {
            ...SAFE_OUTBOUND_FETCH_PRESETS.validationRead,
            guard: "public-only",
            timeoutMs: 5000,
            headers: { "User-Agent": "ShiguangGateway/2.0" },
          });
          if (response.ok) {
            const contentType = response.headers.get("content-type") || "";
            const bytes = new Uint8Array(await response.arrayBuffer());
            const candidate = `data:${contentType};base64,${Buffer.from(bytes).toString("base64")}`;
            if (bytes.length <= maxSize && isValidData(candidate)) faviconData = candidate;
          }
        } catch (error) {
          console.error("Failed to fetch custom favicon:", error);
        }
      }
      if (!faviconData || !isValidData(faviconData)) return reply.redirect(APP_CONFIG.faviconPath, 307);
      const match = faviconData.match(/^data:([^;]+);base64,(.+)$/)!;
      return reply
        .header("Content-Type", match[1])
        .header("Cache-Control", "public, max-age=300")
        .send(Buffer.from(match[2], "base64"));
    } catch (error) {
      console.error("Favicon API error:", error);
      return reply.redirect(APP_CONFIG.faviconPath, 307);
    }
  }

  @Get("combo-defaults")
  async getComboDefaults(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorize(request, reply))) return;
    try {
      return reply.send(this.settingsConfig.getComboDefaults(await this.settingsConfig.getPersistedSettings()));
    } catch (error) {
      console.error("Error fetching combo defaults:", error);
      return reply.status(500).send({ error: "Failed to fetch combo defaults" });
    }
  }

  @Patch("combo-defaults")
  async updateComboDefaults(
    @Req() request: FastifyRequest,
    @Res() reply: FastifyReply,
    @Body() body: unknown,
  ) {
    if (!(await this.authorize(request, reply))) return;
    const validation = validateBody(updateComboDefaultsSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    if (typeof validation.data.comboDefaults?.handoffModel === "string" && validation.data.comboDefaults.handoffModel.trim()) {
      const settings = await this.settingsConfig.getPersistedSettings();
      if (settings.hidePaidModels === true && isPaidModelTarget(validation.data.comboDefaults.handoffModel) === "paid") {
        return reply.status(400).send({
          error: {
            code: "PAID_MODEL_TARGET_BLOCKED",
            message: "This field cannot target a paid-only model while 'Hide paid models' is enabled.",
          },
        });
      }
    }
    try {
      return reply.send(await this.settingsConfig.updateComboDefaults(
        validation.data.comboDefaults,
        validation.data.providerOverrides,
      ));
    } catch (error) {
      console.error("Error updating combo defaults:", error);
      return reply.status(500).send({ error: "Failed to update combo defaults" });
    }
  }

  @Get("models-dev")
  async getModelsDev(@Req() request: FastifyRequest, @Res() reply: FastifyReply) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    if (requestUrl(request).searchParams.get("action") !== "status") {
      return reply.status(400).send({ error: "Unknown action" });
    }
    return reply.send(await this.settingsConfig.getModelsDevStatus());
  }

  @Post("models-dev")
  async postModelsDev(@Req() request: FastifyRequest, @Res() reply: FastifyReply, @Body() body: unknown) {
    if (!(await this.authorizeAuthenticated(request, reply))) return;
    const validation = validateBody(modelsDevActionSchema, body);
    if (isValidationFailure(validation)) return reply.status(400).send({ error: validation.error });
    const { action, dryRun, syncCapabilities } = validation.data;
    if (action === "sync") return reply.send(await this.settingsConfig.syncModelsDev({ dryRun, syncCapabilities: syncCapabilities !== false }));
    if (action === "start") {
      await this.settingsConfig.startModelsDevSync();
      return reply.send({ success: true, message: "Periodic sync started" });
    }
    await this.settingsConfig.stopModelsDevSync();
    return reply.send({ success: true, message: "Periodic sync stopped" });
  }
}
