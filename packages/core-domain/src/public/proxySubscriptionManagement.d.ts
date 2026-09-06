import type { ZodError, ZodType } from "zod";

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

export interface ProxySubscriptionSyncResult {
  subscriptionId: string;
  nodes: number;
  needsCore: number;
  boundProxies: number;
  status: ProxySubscriptionStatus;
  error: string | null;
  applied: boolean;
}

export const proxySubscriptionCreateSchema: ZodType<ProxySubscriptionPayload>;
export const proxySubscriptionUpdateSchema: ZodType<Partial<ProxySubscriptionPayload>>;
export function firstIssueMessage(error: ZodError): string;
export function listSubscriptions(): Promise<ProxySubscriptionRecord[]>;
export function getSubscriptionById(id: string): Promise<ProxySubscriptionRecord | null>;
export function createSubscription(
  payload: ProxySubscriptionPayload,
): Promise<ProxySubscriptionRecord>;
export function updateSubscription(
  id: string,
  payload: Partial<ProxySubscriptionPayload>,
): Promise<ProxySubscriptionRecord | null>;
export function deleteSubscription(id: string): Promise<boolean>;
export function syncSubscription(id: string): Promise<ProxySubscriptionSyncResult>;
export function redactSubscriptionUrl(url: string): string;
