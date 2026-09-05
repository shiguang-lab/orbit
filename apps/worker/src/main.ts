import { ensureSecrets } from "@shiguang-gateway/core-domain/startup";
import { WORKER_JOBS } from "./jobs/registry.js";
import { startWorkerJobs } from "./jobs/runner.js";

await ensureSecrets();
process.env.SHIGUANG_GATEWAY_BASE_URL ??= process.env.INTERNAL_BASE_URL ??
  `http://${process.env.EDGE_GATEWAY_HOST === "0.0.0.0" ? "127.0.0.1" : (process.env.EDGE_GATEWAY_HOST ?? "127.0.0.1")}:${process.env.EDGE_GATEWAY_PORT ?? "8787"}`;
const log = (...args: unknown[]) => console.log("[worker]", ...args);
const started = await startWorkerJobs(WORKER_JOBS, log);
log(`started: ${started.join(", ") || "none"}`);

await new Promise<void>((resolve) => {
  const keepAlive = setInterval(() => undefined, 60_000);
  const stop = () => {
    clearInterval(keepAlive);
    resolve();
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
});
