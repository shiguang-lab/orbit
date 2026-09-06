import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { CLI_TOOL_IDS, getCliRuntimeStatus } from "@shiguang-gateway/core-domain/shared/services/cliRuntime";
import { checkToolConfigStatus } from "@shiguang-gateway/core-domain/shared/cli-tool-config-status";
import { getAllCliToolLastConfigured } from "../cli-tool-state.js";

/** GET /api/cli-tools/all-statuses — control-plane batch runtime/config status. */
export async function GET(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const statuses: Record<string, Record<string, any>> = {};
  await Promise.all(CLI_TOOL_IDS.map(async (toolId) => {
    try {
      const runtime = await Promise.race([
        getCliRuntimeStatus(toolId),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 5000)),
      ]);
      statuses[toolId] = { detection: runtime, config: { status: runtime.installed && runtime.runnable ? await checkToolConfigStatus(toolId) : "not_installed" } };
    } catch (error) {
      statuses[toolId] = { detection: { installed: false, runnable: false, reason: error instanceof Error ? error.message : "Check failed" }, config: { status: "unknown" } };
    }
  }));
  try { for (const [toolId, timestamp] of Object.entries(getAllCliToolLastConfigured())) if (statuses[toolId]) statuses[toolId].config.lastConfiguredAt = timestamp; } catch { /* non-critical */ }
  return Response.json(statuses);
}
