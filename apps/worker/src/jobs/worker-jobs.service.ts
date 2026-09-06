import { Injectable, OnModuleDestroy, OnModuleInit } from "@nestjs/common";
import { WORKER_JOBS } from "./registry.js";
import { startWorkerJobs, stopWorkerJobs } from "./runner.js";
import type { Server } from "node:http";
import { startWorkerJobCommandServer, stopWorkerJobCommandServer } from "./command-server.js";

/** Owns worker job startup and shutdown inside the Nest module graph. */
@Injectable()
export class WorkerJobsService implements OnModuleInit, OnModuleDestroy {
  private keepAlive: NodeJS.Timeout | null = null;
  private started: string[] = [];
  private commandServer: Server | null = null;

  async onModuleInit(): Promise<void> {
    const log = (...args: unknown[]) => console.log("[worker]", ...args);
    this.started = await startWorkerJobs(WORKER_JOBS, log);
    log(`started: ${this.started.join(", ") || "none"}`);
    this.commandServer = await startWorkerJobCommandServer();

    // A standalone application context has no listening socket. Keep the
    // process alive while the worker-owned schedulers are running.
    this.keepAlive = setInterval(() => undefined, 60_000);
  }

  async onModuleDestroy(): Promise<void> {
    if (this.commandServer) {
      await stopWorkerJobCommandServer(this.commandServer);
      this.commandServer = null;
    }
    if (this.keepAlive) {
      clearInterval(this.keepAlive);
      this.keepAlive = null;
    }
    await stopWorkerJobs(WORKER_JOBS, this.started, (...args) => console.log("[worker]", ...args));
    console.log("[worker] stopped");
  }
}
