/**
 * API: Webhooks
 * GET  — List all webhooks
 * POST — Create a new webhook
 */

import { z } from "zod";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { getWebhooks, createWebhook } from "@shiguang-gateway/core-domain/db/local-db";
import { validateBody, isValidationFailure } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { encryptMetadata } from "@shiguang-gateway/core-domain/shared/webhook-dispatcher";
import { isEncryptionEnabled } from "@shiguang-gateway/core-domain/db/encryption";
import { parseAndValidateWebhookUrl } from "@shiguang-gateway/core-domain/network/outbound-url-guard-policy";

import { WEBHOOK_EVENT_VALUES } from "@shiguang-gateway/core-domain/shared/webhook-events";

const WEBHOOK_KINDS = ["slack", "telegram", "discord", "custom"] as const;
const WEBHOOK_EVENT_VALUES_WITH_WILDCARD = ["*", ...WEBHOOK_EVENT_VALUES] as const;

const createWebhookSchema = z
  .object({
    url: z.string().min(1).max(2000),
    events: z.array(z.enum(WEBHOOK_EVENT_VALUES_WITH_WILDCARD)).optional().default(["*"]),
    secret: z.string().max(500).optional(),
    description: z.string().max(1000).optional().default(""),
    kind: z.enum(WEBHOOK_KINDS).optional().default("custom"),
    metadata: z.record(z.string(), z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.kind === "telegram") return;
    try {
      parseAndValidateWebhookUrl(data.url);
    } catch (err: any) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["url"],
        message: err?.message || "Blocked private or invalid webhook URL",
      });
    }
  });

export async function GET(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { searchParams } = new URL(request.url);
    const limit = searchParams.has("limit") ? Number(searchParams.get("limit")) : undefined;
    const offset = searchParams.has("offset") ? Number(searchParams.get("offset")) : 0;
    const result = getWebhooks(limit !== undefined ? { limit, offset } : undefined);
    // Mask secrets in listing
    const masked = result.webhooks.map((w) => ({
      ...w,
      secret: w.secret ? `${w.secret.slice(0, 10)}...` : null,
    }));
    return Response.json({ webhooks: masked, total: result.total });
  } catch (error: any) {
    return Response.json(
      { error: sanitizeErrorMessage(error) || "Failed to list webhooks" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const rawBody = await request.json();
    const validation = validateBody(createWebhookSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { data } = validation;

    if (data.kind === "telegram" && !isEncryptionEnabled()) {
      return Response.json(
        { error: "Telegram webhooks require STORAGE_ENCRYPTION_KEY to be configured" },
        { status: 400 }
      );
    }

    const metadataEncrypted = data.metadata ? encryptMetadata(data.metadata) : undefined;
    const webhook = createWebhook({
      url: data.url,
      events: data.events,
      secret: data.secret,
      description: data.description,
      kind: data.kind,
      metadataEncrypted,
    });

    return Response.json({ webhook }, { status: 201 });
  } catch (error: any) {
    return Response.json(
      { error: sanitizeErrorMessage(error) || "Failed to create webhook" },
      { status: 500 }
    );
  }
}
