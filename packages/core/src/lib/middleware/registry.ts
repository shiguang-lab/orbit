/**
 * Pre-request Hook Registry
 *
 * Stateless executor for persisted pre-request middleware hooks.
 *
 * Hooks execute in priority order (lower = first) BEFORE provider
 * selection and combo routing. They can:
 *   - Mutate the request body/headers
 *   - Redirect to a different model/combo
 *   - Short-circuit with a custom response
 *   - Skip remaining hooks
 */

import { randomUUID } from "node:crypto";
import * as vm from "vm";

import {
  type HookMiddleware,
  type PreRequestHookContext,
  type HookResult,
} from "./types.js";
import {
  getEnabledMiddlewareHooks,
  insertHookLog,
  recordHookExecution,
} from "../db/middleware.js";

// ── Compile hook code into middleware function ────────────────────────────

/**
 * Max wall-clock time a single operator-authored hook may run.
 * Synchronous runaway loops are cut off by the `vm` timeout; async work that
 * never settles is cut off by the Promise.race guard below.
 */
const HOOK_EXECUTION_TIMEOUT_MS = 5000;

/**
 * Build the minimal, capability-free context object exposed to hook code.
 *
 * TRUST MODEL: Node's `vm` is NOT a hard security boundary (it shares the host
 * V8 heap and prototype-chain escapes exist). Its purpose here is to remove
 * *ambient* authority — hook code compiled from `HookConfig.code` must not see
 * `process`, `require`, `global`/`globalThis`, `fetch`, `Buffer`, timers, or
 * the module scope. Only the request `context` and pure/deterministic globals
 * are reachable, so a hook cannot read `process.env`, spawn processes, open
 * sockets, or `require()` arbitrary modules. Combined with the operator-only
 * write path (hooks are authored locally), this closes the `new Function()`
 * ambient-authority exposure (Hard Rule #3 / SonarCloud S1523).
 */
function createHookSandbox(context: PreRequestHookContext): Record<string, unknown> {
  return {
    context,
    // Pure / deterministic globals only — no I/O, no ambient authority.
    JSON,
    Math,
    Date,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Error,
    TypeError,
    RangeError,
    SyntaxError,
    URIError,
    Map,
    Set,
    WeakMap,
    WeakSet,
    Symbol,
    Promise,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
    URL,
    URLSearchParams,
    // Deliberately absent: process, require, module, exports, global,
    // globalThis, fetch, Buffer, setTimeout/setInterval, __dirname, __filename.
  };
}

function compileHookCode(code: string, hookName: string): HookMiddleware {
  // Parse persisted source into an isolated script for this request.
  let script: vm.Script;
  try {
    script = new vm.Script(`(async () => { ${code} })();`, {
      filename: `orbit-hook:${hookName}`,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Compilation error";
    throw new Error(`Failed to compile hook "${hookName}": ${message}`);
  }

  return async (context: PreRequestHookContext): Promise<HookResult> => {
    const sandbox = createHookSandbox(context);
    const vmContext = vm.createContext(sandbox, {
      codeGeneration: { strings: false, wasm: false },
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      // The `vm` timeout only interrupts *synchronous* runaway code; the
      // Promise.race below bounds async work that never settles.
      const execution: unknown = script.runInContext(vmContext, {
        timeout: HOOK_EXECUTION_TIMEOUT_MS,
      });

      const timeoutGuard = new Promise<never>((_resolve, reject) => {
        timer = setTimeout(() => {
          reject(
            new Error(`Hook "${hookName}" timed out after ${HOOK_EXECUTION_TIMEOUT_MS}ms`)
          );
        }, HOOK_EXECUTION_TIMEOUT_MS);
      });

      const result = await Promise.race([Promise.resolve(execution), timeoutGuard]);
      return (result ?? {}) as HookResult;
    } catch (err: unknown) {
      // Errors thrown from inside the vm context use the context's own
      // constructors, so they are not `instanceof` the host Error. Normalize
      // to a host Error carrying a readable message so callers/observability
      // classify it correctly.
      const message =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err !== null && "message" in err
            ? String((err as { message: unknown }).message)
            : String(err);
      throw new Error(message);
    } finally {
      if (timer) clearTimeout(timer);
    }
  };
}

// ── Default context factory ──────────────────────────────────────────────

export function createHookContext(params: {
  body: Record<string, unknown>;
  headers: Record<string, string | string[] | undefined>;
  model: string;
  combo?: string;
  apiKeyInfo?: Record<string, unknown>;
  log?: any;
}): PreRequestHookContext {
  const logger = params.log || console;
  return {
    body: { ...params.body },
    headers: { ...params.headers },
    model: params.model,
    combo: params.combo,
    apiKeyInfo: params.apiKeyInfo ? { ...params.apiKeyInfo } : undefined,
    metadata: {},
    log: {
      info: (tag: string, msg: string) => logger.info?.(tag, msg) ?? console.log(`[${tag}] ${msg}`),
      warn: (tag: string, msg: string) =>
        logger.warn?.(tag, msg) ?? console.warn(`[${tag}] ${msg}`),
      error: (tag: string, msg: string) =>
        logger.error?.(tag, msg) ?? console.error(`[${tag}] ${msg}`),
    },
  };
}

/**
 * Execute the enabled hooks read from shared storage for this request.
 * Returns the final context with all mutations applied.
 *
 * If any hook short-circuits, returns { response } immediately
 * and stops processing.
 */
export async function runHooks(
  context: PreRequestHookContext,
  comboId?: string
): Promise<{
  context: PreRequestHookContext;
  response?: { status: number; body: Record<string, unknown> };
}> {
  const hooks = getEnabledMiddlewareHooks()
    .filter(
      (h) =>
        h.scope.type === "global" ||
        (h.scope.type === "combo" && comboId !== undefined && h.scope.comboId === comboId)
    )
    .sort((a, b) => a.priority - b.priority);

  for (const hook of hooks) {
    const startTime = Date.now();
    let result: HookResult;
    try {
      const middleware = compileHookCode(hook.code, hook.name);
      result = await middleware(context);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      recordHookExecution(hook.name, message);
      insertHookLog({
        id: randomUUID(),
        hookName: hook.name,
        requestId: randomUUID(),
        durationMs: Date.now() - startTime,
        mutated: false,
        skipped: false,
        error: message,
        timestamp: new Date().toISOString(),
      });

      console.error(`[Middleware] Hook "${hook.name}" failed:`, message);
      continue;
    }

    if (result.body) {
      context.body = { ...context.body, ...result.body };
    }
    if (result.headers) {
      context.headers = { ...context.headers, ...result.headers };
    }
    if (result.model) {
      context.model = result.model;
    }
    if (result.combo) {
      context.combo = result.combo;
    }

    recordHookExecution(hook.name);
    insertHookLog({
      id: randomUUID(),
      hookName: hook.name,
      requestId: randomUUID(),
      durationMs: Date.now() - startTime,
      mutated: !!(result.body || result.headers || result.model || result.combo),
      skipped: !!result.skipRemaining,
      timestamp: new Date().toISOString(),
    });

    if (result.response) {
      return { context, response: result.response };
    }
    if (result.skipRemaining) {
      break;
    }
  }

  return { context };
}
