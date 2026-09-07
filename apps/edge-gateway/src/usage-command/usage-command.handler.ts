import { handleCorsOptions } from "@orbit/core/shared/cors";
import { handleInternalUsageCommandHttpRequest } from "@orbit/inference/services/internalUsageCommand";

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export function GET(request: Request): Promise<Response> {
  return handleInternalUsageCommandHttpRequest(request);
}
