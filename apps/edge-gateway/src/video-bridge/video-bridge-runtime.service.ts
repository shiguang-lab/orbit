import { Injectable } from "@nestjs/common";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { probeVideoRuntime } from "@orbit/core/guardrails/video-runtime-probe";
import { AUTHZ_HEADER_PEER_LOCALITY } from "@orbit/core/shared/authz-headers";
import { createErrorResponse } from "@orbit/utils/errors/api-response";

@Injectable()
export class VideoBridgeRuntimeService {
  async handle(request: Request): Promise<Response> {
    if (request.headers.get(AUTHZ_HEADER_PEER_LOCALITY) !== "loopback") {
      return createErrorResponse({
        status: 403,
        message: "This endpoint is available only to trusted loopback requests",
      });
    }
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    const status = await probeVideoRuntime();
    return Response.json(status, { headers: { "Cache-Control": "no-store" } });
  }
}
