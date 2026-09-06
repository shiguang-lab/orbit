import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  createSubscription,
  firstIssueMessage,
  listSubscriptions,
  proxySubscriptionCreateSchema,
  redactSubscriptionUrl,
  startSubscriptionScheduler,
} from "@shiguang-gateway/core-domain/control/proxy-subscriptions";
import { createErrorResponseFromUnknown } from "@shiguang-gateway/core-domain/shared/error-response";

export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    startSubscriptionScheduler();
    const items = await listSubscriptions();
    return Response.json({ items: items.map((item) => ({ ...item, url: redactSubscriptionUrl(item.url) })) });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to list proxy subscriptions");
  }
}

export async function POST(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const body = await request.json().catch(() => null);
    const parsed = proxySubscriptionCreateSchema.safeParse(body);
    if (!parsed.success) return Response.json({ error: firstIssueMessage(parsed.error) }, { status: 400 });
    const created = await createSubscription(parsed.data);
    return Response.json({ ...created, url: redactSubscriptionUrl(created.url) }, { status: 201 });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to create proxy subscription");
  }
}
