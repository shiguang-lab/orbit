import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { syncSubscription } from "@shiguang-gateway/core-domain/control/proxy-subscriptions";
import { createErrorResponseFromUnknown } from "@shiguang-gateway/core-domain/shared/error-response";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = await context.params;
    return Response.json(await syncSubscription(id));
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to refresh proxy subscription");
  }
}
