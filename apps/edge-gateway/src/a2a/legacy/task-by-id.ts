import { getTaskManager } from "@shiguang-gateway/core-domain/a2a/runtime";
import { authorizeA2ATaskRoute } from "./auth.js";
import { sanitizeErrorMessage } from "@shiguang-gateway/error-sanitization";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  // GHSA-jcm5-6wpp-wjj8: this route had no auth call at all — open regardless
  // of configuration. Another principal's task answers 404, same as a missing
  // one, so an IDOR probe cannot tell the two apart.
  const auth = await authorizeA2ATaskRoute(request);
  if (auth instanceof Response) return auth;
  try {
    const { id } = await params;
    const tm = getTaskManager();
    const task = tm.getTask(id, auth.owner);
    if (!task) {
      return Response.json({ error: `Task not found: ${id}` }, { status: 404 });
    }
    return Response.json({ task });
  } catch (error) {
    return Response.json(
      {
        error: sanitizeErrorMessage(
          error instanceof Error ? error.message : "Failed to load A2A task"
        ),
      },
      { status: 500 }
    );
  }
}
