/**
 * API: Webhook by ID
 * GET    — Get webhook details
 * PUT    — Update webhook
 * DELETE — Delete webhook
 */

import { z } from "zod";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { getWebhook, updateWebhookRecord, deleteWebhook } from "@shiguang-gateway/core-domain/db/local-db";
import { validateBody, isValidationFailure } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { encryptMetadata } from "@shiguang-gateway/core-domain/shared/webhook-dispatcher";
import { isEncryptionEnabled } from "@shiguang-gateway/core-domain/db/encryption";
import { parseAndValidateWebhookUrl } from "@shiguang-gateway/core-domain/network/outbound-url-guard-policy";

import { WEBHOOK_EVENT_VALUES } from "@shiguang-gateway/core-domain/shared/webhook-events";

const WEBHOOK_KINDS = ["slack", "telegram", "discord", "custom"] as const;
const WEBHOOK_EVENT_VALUES_WITH_WILDCARD = ["*", ...WEBHOOK_EVENT_VALUES] as const;

const updateWebhookSchema = z
  .object({
    url: z.string().min(1).max(2000).optional(),
    events: z.array(z.enum(WEBHOOK_EVENT_VALUES_WITH_WILDCARD)).optional(),
    secret: z.string().max(500).optional(),
    description: z.string().max(1000).optional(),
    enabled: z.boolean().optional(),
    kind: z.enum(WEBHOOK_KINDS).optional(),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .strict();

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireManagementAuth(_);
  if (authError) return authError;

  try {
    const { id } = await params;
    const webhook = getWebhook(id);
    if (!webhook) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }
    const masked = {
      ...webhook,
      secret: webhook.secret ? `${webhook.secret.slice(0, 10)}...` : null,
    };
    return Response.json({ webhook: masked });
  } catch (error: any) {
    return Response.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const rawBody = await request.json();
    const validation = validateBody(updateWebhookSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { metadata, ...rest } = validation.data as typeof validation.data & {
      metadata?: Record<string, string>;
    };

    const existingWebhook = getWebhook(id);
    if (!existingWebhook) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }
    const effectiveKind = rest.kind ?? existingWebhook.kind;
    if (effectiveKind === "telegram" && metadata?.botToken && !isEncryptionEnabled()) {
      return Response.json(
        { error: "Telegram webhooks require STORAGE_ENCRYPTION_KEY to be configured" },
        { status: 400 }
      );
    }

    if (rest.url !== undefined && effectiveKind !== "telegram") {
      try {
        parseAndValidateWebhookUrl(rest.url);
      } catch (err: any) {
        return Response.json(
          { error: err?.message || "Blocked private or invalid webhook URL" },
          { status: 400 }
        );
      }
    }

    const updateData: Parameters<typeof updateWebhookRecord>[1] = { ...rest };
    if (metadata !== undefined) {
      (updateData as any).metadataEncrypted = encryptMetadata(metadata);
    }

    const webhook = updateWebhookRecord(id, updateData);
    if (!webhook) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }
    return Response.json({ webhook });
  } catch (error: any) {
    return Response.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const authError = await requireManagementAuth(_);
  if (authError) return authError;

  try {
    const { id } = await params;
    const deleted = deleteWebhook(id);
    if (!deleted) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}
