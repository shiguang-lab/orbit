import { Injectable } from "@nestjs/common";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { probeVideoRuntime } from "@shiguang-gateway/core-domain/guardrails/video-runtime-probe";
import { AUTHZ_HEADER_PEER_LOCALITY } from "@shiguang-gateway/core-domain/shared/authz-headers";
import { createErrorResponse } from "@shiguang-gateway/core-domain/shared/error-response";

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
