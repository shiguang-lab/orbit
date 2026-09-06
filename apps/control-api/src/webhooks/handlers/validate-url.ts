/**
 * API: Validate Webhook URL
 * POST — Check if a URL is safe to use as a webhook endpoint (SSRF guard)
 */

import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { OutboundUrlGuardError } from "@shiguang-gateway/network-guard";
import { parseAndValidateWebhookUrl } from "@shiguang-gateway/core-domain/network/outbound-url-guard-policy";
import { validateBody, isValidationFailure } from "@shiguang-gateway/core-domain/shared/validation/helpers";

const validateUrlSchema = z.object({
  url: z.string().min(1).max(2000),
});

export async function POST(request: Request) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const validation = validateBody(validateUrlSchema, rawBody);
  if (isValidationFailure(validation)) {
    return Response.json({ error: validation.error }, { status: 400 });
  }

  const { url } = validation.data;

  try {
    parseAndValidateWebhookUrl(url);
    return Response.json({ valid: true });
  } catch (err) {
    if (err instanceof OutboundUrlGuardError) {
      return Response.json({ valid: false, reason: "blocked_private" });
    }
    return Response.json({ valid: false, reason: "invalid_url" });
  }
}
