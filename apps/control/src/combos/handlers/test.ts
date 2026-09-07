import { randomUUID } from "node:crypto";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getComboByName, getCombos } from "@orbit/core/db/combos";
import { pickApiKeyForInternalUse } from "@orbit/core/db/api-keys";
import { buildComboTestRequestBody, extractComboTestResponseText } from "../combo-test.js";
import { sanitizeErrorMessage } from "@orbit/utils/errors";
import { z } from "zod";

const testSchema = z.object({
  comboName: z.string().trim().min(1, "comboName is required"),
  prompt: z.string().trim().min(1).max(4000).optional(),
});

type TestTarget = {
  modelStr?: unknown;
  provider?: unknown;
  stepId?: unknown;
  executionKey?: unknown;
  connectionId?: unknown;
  label?: unknown;
};
const load = (specifier: string): Promise<any> => import(specifier);

function targetResult(target: TestTarget, partial: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    model: target.modelStr,
    provider: target.provider,
    stepId: target.stepId,
    executionKey: target.executionKey,
    connectionId: target.connectionId,
    label: target.label,
    ...partial,
  };
}

async function testTarget(target: TestTarget, baseUrl: string, apiKey: string | null, prompt?: string) {
  const started = Date.now();
  try {
    const modelStr = typeof target.modelStr === "string" ? target.modelStr : "";
    if (!modelStr) return targetResult(target, { status: "error", error: "Combo step is missing a model id (modelStr). Re-save the combo to refresh it.", latencyMs: 0 });
    const lower = modelStr.toLowerCase();
    const isEmbedding = lower.includes("embedding") || lower.includes("bge-") || lower.includes("text-embed");
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20_000);
    let response: Response;
    try {
      response = await fetch(`${baseUrl}/v1/${isEmbedding ? "embeddings" : "chat/completions"}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
          "X-Internal-Test": "combo-health-check",
          "X-ShiguangGateway-No-Cache": "true",
          ...(typeof target.connectionId === "string" ? { "X-ShiguangGateway-Connection": target.connectionId } : {}),
          "X-Request-Id": `combo-test-${randomUUID()}`,
        },
        body: JSON.stringify(buildComboTestRequestBody(modelStr, isEmbedding, { prompt })),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
    const latencyMs = Date.now() - started;
    if (response.ok) {
      let body: unknown = null;
      try { body = await response.json(); } catch {}
      const responseText = extractComboTestResponseText(body);
      return responseText
        ? targetResult(target, { status: "ok", latencyMs, responseText })
        : targetResult(target, { status: "error", statusCode: response.status, error: "Provider returned HTTP 200 but no text content.", latencyMs });
    }
    let error = response.statusText;
    try {
      const body = await response.json() as any;
      error = body?.error?.message || body?.error || error;
    } catch {}
    return targetResult(target, { status: "error", statusCode: response.status, error, latencyMs });
  } catch (error: unknown) {
    return targetResult(target, {
      status: "error",
      error: error instanceof Error && error.name === "AbortError" ? "Timeout (20s)" : sanitizeErrorMessage(error),
      latencyMs: Date.now() - started,
    });
  }
}

/** POST /api/combos/test. Probe each resolved target through gateway. */
export async function testCombo(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  let rawBody: unknown;
  try { rawBody = await request.json(); } catch {
    return Response.json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, { status: 400 });
  }
  const validation = testSchema.safeParse(rawBody);
  if (!validation.success) return Response.json({ error: validation.error }, { status: 400 });

  try {
    const combo = await getComboByName(validation.data.comboName) as any;
    if (!combo) return Response.json({ error: "Combo not found" }, { status: 404 });
    const allCombos = await getCombos();
    const { resolveNestedComboTargets } = await load("@orbit/inference/services/combo");
    const targets = resolveNestedComboTargets(combo, allCombos) as TestTarget[];
    if (targets.length === 0) return Response.json({ error: "Combo has no models" }, { status: 400 });

    const internalApiKey = await pickApiKeyForInternalUse("combo-health-check");
    const baseUrl = `http://127.0.0.1:${Number(process.env.EDGE_GATEWAY_PORT ?? 8787)}`;
    const results = await Promise.all(targets.map((target) => testTarget(target, baseUrl, internalApiKey, validation.data.prompt)));
    const resolved = results.find((result) => result.status === "ok") as any;
    return Response.json({
      comboName: validation.data.comboName,
      strategy: combo.strategy || "priority",
      resolvedBy: resolved?.model || null,
      resolvedByExecutionKey: resolved?.executionKey || null,
      resolvedByTarget: resolved ? {
        model: resolved.model,
        provider: resolved.provider,
        stepId: resolved.stepId,
        executionKey: resolved.executionKey,
        connectionId: resolved.connectionId,
        label: resolved.label,
      } : null,
      results,
      testedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error testing combo:", error);
    return Response.json({ error: "Failed to test combo" }, { status: 500 });
  }
}
