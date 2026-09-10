import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { Worker } from "node:worker_threads";
import type { CompressionResult } from "./types.ts";
import type { StackedCompressionStep } from "./strategySelector.ts";
import type {
  CompressionWorkerJob,
  CompressionWorkerMessage,
  CompressionWorkerOptions,
} from "./compressionWorkerProtocol.ts";

function positiveInteger(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}
/** Relative path (from an ancestor dir) to the compression worker entry. */
const WORKER_JS_REL = join("packages", "inference", "dist", "services", "compression", "compressionWorker.js");
const WORKER_TS_REL = join("packages", "inference", "src", "services", "compression", "compressionWorker.ts");
const MAX_WALK_UP = 8;

/**
 * Walk up from each anchor directory (≤ MAX_WALK_UP levels) and return the first
 * ancestor that actually contains `relPath`, or null.
 *
 * Runtime anchors survive bundlers that rewrite `import.meta.url` to a
 * build-machine path (the bug this guards against — a Worker pointing at a
 * nonexistent absolute path crashes every spawn).
 */
function firstAncestorWith(anchors: string[], relPath: string): string | null {
  for (const anchor of anchors) {
    if (!anchor) continue;
    let dir = resolve(anchor);
    for (let i = 0; i <= MAX_WALK_UP; i++) {
      if (existsSync(join(dir, relPath))) return dir;
      const parent = dirname(dir);
      if (parent === dir) break;
      dir = parent;
    }
  }
  return null;
}

function runtimeAnchors(): string[] {
  const anchors = [process.cwd()];
  const argv1 = process.argv[1];
  if (typeof argv1 === "string" && argv1) anchors.push(dirname(argv1));
  return anchors;
}

function workerUrl(): URL {
  // Primary: the real module location (accurate under tsx and tsc builds).
  try {
    const dir = dirname(fileURLToPath(import.meta.url));
    for (const name of ["compressionWorker.js", "compressionWorker.ts"]) {
      const candidate = join(dir, name);
      if (existsSync(candidate)) return pathToFileURL(candidate);
    }
  } catch {
    // import.meta.url unavailable or rewritten — fall through to anchors.
  }
  // Fallback: walk up from runtime anchors to find the built (.js) then
  // source (.ts) worker entry.
  const anchors = runtimeAnchors();
  const jsRoot = firstAncestorWith(anchors, WORKER_JS_REL);
  if (jsRoot) return pathToFileURL(join(jsRoot, WORKER_JS_REL));
  const tsRoot = firstAncestorWith(anchors, WORKER_TS_REL);
  if (tsRoot) return pathToFileURL(join(tsRoot, WORKER_TS_REL));
  return pathToFileURL(WORKER_JS_REL);
}
function unchanged(body: Record<string, unknown>): CompressionResult {
  return { body, compressed: false, stats: null };
}
interface PendingJob extends CompressionWorkerJob {
  originalBody: Record<string, unknown>;
  resolve: (result: CompressionResult) => void;
  onEngineStep?: (step: StackedCompressionStep) => void;
}
interface PoolWorker {
  worker: Worker;
  job: PendingJob | null;
  timeout: NodeJS.Timeout | null;
  idle: NodeJS.Timeout | null;
}

export class CompressionWorkerPool {
  private readonly queue: PendingJob[] = [];
  private readonly workers = new Set<PoolWorker>();
  private nextId = 1;
  private readonly size: number;
  private readonly timeoutMs: number;
  private readonly idleMs: number;

  constructor({
    size = positiveInteger(process.env.OMNI_COMPRESSION_WORKERS, 2),
    timeoutMs = positiveInteger(process.env.OMNI_COMPRESSION_WORKER_TIMEOUT_MS, 120_000),
    idleMs = positiveInteger(process.env.OMNI_COMPRESSION_WORKER_IDLE_MS, 60_000),
  }: { size?: number; timeoutMs?: number; idleMs?: number } = {}) {
    this.size = Math.max(1, Math.floor(size));
    this.timeoutMs = Math.max(1, Math.floor(timeoutMs));
    this.idleMs = Math.max(1, Math.floor(idleMs));
  }

