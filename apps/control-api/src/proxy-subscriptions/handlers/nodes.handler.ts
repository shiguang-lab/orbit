import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getSubscriptionById } from "@shiguang-gateway/core-domain/proxy-subscriptions/management";
import { createErrorResponseFromUnknown } from "@shiguang-gateway/core-domain/shared/error-response";

export async function GET(request: Request, context: { params: { id: string } }): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = context.params;
    const subscription = await getSubscriptionById(id);
    if (!subscription) return Response.json({ error: "Subscription not found" }, { status: 404 });
    return Response.json({
      id: subscription.id,
      name: subscription.name,
      mode: subscription.mode,
      enabled: subscription.enabled,
      status: subscription.status,
      error: subscription.error,
      lastFetchedAt: subscription.lastFetchedAt,
      nodes: subscription.lastNodes ?? [],
    });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to load proxy subscription nodes");
  }
}
