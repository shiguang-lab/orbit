/**
 * Server-owned tool loop state machine.
 *
 * Chat Completions / Messages callers hand Orbit a request whose tools include
 * server-owned builtins or registered skills. When such a tool is the *only* thing
 * blocking an answer, the upstream response is not a usable final answer — it is an
 * intermediate step. Instead of returning that intermediate step with the tool result
 * merely appended, this loop executes the server-owned calls and resumes the same
 * provider connection with the accumulated transcript until the model produces a final
 * answer.
 *
 * The module is transport-agnostic: upstream execution and follow-up legs are injected,
 * so `packages/inference` owns the credential/connection concerns while the loop owns the
 * classification, byte budgeting, bounded rounds and usage accounting.
 */

import {
  buildFollowUpSourceBody,
  serializeBoundedToolResult,
  MAX_RESULT_BYTES_PER_TOOL,
  MAX_RESULT_BYTES_TOTAL,
  type FollowUpToolCall,
} from "./followUpTranscript";
import {
  classifyServerOwnedCalls,
  extractToolCalls,
  formatEscapeHatchResponse,
  type ExecutionContext,
} from "./interception";

export const MAX_FOLLOW_UPS = 3;
export const LOOP_BUDGET_MS = 120_000;
export const MIN_REMAINING_FOR_FOLLOW_UP_MS = 10_000;

export type ToolLoopUsage = Record<string, unknown> | null;

export type ToolLoopExecutedResult = {
  id: string;
  name: string;
  result: unknown;
};

export type ToolLoopFollowUpOk = {
  kind: "ok";
  response: Record<string, unknown>;
  usage?: ToolLoopUsage;
  /**
   * Connection the follow-up was served on. The loop rejects a follow-up that drifted to a
   * different connection: the resumed turn must stay on the connection that produced the
   * tool call so lease/quota accounting and account affinity stay coherent.
   */
  connectionId?: string | null;
};

export type ToolLoopFollowUpError = {
  kind: "error";
  message: string;
  status: number;
  usage?: ToolLoopUsage;
};

export type ToolLoopFollowUpResult = ToolLoopFollowUpOk | ToolLoopFollowUpError;

export type ServerOwnedToolLoopTermination =
  | "completed"
  | "client_tools"
  | "mixed_tools"
  | "max_followups"
  | "tool_output_budget"
  | "deadline"
  | "client_abort"
  | "provider_error"
  | "connection_mismatch"
  | "execution_error";

export type ServerOwnedToolLoopOptions = {
  initialResponse: Record<string, unknown>;
  initialUsage?: ToolLoopUsage;
  /** Connection that produced the initial leg; follow-ups must match it when provided. */
  initialConnectionId?: string | null;
  sourceBody: Record<string, unknown>;
  sourceFormat: "openai" | "claude";
  executionContext: ExecutionContext;
  executeServerOwned: (
    calls: FollowUpToolCall[],
    context: ExecutionContext
  ) => Promise<ToolLoopExecutedResult[]>;
  resumeUpstream: (
    nextSourceBody: Record<string, unknown>,
    expectedConnectionId: string | null | undefined
  ) => Promise<ToolLoopFollowUpResult>;
  abortSignal?: AbortSignal;
  deadlineAtMs: number;
  now?: () => number;
  maxFollowUps?: number;
  maxResultBytes?: number;
  maxTotalResultBytes?: number;
};

export type ServerOwnedToolLoopResult = {
  kind: "ok" | "error";
  response?: Record<string, unknown>;
  error?: { message: string; status: number };
  cumulativeUsage: Record<string, number> | null;
  followUps: number;
  termination: ServerOwnedToolLoopTermination;
};

function numericUsage(usage: ToolLoopUsage): Record<string, number> | null {
  if (!usage || typeof usage !== "object") return null;
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(usage)) {
    if (typeof value === "number" && Number.isFinite(value)) out[key] = value;
  }
  return Object.keys(out).length > 0 ? out : null;
}

/**
 * Sum additive token/cost fields across provider legs. `total_tokens` is recomputed from the
 * prompt/completion totals rather than summed so a leg that omits it still yields a coherent
 * grand total. Returns null when every leg reported no usage.
 */
export function aggregateToolLoopUsage(
  usages: Array<ToolLoopUsage>
): Record<string, number> | null {
  const merged: Record<string, number> = {};
  let sawAny = false;
  for (const usage of usages) {
    const numeric = numericUsage(usage);
    if (!numeric) continue;
    sawAny = true;
    for (const [key, value] of Object.entries(numeric)) {
      if (key === "total_tokens") continue;
      merged[key] = (merged[key] ?? 0) + value;
    }
  }
  if (!sawAny) return null;
  if (merged.prompt_tokens !== undefined || merged.completion_tokens !== undefined) {
    merged.total_tokens = (merged.prompt_tokens ?? 0) + (merged.completion_tokens ?? 0);
  }
  return merged;
}

function abortResult(
  usages: Array<ToolLoopUsage>,
  followUps: number
): ServerOwnedToolLoopResult {
  return {
    kind: "error",
    error: { message: "Client closed request", status: 499 },
    cumulativeUsage: aggregateToolLoopUsage(usages),
    followUps,
    termination: "client_abort",
  };
}

