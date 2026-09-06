import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import {
  createProviderConnection,
  getProviderConnections,
} from "@shiguang-gateway/core-domain/db/provider-connections";
import {
  getEligibleFreeOnboardingProviders,
  selectUnconfiguredFreeOnboardingProviders,
  setupFreeProviderConnections,
  withFreeProviderSetupLock,
} from "@shiguang-gateway/core-domain/control/free-onboarding";
import { isValidationFailure, validateBody } from "@shiguang-gateway/core-domain/shared/validation/helpers";
import { getCachedCursorAgentAvailability } from "@shiguang-gateway/core-domain/control/cursor-availability";
import { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
import {
  buildProviderHealthAutopilotReport,
  executeProviderHealthAutopilotAction,
} from "@shiguang-gateway/core-domain/control/provider-health-autopilot";

const setupSchema = z.object({
  providerIds: z.array(z.string().trim().min(1)).min(1).max(20),
  confirmed: z.literal(true),
});
const actionSchema = z.object({
  type: z.enum(["clear_provider_breaker", "clear_connection_cooldown", "clear_stale_connection_error", "clear_model_lockout", "reactivate_connection", "deactivate_connection"]),
  target: z.object({ provider: z.string().min(1), connectionId: z.string().min(1).optional(), model: z.string().min(1).optional() }),
  preconditionsHash: z.string().min(8).max(128),
  dryRun: z.boolean().optional(),
  confirm: z.boolean().optional(),
});

@Injectable()
export class ProviderOnboardingService {
  async freeProviders(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    try {
      const candidates = getEligibleFreeOnboardingProviders();
      const connections = await getProviderConnections();
      return Response.json({ providers: selectUnconfiguredFreeOnboardingProviders(candidates, connections) });
    } catch {
      return Response.json({ error: "Failed to load free providers" }, { status: 500 });
    }
  }

  async setupFreeProviders(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    let rawBody: unknown;
    try { rawBody = await request.json(); }
    catch { return Response.json({ error: "Invalid JSON body" }, { status: 400 }); }
    const validation = validateBody(setupSchema, rawBody);
    if (isValidationFailure(validation)) return Response.json({ error: validation.error }, { status: 400 });
    try {
      const result = await withFreeProviderSetupLock(() => setupFreeProviderConnections({
        requestedIds: validation.data.providerIds,
        candidates: getEligibleFreeOnboardingProviders(),
        listExisting: async () => getProviderConnections(),
        create: (input) => createProviderConnection(input),
      }));
      return Response.json(result);
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Ineligible free provider IDs:")) {
        return Response.json({ error: "One or more providers are not eligible" }, { status: 400 });
      }
      return Response.json({ error: "Failed to set up free providers" }, { status: 500 });
    }
  }

  async cursorAgentAvailability(): Promise<Response> {
    try {
      const { available } = await getCachedCursorAgentAvailability();
      return Response.json({ cursorAgentAvailable: available });
    } catch (error) {
      return Response.json({
        cursorAgentAvailable: false,
        error: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
      }, { status: 500 });
    }
  }

  async healthAutopilot(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    try {
      const url = new URL(request.url);
      const bool = (value: string | null, fallback: boolean) => value === null ? fallback : value === "1" || value.toLowerCase() === "true";
      const report = await buildProviderHealthAutopilotReport({ provider: url.searchParams.get("provider"), includeHealthy: bool(url.searchParams.get("includeHealthy"), false), includeActions: bool(url.searchParams.get("includeActions"), true) });
      return Response.json(report);
    } catch (error) {
      console.error("[API] GET /api/providers/health-autopilot error:", error);
      return Response.json({ error: { message: "Failed to build provider health autopilot report" } }, { status: 500 });
    }
  }

  async healthAutopilotAction(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    try {
      let rawBody: unknown;
      try { rawBody = await request.json(); }
      catch { return Response.json({ error: { message: "Invalid JSON body" } }, { status: 400 }); }
      const validation = validateBody(actionSchema, rawBody);
      if (isValidationFailure(validation)) return Response.json({ error: { message: validation.error } }, { status: 400 });
      const result = await executeProviderHealthAutopilotAction(validation.data);
      return Response.json(result.body, { status: result.status });
    } catch (error) {
      console.error("[API] POST /api/providers/health-autopilot/actions error:", error);
      return Response.json({ error: { message: "Failed to apply provider health autopilot action" } }, { status: 500 });
    }
  }
}
