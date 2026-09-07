import { getProviderConnectionById } from "@orbit/core/db/provider-connections";
import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { getChatGptWebCodexDoctorStatus } from "@orbit/inference/services/chatgptWebCodexAdmin";

/** GET /api/providers/:id/chatgpt-web-codex-doctor. */
export async function GET(request: Request, id: string): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const connection = await getProviderConnectionById(id);
  if (!connection || connection.provider !== "chatgpt-web-codex") {
    return Response.json({ error: "ChatGPT Web (Codex) connection not found" }, { status: 404 });
  }
  return Response.json({ status: await getChatGptWebCodexDoctorStatus(connection) });
}
