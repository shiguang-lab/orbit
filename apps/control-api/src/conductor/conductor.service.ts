import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { cancelConductorTask, getConductorTaskDetail, getFleetSnapshot } from "@shiguang-gateway/core-domain/conductor/hub-proxy";
import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { createErrorResponse } from "@shiguang-gateway/core-domain/shared/error-response";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";
import { askFaro } from "./faro-proxy.js";

const askSchema = z.object({ message: z.string().min(1).max(4000) });

@Injectable()
export class ConductorService {
  async ask(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return Response.json(buildErrorBody(400, "Invalid JSON body"), { status: 400 });
    }
    const parsed = askSchema.safeParse(raw);
    if (!parsed.success) {
      return Response.json(buildErrorBody(400, "Body must be { message: string (1-4000 chars) }"), { status: 400 });
    }
    const answer = await askFaro(parsed.data.message);
    if (!answer.ok) {
      return Response.json(buildErrorBody(503, "Faro (spokesperson) is offline or refused the request"), { status: 503 });
    }
    return Response.json({ text: answer.text, pending: answer.pending });
  }

  async fleet(request: Request): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    return Response.json(await getFleetSnapshot());
  }

  async task(request: Request, id: string): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    const detail = await getConductorTaskDetail(id);
    if (!detail) return createErrorResponse({ status: 404, message: "Conductor task not found (or hub offline)" });
    return Response.json(detail);
  }

  async cancel(request: Request, id: string): Promise<Response> {
    const authError = await requireManagementAuth(request);
    if (authError) return authError;
    const result = await cancelConductorTask(id);
    if (!result.ok) {
      return createErrorResponse({
        status: result.status,
        message: `Conductor hub refused the cancellation (HTTP ${result.status})`,
      });
    }
    return Response.json({ ok: true });
  }
}
