import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getSubscriptionById } from "@orbit/core/proxy-subscriptions/management";
import { createErrorResponseFromUnknown } from "@orbit/utils/errors/api-response";

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
