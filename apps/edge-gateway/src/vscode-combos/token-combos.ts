import { getCombos } from "@shiguang-gateway/core-domain/db/combos";
import { projectCombo, type PublicCombo } from "../combos/runtime/project-combo.js";
import { GET as getModels, OPTIONS as modelsOptions } from "../vscode-models/vscode-models.handler.js";

export type TokenComboDependencies = {
  getCombos: typeof getCombos;
  getModels: typeof getModels;
  projectCombo: typeof projectCombo;
};

const defaultDependencies: TokenComboDependencies = { getCombos, getModels, projectCombo };

export const OPTIONS = modelsOptions;

export async function GET(
  request: Request,
  context: { params?: Promise<{ token: string }> | { token: string } },
  resolveModels: Parameters<typeof getModels>[2],
  dependencies: TokenComboDependencies = defaultDependencies,
): Promise<Response> {
  const url = new URL(request.url);
  if (url.pathname.includes("/api/version") || url.pathname.includes("/api/tags")) {
    return dependencies.getModels(request, context, resolveModels);
  }

  try {
    const combos = await dependencies.getCombos();
    const data = (Array.isArray(combos) ? combos : [])
      .map((combo) => dependencies.projectCombo(combo as Record<string, unknown>, { includeCapabilities: true }))
      .filter((combo): combo is PublicCombo => combo !== null);

    return new Response(JSON.stringify({ object: "list", data, combos: data }), {
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Failed to fetch combos" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