export async function runServerOwnedToolLoop(
  options: ServerOwnedToolLoopOptions
): Promise<ServerOwnedToolLoopResult> {
  const now = options.now ?? Date.now;
  const loopDeadlineAtMs = Math.min(options.deadlineAtMs, now() + LOOP_BUDGET_MS);
  const maxFollowUps = options.maxFollowUps ?? MAX_FOLLOW_UPS;
  const maxResultBytes = options.maxResultBytes ?? MAX_RESULT_BYTES_PER_TOOL;
  const maxTotalResultBytes = options.maxTotalResultBytes ?? MAX_RESULT_BYTES_TOTAL;

  let currentSourceBody = options.sourceBody;
  let currentResponse = options.initialResponse;
  let cumulativeOutputBytes = 0;
  let followUps = 0;
  const usages: Array<ToolLoopUsage> = [options.initialUsage ?? null];

  const finishOk = (
    response: Record<string, unknown>,
    termination: ServerOwnedToolLoopTermination
  ): ServerOwnedToolLoopResult => ({
    kind: "ok",
    response,
    cumulativeUsage: aggregateToolLoopUsage(usages),
    followUps,
    termination,
  });

  while (true) {
    const toolCalls = extractToolCalls(currentResponse, options.sourceFormat);
    const { serverOwned, clientNative } = await classifyServerOwnedCalls(
      toolCalls,
      options.executionContext
    );

    if (serverOwned.length === 0) {
      return finishOk(currentResponse, clientNative.length > 0 ? "client_tools" : "completed");
    }

    if (options.abortSignal?.aborted) return abortResult(usages, followUps);

    let execResults: ToolLoopExecutedResult[];
    try {
      execResults = await options.executeServerOwned(serverOwned, options.executionContext);
    } catch (err) {
      return {
        kind: "error",
        error: {
          message: err instanceof Error ? err.message : "Server tool execution failed",
          status: 500,
        },
        cumulativeUsage: aggregateToolLoopUsage(usages),
        followUps,
        termination: "execution_error",
      };
    }

    const serializedById = new Map<string, string>();
    let remainingBytes = maxTotalResultBytes - cumulativeOutputBytes;
    if (remainingBytes < 0) remainingBytes = 0;
    let anyTruncated = false;
    for (const result of execResults) {
      const bounded = serializeBoundedToolResult(
        result.result,
        Math.min(maxResultBytes, remainingBytes)
      );
      serializedById.set(result.id, bounded.text);
      const bytes = Buffer.byteLength(bounded.text, "utf8");
      cumulativeOutputBytes += bytes;
      remainingBytes -= bytes;
      if (bounded.truncated) anyTruncated = true;
    }

    const escapeHatch = () =>
      formatEscapeHatchResponse(
        currentResponse,
        serverOwned,
        execResults,
        clientNative,
        options.sourceFormat,
        serializedById
      );

    // Mixed ownership: the client still has to run its own tools, so Orbit cannot claim the
    // turn. Execute the server-owned subset and hand back a combined response.
    if (clientNative.length > 0) {
      return finishOk(escapeHatch(), "mixed_tools");
    }

    if (anyTruncated || cumulativeOutputBytes >= maxTotalResultBytes) {
      return finishOk(escapeHatch(), "tool_output_budget");
    }

    if (followUps >= maxFollowUps) {
      return finishOk(escapeHatch(), "max_followups");
    }

    if (loopDeadlineAtMs - now() < MIN_REMAINING_FOR_FOLLOW_UP_MS) {
      return finishOk(escapeHatch(), "deadline");
    }

    if (options.abortSignal?.aborted) return abortResult(usages, followUps);

    const nextSourceBody = buildFollowUpSourceBody({
      sourceBody: currentSourceBody,
      previousResponse: currentResponse,
      toolCalls: serverOwned as FollowUpToolCall[],
      results: execResults,
      sourceFormat: options.sourceFormat,
      maxResultBytes,
      maxTotalResultBytes: maxTotalResultBytes - cumulativeOutputBytes,
    });

    const nextLeg = await options.resumeUpstream(nextSourceBody, options.initialConnectionId);
    usages.push(nextLeg.usage ?? null);

    if (nextLeg.kind === "error") {
      return {
        kind: "error",
        error: { message: nextLeg.message, status: nextLeg.status },
        cumulativeUsage: aggregateToolLoopUsage(usages),
        followUps: followUps + 1,
        termination: "provider_error",
      };
    }

    if (
      options.initialConnectionId &&
      nextLeg.connectionId &&
      nextLeg.connectionId !== options.initialConnectionId
    ) {
      return {
        kind: "error",
        error: {
          message: "Follow-up connection does not match the initial connection",
          status: 409,
        },
        cumulativeUsage: aggregateToolLoopUsage(usages),
        followUps: followUps + 1,
        termination: "connection_mismatch",
      };
    }

    currentSourceBody = nextSourceBody;
    currentResponse = nextLeg.response;
    followUps += 1;
  }
}
