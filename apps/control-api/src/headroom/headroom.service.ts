import { Injectable } from "@nestjs/common";
import {
  DEFAULT_HEADROOM_URL,
  getHeadroomStatus,
  isLoopbackHeadroomUrl,
  parsePortFromHeadroomUrl,
} from "./runtime/detect.js";
import {
  getManagedPid,
  HeadroomError,
  startHeadroomProxy,
  stopHeadroomProxy,
} from "./runtime/process.js";
import { getCachedSettings } from "@orbit/core/db/settings";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { createErrorResponse } from "@orbit/utils/errors/api-response";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

@Injectable()
export class HeadroomService {
  private async authorize(request: Request): Promise<Response | null> {
    return requireManagementAuth(request);
  }

  private async configuredUrl(): Promise<string> {
    const settings = await getCachedSettings();
    return typeof settings.headroomUrl === "string" && settings.headroomUrl
      ? settings.headroomUrl
      : DEFAULT_HEADROOM_URL;
  }

  async start(request: Request): Promise<Response> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const url = await this.configuredUrl();
      if (!isLoopbackHeadroomUrl(url)) {
        return createErrorResponse({
          status: 400,
          message: "External Headroom proxies must be started outside ShiguangGateway",
          type: "invalid_request",
        });
      }
      const port = parsePortFromHeadroomUrl(url) ?? 8787;
      const result = await startHeadroomProxy({ port });
      return Response.json({ success: true, ...result });
    } catch (error) {
      if (error instanceof HeadroomError && error.code === "NOT_INSTALLED") {
        return createErrorResponse({ status: 400, message: error.message, type: "invalid_request", details: { code: error.code } });
      }
      return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error), type: "server_error" });
    }
  }

  async stop(request: Request): Promise<Response> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const result = stopHeadroomProxy();
      return Response.json(result, { status: result.stopped ? 200 : 409 });
    } catch (error) {
      return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error), type: "server_error" });
    }
  }

  async status(request: Request): Promise<Response> {
    const authError = await this.authorize(request);
    if (authError) return authError;
    try {
      const url = await this.configuredUrl();
      const status = await getHeadroomStatus(url);
      return Response.json({ ...status, url, managedPid: getManagedPid() });
    } catch (error) {
      return createErrorResponse({ status: 500, message: sanitizeErrorMessage(error), type: "server_error" });
    }
  }
}
