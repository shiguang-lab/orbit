import { z } from "zod";
import { requireManagementAuth as requireCliToolsAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import fs from "node:fs";
import path from "node:path";
import { generateConfig } from "@shiguang-gateway/core-domain/cli/config-generator";
import { resolveGatewayBaseUrl } from "@shiguang-gateway/core-domain/shared/utils/resolveGatewayBaseUrl";
import { guardCliConfigWrite } from "@shiguang-gateway/core-domain/control/cli-tools-config-guard";
import { getCliPrimaryConfigPath, normalizeCliToolId } from "@shiguang-gateway/core-domain/cli/runtime";

const applySchema = z.object({
  toolId: z.string().min(1),
  baseUrl: z.string().optional(),
  apiKey: z.string().min(1),
  model: z.string().optional(),
  dryRun: z.boolean().optional(),
});

/** The host-side command that does the same job when ShiguangGateway is containerised. */
const HOST_SETUP_COMMANDS: Record<string, string> = {
  claude: "shiguangGateway setup-claude",
  codex: "shiguangGateway setup-codex",
  opencode: "shiguangGateway setup-opencode",
  cline: "shiguangGateway setup-cline",
  kilo: "shiguangGateway setup-kilo",
  continue: "shiguangGateway setup-continue",
};

function ensureBackup(configPath: string): string | null {
  if (!fs.existsSync(configPath)) return null;
  const backupDir = path.join(path.dirname(configPath), ".shiguangGateway.bak");
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, path.basename(configPath) + ".bak");
  fs.copyFileSync(configPath, backupPath);
  return backupPath;
}

// POST /api/cli-tools/apply - Apply config for a specific tool
export async function POST(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const parsed = applySchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    const { toolId, baseUrl, apiKey, model, dryRun } = parsed.data;
    const canonicalToolId = normalizeCliToolId(toolId);

    const result = await generateConfig(canonicalToolId, {
      baseUrl: baseUrl || `${resolveGatewayBaseUrl()}/v1`,
      apiKey,
      model,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    if (dryRun) {
      return Response.json({
        dryRun: true,
        configPath: result.configPath,
        content: result.content,
        ...(result.migration ? { migration: result.migration } : {}),
      });
    }

    const configPath = result.configPath || getCliPrimaryConfigPath(canonicalToolId);
    if (!configPath) {
      return Response.json({ error: `Unknown tool: ${toolId}` }, { status: 400 });
    }

    // A container write into an unmounted path looks successful and then
    // disappears with the container — refuse it and point at the host CLI.
    const refusal = guardCliConfigWrite(configPath, {
      toolLabel: canonicalToolId,
      hostCommand: HOST_SETUP_COMMANDS[canonicalToolId],
    });
    if (refusal) return refusal;

    const backupPath = ensureBackup(configPath);

    const dir = path.dirname(configPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    fs.writeFileSync(configPath, result.content!, "utf-8");

    return Response.json({
      success: true,
      configPath,
      backupPath,
      content: result.content,
      ...(result.migration ? { migration: result.migration } : {}),
    });
  } catch (error) {
    console.log("Error applying config:", error);
    return Response.json({ error: "Failed to apply config" }, { status: 500 });
  }
}
