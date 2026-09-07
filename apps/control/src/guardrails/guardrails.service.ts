import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { registerDefaultGuardrails } from "@orbit/core/control/guardrails";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { createErrorResponse } from "@orbit/utils/errors/api-response";
import { validateBody, isValidationFailure } from "@orbit/core/shared/validation/helpers";
import { CORS_HEADERS } from "@orbit/contracts/cors";

const TestRequestSchema = z.object({
  input: z.union([z.string(), z.record(z.string(), z.unknown()), z.array(z.unknown())]),
  disabledGuardrails: z.array(z.string()).optional(),
});

@Injectable()
export class GuardrailsService {
  async list(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    try {
      const guardrails = registerDefaultGuardrails().list().map((guardrail) => ({
        name: guardrail.name,
        enabled: guardrail.enabled,
        priority: guardrail.priority,
      }));
      return Response.json({ guardrails }, { headers: CORS_HEADERS });
    } catch (error) {
      console.error("[API] GET /api/guardrails error:", error);
      return createErrorResponse({ status: 500, message: "Failed to load guardrails", type: "server_error" });
    }
  }

  async test(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return createErrorResponse({ status: 400, message: "Invalid JSON body", type: "invalid_request" });
    }
    const validation = validateBody(TestRequestSchema, rawBody);
    if (isValidationFailure(validation)) {
      return createErrorResponse({
        status: 400,
        message: "Invalid request body — expected { input: string | object | array, disabledGuardrails?: string[] }",
        type: "invalid_request",
      });
    }
    try {
      const outcome = await registerDefaultGuardrails().runPreCallHooks(validation.data.input, {
        disabledGuardrails: validation.data.disabledGuardrails,
      });
      return Response.json(
        { blocked: outcome.blocked, results: outcome.results, payload: outcome.payload },
        { headers: CORS_HEADERS },
      );
    } catch (error) {
      console.error("[API] POST /api/guardrails/test error:", error);
      return createErrorResponse({ status: 500, message: "Failed to test guardrails", type: "server_error" });
    }
  }
}
