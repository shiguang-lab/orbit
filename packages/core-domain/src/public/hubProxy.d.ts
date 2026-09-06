export interface FleetRunner {
  id: string;
  name: string;
  clis: string[];
  online: boolean;
  draining: boolean;
}
export interface FleetTask {
  id: string;
  status: string;
  mode: string;
  repo: string | null;
  runner: string | null;
  summary: string | null;
  branch: string | null;
  error: string | null;
  updated_at: string | null;
}
export interface FleetSnapshot {
  offline: boolean;
  runners: FleetRunner[];
  tasks: FleetTask[];
}
export interface HubProxyOptions {
  fetchImpl?: typeof fetch;
}
export declare function getFleetSnapshot(opts?: HubProxyOptions): Promise<FleetSnapshot>;