  run(
    body: Record<string, unknown>,
    mode: CompressionWorkerJob["mode"],
    options?: CompressionWorkerOptions,
    onEngineStep?: (step: StackedCompressionStep) => void
  ): Promise<CompressionResult> {
    return new Promise((resolve) => {
      this.queue.push({
        id: this.nextId++,
        body,
        mode,
        options,
        originalBody: body,
        resolve,
        onEngineStep,
      });
      this.dispatch();
    });
  }
  async close(): Promise<void> {
    for (const job of this.queue.splice(0)) job.resolve(unchanged(job.originalBody));
    await Promise.all([...this.workers].map((slot) => this.remove(slot, true)));
  }
  private spawn(): PoolWorker {
    const slot: PoolWorker = {
      worker: new Worker(workerUrl()),
      job: null,
      timeout: null,
      idle: null,
    };
    this.workers.add(slot);
    slot.worker.on("message", (message: CompressionWorkerMessage) =>
      this.handleMessage(slot, message)
    );
    slot.worker.on("error", () => this.fail(slot));
    slot.worker.on("exit", () => {
      if (this.workers.has(slot)) this.fail(slot);
    });
    return slot;
  }
  private dispatch(): void {
    while (this.queue.length) {
      let slot = [...this.workers].find((candidate) => !candidate.job);
      if (!slot && this.workers.size < this.size) slot = this.spawn();
      if (!slot) return;
      if (slot.idle) clearTimeout(slot.idle);
      const job = this.queue.shift();
      if (!job) return;
      slot.job = job;
      slot.timeout = setTimeout(() => this.fail(slot!), this.timeoutMs);
      slot.timeout.unref();
      const { originalBody: _body, resolve: _resolve, onEngineStep: _step, ...wireJob } = job;
      slot.worker.postMessage(wireJob);
    }
  }
  private handleMessage(slot: PoolWorker, message: CompressionWorkerMessage): void {
    const job = slot.job;
    if (!job || job.id !== message.id) return;
    if (message.type === "step") {
      try {
        job.onEngineStep?.(message.step);
      } catch {
        // Telemetry is best-effort.
      }
      return;
    }
    this.finish(slot, message.type === "result" ? message.result : unchanged(job.originalBody));
  }
  private finish(slot: PoolWorker, result: CompressionResult): void {
    const job = slot.job;
    if (!job) return;
    if (slot.timeout) clearTimeout(slot.timeout);
    slot.timeout = null;
    slot.job = null;
    job.resolve(result);
    slot.idle = setTimeout(() => void this.remove(slot, false), this.idleMs);
    slot.idle.unref();
    this.dispatch();
  }
  private fail(slot: PoolWorker): void {
    const job = slot.job;
    if (job) job.resolve(unchanged(job.originalBody));
    slot.job = null;
    void this.remove(slot, true).finally(() => this.dispatch());
  }
  private async remove(slot: PoolWorker, terminate: boolean): Promise<void> {
    if (!this.workers.delete(slot)) return;
    if (slot.timeout) clearTimeout(slot.timeout);
    if (slot.idle) clearTimeout(slot.idle);
    if (terminate) await slot.worker.terminate().catch(() => undefined);
  }
}

let pool: CompressionWorkerPool | null = null;
export function runCompressionInWorker(
  body: Record<string, unknown>,
  mode: CompressionWorkerJob["mode"],
  options?: CompressionWorkerOptions,
  onEngineStep?: (step: StackedCompressionStep) => void
): Promise<CompressionResult> {
  pool ??= new CompressionWorkerPool();
  return pool.run(body, mode, options, onEngineStep);
}
export async function closeCompressionWorkerPoolForTests(): Promise<void> {
  const active = pool;
  pool = null;
  await active?.close();
}
