import { z } from "zod";
import { skillExecutor } from "@orbit/core/control/skills-executor";
import { isAuthenticated } from "@orbit/core/control/authenticated";
import {
  buildPaginatedResponse,
  parsePaginationParams,
} from "@orbit/core/shared/types/pagination";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

const executionSchema = z.object({
  skillName: z.string().min(1),
  apiKeyId: z.string().min(1),
  input: z.record(z.string(), z.unknown()).optional(),
  sessionId: z.string().optional(),
});

export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const url = new URL(request.url);
    const params = parsePaginationParams(url.searchParams);
    const apiKeyId = url.searchParams.get("apiKeyId") || undefined;
    const total = skillExecutor.countExecutions(apiKeyId);
    const executions = skillExecutor.listExecutions(
      apiKeyId,
      params.limit,
      (params.page - 1) * params.limit,
    );
    return Response.json(buildPaginatedResponse(executions, total, params));
  } catch (error) {
    return Response.json({ error: sanitizeErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const validation = executionSchema.safeParse(await request.json());
    if (!validation.success) {
      return Response.json({ error: validation.error.issues }, { status: 400 });
    }
    const { skillName, input, apiKeyId, sessionId } = validation.data;
    const execution = await skillExecutor.execute(skillName, input ?? {}, { apiKeyId, sessionId });
    return Response.json({ execution });
  } catch (error) {
    const message = sanitizeErrorMessage(error);
    return Response.json({ error: message }, { status: message.includes("disabled") ? 503 : 500 });
  }
}
