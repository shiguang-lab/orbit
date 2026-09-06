/** Singleton registry of ServiceSupervisor instances. */

import type { ServiceSupervisor } from "./ServiceSupervisor.js";

const supervisors = new Map<string, ServiceSupervisor>();

export function registerSupervisor(supervisor: ServiceSupervisor): void {
  supervisors.set(supervisor.getStatus().tool, supervisor);
}

export function getSupervisor(tool: string): ServiceSupervisor | null {
  return supervisors.get(tool) ?? null;
}

/** Remove a supervisor by tool name. Intended for use in tests. */
export function unregisterSupervisor(tool: string): void {
  supervisors.delete(tool);
}

export async function stopAllSupervisors(): Promise<void> {
  // Drive every supervisor stop to completion before the process exits so the
  // DB status writes inside ServiceSupervisor.stop() flush. Otherwise the
  // event loop drains immediately on SIGTERM and rows are stuck in "running"
  // or "starting" until the next boot.
  const active = Array.from(supervisors.values());
  supervisors.clear();
  await Promise.allSettled(active.map((supervisor) => supervisor.stop()));
}
