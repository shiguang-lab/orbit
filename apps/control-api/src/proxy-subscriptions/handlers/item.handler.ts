import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  deleteSubscription,
  firstIssueMessage,
  getSubscriptionById,
  proxySubscriptionUpdateSchema,
  redactSubscriptionUrl,
  updateSubscription,
} from "@shiguang-gateway/core-domain/proxy-subscriptions/management";
import { createErrorResponseFromUnknown } from "@shiguang-gateway/core-domain/shared/error-response";

type RouteContext = { params: { id: string } };

export async function GET(request: Request, context: RouteContext): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = context.params;
    const subscription = await getSubscriptionById(id);
    if (!subscription) return Response.json({ error: "Subscription not found" }, { status: 404 });
    return Response.json({ ...subscription, url: redactSubscriptionUrl(subscription.url) });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to load proxy subscription");
  }
}

export async function PATCH(request: Request, context: RouteContext): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = context.params;
    const body = await request.json().catch(() => null);
    const parsed = proxySubscriptionUpdateSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
    const updated = await updateSubscription(id, parsed.data);
    if (!updated) return Response.json({ error: "Subscription not found" }, { status: 404 });
    return Response.json({ ...updated, url: redactSubscriptionUrl(updated.url) });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to update proxy subscription");
  }
}

export async function DELETE(request: Request, context: RouteContext): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = context.params;
    const deleted = await deleteSubscription(id);
    if (!deleted) return Response.json({ error: "Subscription not found" }, { status: 404 });
    return Response.json({ deleted: true });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to delete proxy subscription");
  }
}
