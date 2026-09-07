import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { syncSubscription } from "@orbit/core/proxy-subscriptions/management";
import { createErrorResponseFromUnknown } from "@orbit/utils/errors/api-response";

export async function POST(request: Request, context: { params: { id: string } }): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const { id } = context.params;
    return Response.json(await syncSubscription(id));
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to refresh proxy subscription");
  }
}
