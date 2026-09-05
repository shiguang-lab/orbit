/** JobRegistry singleton - survives Next.js HMR via globalThis. */

import { JobRegistry } from "./registry";
import type { JobDefinition } from "./core";

declare global {
  var __shiguangGatewayJobRegistry: JobRegistry | undefined;
}

export function getJobRegistry(): JobRegistry {
  if (!globalThis.__shiguangGatewayJobRegistry) {
    globalThis.__shiguangGatewayJobRegistry = new JobRegistry();
  }
  return globalThis.__shiguangGatewayJobRegistry;
}

/** Test-only: drop the singleton so each test starts fresh. */
export function __resetJobRegistry(): void {
  globalThis.__shiguangGatewayJobRegistry = undefined;
}

export type { JobDefinition, JobRecord, HandlerResult, JobRun } from "./core";
