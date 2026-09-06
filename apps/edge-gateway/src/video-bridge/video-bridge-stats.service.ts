import { Injectable } from "@nestjs/common";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { getBridgeStats } from "@shiguang-gateway/core-domain/edge/video-bridge-stats";

@Injectable()
export class VideoBridgeStatsService {
  async handle(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    return Response.json(getBridgeStats(), { headers: { "Cache-Control": "no-store" } });
  }
}
