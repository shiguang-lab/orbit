import { Injectable } from "@nestjs/common";
import { z } from "zod";
import {
  chaosConfigSchema,
  getChaosConfig,
  resetChaosConfig,
  setChaosConfig,
} from "./runtime/config.js";
import { executeChaosRun, type ChaosRunResult } from "./runtime/executor.js";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { buildErrorBody, sanitizeErrorMessage } from "@orbit/inference/utils/error";

const runSchema = z.object({
  task: z.string().min(1, "Task is required").max(100_000, "task too long"),
  providers: z.array(z.string().min(1)).max(50).optional(),
  mode: z.enum(["parallel", "collaborative"]).optional(),
  systemPrompt: z.string().max(10_000).optional(),
  maxTokens: z.number().int().min(256).max(128_000).optional(),
});

@Injectable()
export class ChaosService {
  async getConfig(request: Request): Promise<Response> {
    return this.withAuth(request, async () => {
      try {
        return Response.json({ config: await getChaosConfig() });
      } catch (error) {
        return Response.json(buildErrorBody(500, sanitizeErrorMessage(error)), { status: 500 });
      }
    });
  }

  async updateConfig(request: Request): Promise<Response> {
    return this.withAuth(request, async () => {
      try {
        const validation = chaosConfigSchema.safeParse(await request.json());
        if (!validation.success) {
          return Response.json(buildErrorBody(400, validation.error.issues[0]?.message ?? "Invalid chaos config"), { status: 400 });
        }
        return Response.json({ config: await setChaosConfig(validation.data), message: "Chaos config updated" });
      } catch (error) {
        return Response.json(buildErrorBody(500, sanitizeErrorMessage(error)), { status: 500 });
      }
    });
  }

  async resetConfig(request: Request): Promise<Response> {
    return this.withAuth(request, async () => {
      try {
        return Response.json({ config: await resetChaosConfig(), message: "Chaos config reset to defaults" });
      } catch (error) {
        return Response.json(buildErrorBody(500, sanitizeErrorMessage(error)), { status: 500 });
      }
    });
  }

  async run(request: Request): Promise<Response> {
    return this.withAuth(request, async () => {
      try {
        const globalConfig = await getChaosConfig();
        if (!globalConfig.enabled) {
          return Response.json(buildErrorBody(400, "Chaos Mode is not enabled. Enable it in Dashboard → Chaos Mode."), { status: 400 });
        }
        const validation = runSchema.safeParse(await request.json());
        if (!validation.success) {
          return Response.json(buildErrorBody(400, validation.error.issues[0]?.message ?? "Invalid request body"), { status: 400 });
        }
        const { task, providers, mode, systemPrompt, maxTokens } = validation.data;
        const result: ChaosRunResult = await executeChaosRun({
          task,
          providers,
          mode,
          systemPrompt,
          timeoutMs: globalConfig.timeoutMs,
          maxTokens: maxTokens || globalConfig.maxTokens,
        });
        return Response.json(result);
      } catch (error) {
        return Response.json(buildErrorBody(500, sanitizeErrorMessage(error)), { status: 500 });
      }
    });
  }

  private async withAuth(request: Request, handler: () => Promise<Response>): Promise<Response> {
    const authError = await requireManagementAuth(request);
    return authError ?? handler();
  }
}
