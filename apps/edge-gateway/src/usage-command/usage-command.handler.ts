import { handleCorsOptions } from "@shiguang-gateway/core-domain/shared/cors";
import { handleInternalUsageCommandHttpRequest } from "@shiguang-gateway/open-sse/services/internalUsageCommand";

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export function GET(request: Request): Promise<Response> {
  return handleInternalUsageCommandHttpRequest(request);
}
