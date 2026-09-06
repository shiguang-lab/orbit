export interface HeadroomStatus {
  installed: boolean;
  path: string | null;
  running: boolean;
  python: string | null;
  localUrl: boolean;
  canStart: boolean;
}
export interface StartResult {
  pid: number;
  alreadyRunning: boolean;
}
export interface StopResult {
  stopped: boolean;
  pid?: number;
  reason?: string;
}
export class HeadroomError extends Error {
  code: string;
}
export const DEFAULT_HEADROOM_URL: string;
export function isLoopbackHeadroomUrl(url: string): boolean;
export function parsePortFromHeadroomUrl(url: string): number | null;
export function getHeadroomStatus(url: string): Promise<HeadroomStatus>;
export function getManagedPid(): number | null;
export function startHeadroomProxy(options?: { port?: number }): Promise<StartResult>;
export function stopHeadroomProxy(): StopResult;
export function getCachedSettings(): Promise<Record<string, unknown>>;
