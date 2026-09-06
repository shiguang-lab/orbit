import {
  getServiceModels,
} from "@shiguang-gateway/core-domain/embedded-services/catalog";
import { getOrCreateApiKey } from "@shiguang-gateway/core-domain/embedded-services/api-key";
import {
  getSupervisor,
} from "@shiguang-gateway/core-domain/control/embedded-services-lifecycle";
import { syncServiceModels } from "../../embedded-service-model-sync.js";
import { createErrorResponse, sanitizeErrorMessage } from "@shiguang-gateway/core-domain/shared/error-response";

const TOOL = "9router";
const DEFAULT_PORT = Number.parseInt(process.env.NINEROUTER_PORT ?? "20130", 10);

export async function models(request: Request): Promise<Response> {
  try {
    if (new URL(request.url).searchParams.get("refresh") === "true") {
      const status = getSupervisor(TOOL)?.getStatus();
      const port = status?.port ?? DEFAULT_PORT;
      let apiKey: string;
      try { apiKey = await getOrCreateApiKey(TOOL); }
      catch (error) { return createErrorResponse({ status: 500, message: `Failed to resolve API key: ${sanitizeErrorMessage(error instanceof Error ? error.message : String(error))}` }); }
      await syncServiceModels(TOOL, `http://127.0.0.1:${port}`, apiKey);
    }
    return Response.json({ data: getServiceModels(TOOL) });
  } catch (error) {
    return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)) });
  }
}
