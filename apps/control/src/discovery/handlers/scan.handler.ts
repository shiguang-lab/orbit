import { z } from "zod";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { createErrorResponse, createErrorResponseFromUnknown } from "@orbit/utils/errors/api-response";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { persistDiscoveryResult, scanProvider } from "../discovery.scanner.js";

const scanRequestSchema = z.object({ providerId: z.string().min(1).max(200) });

export async function scan(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return createErrorResponse({ status: 400, message: "Invalid request", details: [{ field: "body", message: "Invalid JSON body" }] });
  }
  const validation = validateBody(scanRequestSchema, raw);
  if (isValidationFailure(validation)) {
    return createErrorResponse({ status: 400, message: validation.error.message });
  }
  try {
    const found = await scanProvider(validation.data.providerId);
    return Response.json({ results: found.map(persistDiscoveryResult) });
  } catch (error) {
    return createErrorResponseFromUnknown(error, "Failed to scan provider");
  }
}
