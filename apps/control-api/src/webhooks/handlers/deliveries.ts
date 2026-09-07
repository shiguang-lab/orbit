/**
 * API: Webhook Delivery History
 * GET — List recent deliveries for a webhook
 */

import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";
import { getWebhook, getDeliveries } from "@shiguang-gateway/core-domain/db/webhooks";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

export async function GET(request: Request, { params }: { params: { id: string } }) {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const { id } = params;
    const webhook = getWebhook(id);
    if (!webhook) {
      return Response.json({ error: "Webhook not found" }, { status: 404 });
    }

    const url = new URL(request.url);
    const limitParam = url.searchParams.get("limit");
    const limit = Math.min(Math.max(1, parseInt(limitParam ?? "20", 10) || 20), 100);

    const deliveries = getDeliveries(id, limit);
    return Response.json({ deliveries });
  } catch (error: any) {
    return Response.json(
      { error: sanitizeErrorMessage(error) || "Failed to fetch deliveries" },
      { status: 500 }
    );
  }
}
