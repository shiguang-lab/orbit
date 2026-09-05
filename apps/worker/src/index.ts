import { ensureSecrets } from "@shiguang-gateway/core-domain/startup";
import { WORKER_JOBS } from "./jobs/registry.js";
import { startWorkerJobs } from "./jobs/runner.js";

await ensureSecrets();
// Worker jobs that call the local control plane must never fall back to the
// retired official/NAS endpoint. Compose sets this explicitly; the local
// default keeps a standalone `pnpm start:worker` self-contained as well.
process.env.SHIGUANG_GATEWAY_BASE_URL ??= process.env.INTERNAL_BASE_URL ??
  `http://${process.env.EDGE_GATEWAY_HOST === "0.0.0.0" ? "127.0.0.1" : (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1")}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;
const log = (...args: unknown[]) => console.log("[worker]", ...args);
const started = await startWorkerJobs(WORKER_JOBS, log);
log(`started: ${started.join(", ") || "none"}`);
await new Promise<void>((resolve) => {
  // Keep the worker alive even when every optional scheduler is disabled or
  // exits early. This also gives SIGTERM a deterministic shutdown path.
  const keepAlive = setInterval(() => undefined, 60_000);
  const stop = () => {
    clearInterval(keepAlive);
    resolve();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
});
