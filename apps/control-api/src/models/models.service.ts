import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getSettings } from "@shiguang-gateway/core-domain/db/settings";
import { setModelIsHidden } from "@shiguang-gateway/core-domain/db/hidden-models";
import { isFreeModel, providerHasFreeModels } from "@shiguang-gateway/core-domain/catalog/free-models";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import * as log from "@shiguang-gateway/core-domain/sse/logger";
import {
  DEFAULT_MODEL_TEST_TIMEOUT_MS,
  runSingleModelTest,
  type SingleModelTestResult,
} from "./model-test.runner.js";

const NVIDIA_SINGLE_TEST_TIMEOUT_MS = 180_000;
const CONSECUTIVE_RATE_LIMIT_STOP_THRESHOLD = 3;
const SLOW_PROBE_PROVIDERS = new Set(["lmarena", "lma"]);
const SLOW_PROBE_DELAY_MS = 3500;
const CONSECUTIVE_BOT_STOP_THRESHOLD = 2;
const testModelSchema = z.object({
  providerId: z.string().min(1),
  modelId: z.string().min(1),
  connectionId: z.string().min(1).optional(),
});
const testAllSchema = z.object({
  providerId: z.string().min(1),
  modelIds: z.array(z.string().min(1)).min(1).max(100),
  connectionId: z.string().optional(),
  respectRateLimit: z.boolean().optional().default(true),
  autoHideFailed: z.boolean().optional().default(false),
});

