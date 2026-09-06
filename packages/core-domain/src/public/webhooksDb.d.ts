export type WebhookKind = "slack" | "telegram" | "discord" | "custom";

export interface Webhook {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  enabled: boolean;
  description: string;
  created_at: string;
  last_triggered_at: string | null;
  last_status: number | null;
  failure_count: number;
  kind: WebhookKind;
  metadata_encrypted: string | null;
}

export interface WebhookDelivery {
  id: number;
  webhook_id: string;
  event_type: string;
  status: string;
  http_status: number | null;
  latency_ms: number | null;
  error: string | null;
  created_at: string;
}

export function getWebhooks(options?: {
  limit?: number;
  offset?: number;
}): { webhooks: Webhook[]; total: number };
export function getWebhook(id: string): Webhook | null;
export function createWebhook(data: {
  url: string;
  events?: string[];
  secret?: string;
  description?: string;
  kind?: WebhookKind;
  metadataEncrypted?: string | null;
}): Webhook;
export function updateWebhookRecord(
  id: string,
  data: Partial<{
    url: string;
    events: string[];
    secret: string;
    enabled: boolean;
    description: string;
    kind: WebhookKind;
    metadataEncrypted: string | null;
  }>,
): Webhook | null;
export function deleteWebhook(id: string): boolean;
export function recordWebhookDelivery(id: string, status: number, success: boolean): void;
export function getDeliveries(webhookId: string, limit: number): WebhookDelivery[];
