import type { EventEmitter } from "node:events";
import type { VersionManagerTool } from "./embeddedServiceStatus.d.ts";

export type ServiceState = "not_installed" | "stopped" | "starting" | "running" | "stopping" | "error";
export type HealthState = "healthy" | "unhealthy" | "unknown";
export interface ServiceStatus {
  tool: string;
  state: ServiceState;
  pid: number | null;
  port: number;
  health: HealthState;
  startedAt: string | null;
  lastError: string | null;
  adopted: boolean;
}
export interface ServiceConfig {
  tool: string;
  port: number;
  spawnArgs(): { command: string; args: string[]; env: NodeJS.ProcessEnv; cwd: string };
  healthUrl(): string;
  healthIntervalMs: number;
  stopTimeoutMs: number;
  logsBufferBytes: number;
  probeBeforeSpawn?: boolean;
}
export class ServiceSupervisor extends EventEmitter {
  constructor(config: ServiceConfig);
  start(): Promise<ServiceStatus>;
  restart(): Promise<ServiceStatus>;
  stop(): Promise<void>;
  getStatus(): ServiceStatus;
  getRingBuffer(): unknown;
}
export function registerSupervisor(supervisor: ServiceSupervisor): void;
export function unregisterSupervisor(tool: string): void;
export function getSupervisor(tool: string): ServiceSupervisor | null;
export function stopAllSupervisors(): Promise<void>;
export function getServiceRow(tool: string): Promise<VersionManagerTool | null>;
export function getVersionManagerStatus(): Promise<VersionManagerTool[]>;
export function getVersionManagerTool(tool: string): Promise<VersionManagerTool | null>;
export function updateServiceField(tool: string, field: string, value: unknown): Promise<VersionManagerTool | null>;
export function updateVersionManagerTool(tool: string, updates: Record<string, unknown>): Promise<VersionManagerTool | null>;
export function getSettings(): Promise<Record<string, unknown>>;
export interface WritableServiceModel {
  id: string;
  [key: string]: unknown;
}
export function saveServiceModels(tool: string, models: WritableServiceModel[]): void;
export function markAllUnavailable(tool: string): void;
export interface ServiceProviderPlugin {
  pluginId: string;
  tool: string;
  port: { envVar: string; default: number };
  healthPath: string;
  healthIntervalMs: number;
  stopTimeoutMs: number;
  logsBufferBytes: number;
  needsApiKey: boolean;
}
export function getServiceProviderPlugin(tool: string): ServiceProviderPlugin | undefined;
