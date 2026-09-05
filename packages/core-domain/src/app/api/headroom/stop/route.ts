import { stopHeadroomProxy } from "../../../../lib/headroom/process.ts";
import { createErrorResponse } from "../../../../lib/api/errorResponse.ts";
import { sanitizeErrorMessage } from "../../../../../open-sse/utils/error.ts";

export const dynamic = "force-dynamic";

export async function POST(): Promise<Response> {
  try {
    const result = stopHeadroomProxy();
    const status = result.stopped ? 200 : 409;
    return Response.json(result, { status });
  } catch (error) {
    return createErrorResponse({
      status: 500,
      message: sanitizeErrorMessage(error),
      type: "server_error",
    });
  }
}
