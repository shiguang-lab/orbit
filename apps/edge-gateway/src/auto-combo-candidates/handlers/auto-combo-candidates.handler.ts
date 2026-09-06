import { z } from "zod";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import {
  getAutoComboCandidates,
  isUnknownAutoChannelError,
} from "@shiguang-gateway/open-sse/handlers/autoComboCandidates";
import { getApiKeyRequestScope } from "../../common/api-key-scope.js";
import { CORS_HEADERS, handleCorsOptions } from "../../common/cors.js";

const channelParamSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[a-zA-Z0-9:_-]+$/, "channel must be a simple auto/* suffix");

type RouteParams = { params: { channel: string } };

export function OPTIONS(): Response {
  return handleCorsOptions();
}

export async function GET(request: Request, { params }: RouteParams): Promise<Response> {
  const scope = await getApiKeyRequestScope(request);
  if (scope.rejection) return scope.rejection;

  const parsedChannel = channelParamSchema.safeParse(params.channel);
  if (!parsedChannel.success) {
    return Response.json(buildErrorBody(400, "Invalid auto channel"), {
      status: 400,
      headers: CORS_HEADERS,
    });
  }

  try {
    const result = await getAutoComboCandidates(parsedChannel.data, scope.apiKeyId);
    return Response.json(result, { headers: CORS_HEADERS });
  } catch (error) {
    if (isUnknownAutoChannelError(error)) {
      return Response.json(buildErrorBody(404, "Unknown auto channel"), {
        status: 404,
        headers: CORS_HEADERS,
      });
    }
    return Response.json(
      buildErrorBody(500, error instanceof Error ? error.message : "Failed to list candidates"),
      { status: 500, headers: CORS_HEADERS },
    );
  }
}
