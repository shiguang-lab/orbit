export type ProxySubscriptionMode = "global" | "rule";
export type ProxySubscriptionStatus = "ok" | "error" | "empty";

export interface ProxySubscriptionPayload {
  name: string;
  url: string;
  enabled?: boolean;
  mode?: ProxySubscriptionMode;
  ruleProviders?: string[] | null;
  localCoreEndpoint?: string | null;
  updateIntervalMinutes?: number;
}

export interface ProxySubscriptionRecord {
  id: string;
  name: string;
  url: string;
  enabled: boolean;
  mode: ProxySubscriptionMode;
  ruleProviders: string[] | null;
  localCoreEndpoint: string | null;
  updateIntervalMinutes: number;
  lastFetchedAt: string | null;
  status: ProxySubscriptionStatus;
  error: string | null;
  lastNodes: unknown[] | null;
  lastErrorAt: string | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface SyncResult {
  subscriptionId: string;
  nodes: number;
  needsCore: number;
  boundProxies: number;
  status: ProxySubscriptionStatus;
  error: string | null;
  applied: boolean;
}

interface ParseResult<T> {
  success: true;
  data: T;
}

interface ParseFailure {
  success: false;
  error: { issues: Array<{ message?: string }> };
}

export const proxySubscriptionCreateSchema: {
  safeParse(value: unknown): ParseResult<ProxySubscriptionPayload> | ParseFailure;
};
export const proxySubscriptionUpdateSchema: {
  safeParse(value: unknown): ParseResult<Partial<ProxySubscriptionPayload>> | ParseFailure;
};
export function firstIssueMessage(error: { issues: Array<{ message?: string }> }): string;

export function listSubscriptions(): Promise<ProxySubscriptionRecord[]>;
export function getSubscriptionById(id: string): Promise<ProxySubscriptionRecord | null>;
export function createSubscription(payload: ProxySubscriptionPayload): Promise<ProxySubscriptionRecord>;
export function updateSubscription(id: string, payload: Partial<ProxySubscriptionPayload>): Promise<ProxySubscriptionRecord | null>;
export function deleteSubscription(id: string): Promise<boolean>;
export function syncSubscription(id: string): Promise<SyncResult>;
export function startSubscriptionScheduler(): void;
export function redactSubscriptionUrl(url: string): string;
