import { Injectable } from "@nestjs/common";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getBridgeStats } from "@orbit/core/guardrails/modality-bridge-stats";

@Injectable()
export class VideoBridgeStatsService {
  async handle(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    return Response.json(getBridgeStats(), { headers: { "Cache-Control": "no-store" } });
  }
}
