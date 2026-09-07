/** JobRegistry singleton - survives Next.js HMR via globalThis. */

import { JobRegistry } from "./registry";
import type { JobDefinition } from "./core";

declare global {
  var __orbitJobRegistry: JobRegistry | undefined;
}

export function getJobRegistry(): JobRegistry {
  if (!globalThis.__orbitJobRegistry) {
    globalThis.__orbitJobRegistry = new JobRegistry();
  }
  return globalThis.__orbitJobRegistry;
}

/** Test-only: drop the singleton so each test starts fresh. */
export function __resetJobRegistry(): void {
  globalThis.__orbitJobRegistry = undefined;
}

export type { JobDefinition, JobRecord, HandlerResult, JobRun } from "./core";