type BatchTestResultEntry = {
  status: "ok" | "error" | "slow";
  latencyMs: number;
  responseText?: string;
  error?: string;
  statusCode?: number;
  rateLimited?: boolean;
  isTransient?: boolean;
  isQuota?: boolean;
  hidden?: boolean;
  isTimeout?: boolean;
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toBatchEntry(result: SingleModelTestResult): BatchTestResultEntry {
  const entry: BatchTestResultEntry = {
    status: result.status === "ok" ? "ok" : result.status === "slow" ? "slow" : "error",
    latencyMs: result.latencyMs,
  };
  if (result.responseText !== undefined) entry.responseText = result.responseText;
  if (result.error !== undefined) entry.error = result.error;
  if (result.statusCode !== undefined) entry.statusCode = result.statusCode;
  if (result.rateLimited === true) entry.rateLimited = true;
  if (result.isTransient === true) entry.isTransient = true;
  if (result.isQuota === true) entry.isQuota = true;
  if (result.isTimeout === true) entry.isTimeout = true;
  return entry;
}

@Injectable()
export class ModelsService {
  async handleTest(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return json({ status: "error", error: "Invalid JSON body" }, 400);
    }

    const validation = testModelSchema.safeParse(rawBody);
    if (!validation.success) {
      const detail = validation.error.issues.map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`).join("; ");
      return json({ status: "error", error: `Invalid request: ${detail}` }, 400);
    }
    const { providerId, modelId, connectionId } = validation.data;

    let hidePaid = false;
    try {
      hidePaid = (await getSettings())?.hidePaidModels === true;
    } catch {}
    if (hidePaid && !(providerHasFreeModels(providerId) && isFreeModel(providerId, { id: modelId }))) {
      return json({ status: "error", error: "Paid model blocked while hidePaidModels is enabled" }, 403);
    }

    try {
      const result = await runSingleModelTest({
        providerId,
        modelId,
        ...(connectionId ? { connectionId } : {}),
        timeoutMs: providerId.toLowerCase() === "nvidia" ? NVIDIA_SINGLE_TEST_TIMEOUT_MS : DEFAULT_MODEL_TEST_TIMEOUT_MS,
        streamChat: true,
      });
      if (result.status === "ok") {
        return json({ status: "ok", latencyMs: result.latencyMs, responseText: result.responseText });
      }
      const responseBody: Record<string, unknown> = {
        status: "error",
        latencyMs: result.latencyMs,
        error: result.error || "Unknown error",
      };
      if (result.statusCode !== undefined) responseBody.statusCode = result.statusCode;
      if (result.rateLimited) responseBody.rateLimited = true;
      if (result.retryAfter !== undefined) responseBody.retryAfter = result.retryAfter;
      return json(responseBody, result.httpStatus === 401 ? 502 : result.httpStatus);
    } catch (error: unknown) {
      return json({ status: "error", error: sanitizeErrorMessage(error) || "Unknown error" }, 500);
    }
  }

  async handleTestAll(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return json({ error: { message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] } }, 400);
    }
    const validation = testAllSchema.safeParse(rawBody);
    if (!validation.success) return json({ error: validation.error.format() }, 400);
    const { providerId, modelIds, connectionId, respectRateLimit, autoHideFailed } = validation.data;

    let hidePaid = false;
    try {
      hidePaid = (await getSettings())?.hidePaidModels === true;
    } catch {}
    log.info("MODEL_TEST_ALL", `Starting batch test for ${modelIds.length} model(s) on provider ${providerId}`, {
      providerId, modelCount: modelIds.length, hasConnection: Boolean(connectionId), respectRateLimit, autoHideFailed,
    });

    const results: Record<string, BatchTestResultEntry> = {};
    let consecutiveRateLimits = 0;
    let consecutiveBotBlocks = 0;
    let stoppedEarly = false;
    let stopReason: "consecutive_rate_limits" | "consecutive_bot_blocks" | undefined;
    const slowProbe = SLOW_PROBE_PROVIDERS.has(providerId);
    let testedUpstream = 0;

    for (const modelId of modelIds) {
      if (hidePaid && !(providerHasFreeModels(providerId) && isFreeModel(providerId, { id: modelId }))) {
        results[modelId] = { status: "error", latencyMs: 0, error: "Skipped: paid model with hidePaidModels enabled" };
        continue;
      }
      let entry: BatchTestResultEntry;
      try {
        if (slowProbe && testedUpstream > 0) await sleep(SLOW_PROBE_DELAY_MS);
        const effectiveConnectionId = connectionId && respectRateLimit ? connectionId : undefined;
        entry = toBatchEntry(await runSingleModelTest({
          providerId,
          modelId,
          ...(effectiveConnectionId ? { connectionId: effectiveConnectionId } : {}),
          timeoutMs: DEFAULT_MODEL_TEST_TIMEOUT_MS,
          streamChat: true,
        }));
        testedUpstream += 1;
      } catch (error: unknown) {
        log.error("MODEL_TEST_ALL", `Unexpected error testing model ${modelId}`, { providerId, modelId, error: sanitizeErrorMessage(error) });
        entry = { status: "error", latencyMs: 0, error: sanitizeErrorMessage(error) || "Unknown error" };
      }

      consecutiveRateLimits = entry.rateLimited ? consecutiveRateLimits + 1 : 0;
      const botBlocked = !entry.isQuota && (entry.statusCode === 403 || (typeof entry.error === "string" && /cloudflare|bot management|recaptcha|cf-chl|just a moment/i.test(entry.error)));
      consecutiveBotBlocks = botBlocked ? consecutiveBotBlocks + 1 : entry.status === "ok" ? 0 : consecutiveBotBlocks;

      if (autoHideFailed && entry.status === "error" && !entry.rateLimited && !entry.isTimeout && !entry.isTransient && !entry.isQuota) {
        try {
          setModelIsHidden(providerId, modelId, true);
          entry.hidden = true;
        } catch (error: unknown) {
          log.error("MODEL_TEST_ALL", `Failed to auto-hide model ${modelId}`, { providerId, modelId, error: sanitizeErrorMessage(error) });
        }
      }
      results[modelId] = entry;
      if (consecutiveRateLimits >= CONSECUTIVE_RATE_LIMIT_STOP_THRESHOLD) {
        stoppedEarly = true;
        stopReason = "consecutive_rate_limits";
        break;
      }
      if (slowProbe && consecutiveBotBlocks >= CONSECUTIVE_BOT_STOP_THRESHOLD) {
        stoppedEarly = true;
        stopReason = "consecutive_bot_blocks";
        break;
      }
    }
    log.info("MODEL_TEST_ALL", `Batch test complete: ${Object.keys(results).length}/${modelIds.length} model(s)`, { providerId, tested: Object.keys(results).length, total: modelIds.length, stoppedEarly });
    return json({ results, ...(stoppedEarly && stopReason ? { stoppedEarly: true, stopReason } : {}) });
  }
}
