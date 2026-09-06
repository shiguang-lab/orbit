import { z } from "zod";
import { requireManagementAuth as requireCliToolsAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { generateConfig, generateAllConfigs } from "@shiguang-gateway/core-domain/cli/config-generator";
import { resolveGatewayBaseUrl } from "@shiguang-gateway/core-domain/shared/utils/resolveGatewayBaseUrl";

const generateConfigSchema = z.object({
  toolId: z.string().min(1),
  baseUrl: z.string().optional(),
  apiKey: z.string().min(1),
  model: z.string().optional(),
});

// GET /api/cli-tools/config - List generated configs for all tools
export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const baseUrl = searchParams.get("baseUrl") || `${resolveGatewayBaseUrl()}/v1`;
  const apiKey = searchParams.get("apiKey") || "";

  if (!apiKey) {
    return Response.json({ error: "API key is required" }, { status: 400 });
  }

  try {
    const results = await generateAllConfigs({ baseUrl, apiKey });
    return Response.json({ configs: results });
  } catch (error) {
    console.log("Error generating configs:", error);
    return Response.json({ error: "Failed to generate configs" }, { status: 500 });
  }
}

// POST /api/cli-tools/config - Generate config for a specific tool
export async function POST(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;

  try {
    const parsed = generateConfigSchema.safeParse(await request.json());
    if (!parsed.success) {
      return Response.json(
        { error: parsed.error.issues[0]?.message ?? "Invalid request" },
        { status: 400 }
      );
    }
    const { toolId, baseUrl, apiKey, model } = parsed.data;

    const result = await generateConfig(toolId, {
      baseUrl: baseUrl || `${resolveGatewayBaseUrl()}/v1`,
      apiKey,
      model,
    });

    if (!result.success) {
      return Response.json({ error: result.error }, { status: 400 });
    }

    return Response.json({
      configPath: result.configPath,
      content: result.content,
    });
  } catch (error) {
    console.log("Error generating config:", error);
    return Response.json({ error: "Failed to generate config" }, { status: 500 });
  }
}
