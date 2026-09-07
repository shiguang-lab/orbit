import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { createErrorResponse, createErrorResponseFromUnknown } from "@orbit/utils/errors/api-response";
import {
  deleteDiscoveryResult,
  getDiscoveryResultById,
  getDiscoveryResults,
} from "../discovery.repository.js";

export async function list(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  try {
    const providerId = new URL(request.url).searchParams.get("providerId") || undefined;
    return Response.json({ results: getDiscoveryResults(providerId) });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to list discovery results");
  }
}

function parseId(raw: string): number | null {
  const id = Number(raw);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export async function get(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const parsedId = parseId(id);
  if (parsedId === null) return createErrorResponse({ status: 400, message: "Invalid discovery result id" });
  try {
    const result = getDiscoveryResultById(parsedId);
    return result
      ? Response.json({ result })
      : createErrorResponse({ status: 404, message: "Discovery result not found" });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to read discovery result");
  }
}

export async function remove(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const parsedId = parseId(id);
  if (parsedId === null) return createErrorResponse({ status: 400, message: "Invalid discovery result id" });
  try {
    return deleteDiscoveryResult(parsedId)
      ? Response.json({ deleted: true, id: parsedId })
      : createErrorResponse({ status: 404, message: "Discovery result not found" });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to delete discovery result");
  }
}

