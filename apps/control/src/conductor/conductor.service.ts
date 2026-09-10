import { Injectable } from "@nestjs/common";
import { z } from "zod";
import { cancelConductorTask, createConductorTask, getConductorTaskDetail, getFleetSnapshot } from "@orbit/core/conductor/hub-proxy";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { createErrorResponse } from "@orbit/utils/errors/api-response";
import { buildErrorBody } from "@orbit/inference/utils/error";
import { askFaro } from "./faro-proxy.js";

const askSchema = z.object({ message: z.string().min(1).max(4000) });
const createTaskSchema=z.object({repoUrl:z.string().min(1),prompt:z.string().min(1),baseRef:z.string().optional(),mode:z.string().optional(),cli:z.string().optional(),model:z.string().optional()});

@Injectable()
export class ConductorService {
  async create(request:Request):Promise<Response>{const authError=await requireManagementAuth(request);if(authError)return authError;let body:unknown;try{body=await request.json()}catch{return createErrorResponse({status:400,message:"Invalid JSON body"})}const parsed=createTaskSchema.safeParse(body);if(!parsed.success)return createErrorResponse({status:400,message:"Invalid request body"});const result=await createConductorTask(parsed.data);if(!result.ok||!result.task_id){const status=Number.isInteger(result.status)&&result.status>=400&&result.status<=599?result.status:502;return createErrorResponse({status,message:`Conductor hub refused the task creation (HTTP ${result.status})`})}return Response.json({task_id:result.task_id},{status:201});}
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
