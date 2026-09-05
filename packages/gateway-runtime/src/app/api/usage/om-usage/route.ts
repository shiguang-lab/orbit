import { handleCorsOptions } from "../../../../shared/utils/cors.ts";
import { handleInternalUsageCommandHttpRequest } from "../../../../lib/usage/internalUsageCommand.ts";

export async function OPTIONS() {
  return handleCorsOptions();
}

/**
 * GET /api/usage/om-usage
 *
 * Terminal-friendly equivalent of @@om-usage. Authenticates with the same
 * ShiguangGateway API key used by Claude Code/Codex and requires allowUsageCommand.
 */
export async function GET(request: Request) {
  return handleInternalUsageCommandHttpRequest(request);
}
