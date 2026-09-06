import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { createErrorResponse, createErrorResponseFromUnknown } from "@shiguang-gateway/core-domain/shared/error-response";
import { markDiscoveryResultVerified } from "../discovery.repository.js";

export async function verify(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const parsedId = Number(id);
  if (!Number.isInteger(parsedId) || parsedId <= 0) {
    return createErrorResponse({ status: 400, message: "Invalid discovery result id" });
  }
  try {
    const result = markDiscoveryResultVerified(parsedId);
    return result
      ? Response.json({ result })
      : createErrorResponse({ status: 404, message: "Discovery result not found" });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to verify discovery result");
  }
}

