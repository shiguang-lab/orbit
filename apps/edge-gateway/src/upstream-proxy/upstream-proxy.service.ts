import { Injectable } from "@nestjs/common";
import {
  deleteUpstreamProxyConfig,
  getUpstreamProxyConfig,
  upsertUpstreamProxyConfig,
} from "@shiguang-gateway/core-domain/db/upstream-proxy";
import { isClaudeCodeCompatibleProvider } from "@shiguang-gateway/core-domain/catalog/providers";
import {
  isValidationFailure,
  validateBody,
} from "@shiguang-gateway/core-domain/shared/validation-helpers";
import { z } from "zod";

const upstreamProxySchema = z.object({
  mode: z.enum(["native", "cliproxyapi", "dario", "fallback"]).default("native"),
  enabled: z.boolean().optional().default(true),
  fallbackBackend: z.enum(["cliproxyapi", "dario"]).optional(),
});

function json(body: unknown, status = 200): Response {
  return Response.json(body, { status });
}

function isDarioEligibleProvider(providerId: string): boolean {
  return providerId === "claude" || isClaudeCodeCompatibleProvider(providerId);
}

@Injectable()
export class UpstreamProxyService {
  async get(providerId: string): Promise<Response> {
    if (!providerId) return json({ error: "providerId required" }, 400);
    const config = await getUpstreamProxyConfig(providerId);
    return json(config ?? { enabled: false, mode: "native", fallbackBackend: "cliproxyapi" });
  }

  async put(request: Request, providerId: string): Promise<Response> {
    if (!providerId) return json({ error: "providerId required" }, 400);

    const validation = validateBody(upstreamProxySchema, await request.json());
    if (isValidationFailure(validation)) return json(validation.error, 400);

    const { mode, enabled, fallbackBackend } = validation.data;
    const wantsDario = mode === "dario" || (mode === "fallback" && fallbackBackend === "dario");
    if (wantsDario && !isDarioEligibleProvider(providerId)) {
      return json(
        {
          error:
            `Dario only proxies Claude-Code-shaped traffic (it authenticates via a Claude ` +
            `Pro/Max subscription, not a per-provider credential) — "${providerId}" can't be ` +
            `routed through it.`,
        },
        400,
      );
    }

    return json(await upsertUpstreamProxyConfig({
      providerId,
      mode,
      enabled,
      ...(fallbackBackend !== undefined ? { fallbackBackend } : {}),
    }));
  }

  async delete(providerId: string): Promise<Response> {
    if (!providerId) return json({ error: "providerId required" }, 400);
    return json({ deleted: await deleteUpstreamProxyConfig(providerId) });
  }
}
