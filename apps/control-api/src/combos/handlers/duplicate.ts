import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";
import { createCombo, getCombos } from "@shiguang-gateway/core-domain/db/local-db";
import { normalizeComboModels } from "@shiguang-gateway/core-domain/shared/combo-steps";
import { z } from "zod";

const duplicateSchema = z.object({
  name: z.string().trim().min(1, 'Missing required field: "name" (e.g. auto/best-coding)'),
  strategy: z.string().trim().min(1).optional(),
});

type AutoSpec = { variant?: string; category?: string; tier?: string; family?: string };
const load = (specifier: string): Promise<any> => import(specifier);

async function resolveAutoSpec(name: string): Promise<AutoSpec | null> {
  const [{ resolveBuiltinAutoSpec }, { MODEL_FAMILIES }] = await Promise.all([
    load("@shiguang-gateway/open-sse/services/autoCombo/builtinCatalog"),
    load("@shiguang-gateway/open-sse/services/autoCombo/modelFamily"),
  ]);
  const suffix = name.slice("auto/".length);
  const resolved = resolveBuiltinAutoSpec(name, suffix) as AutoSpec;
  if (resolved.category || resolved.variant !== undefined) return resolved;
  return MODEL_FAMILIES.includes(suffix) ? { family: suffix } : null;
}

/** POST /api/combos/duplicate. Materialize a built-in auto combo snapshot. */
export async function duplicate(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const validation = duplicateSchema.safeParse(rawBody);
  if (!validation.success) {
    return Response.json({ error: validation.error.issues[0]?.message ?? "Invalid request" }, { status: 400 });
  }

  const { name, strategy } = validation.data;
  try {
    const spec = await resolveAutoSpec(name);
    if (!spec) return Response.json({ error: `Unknown auto-combo template: "${name}"` }, { status: 422 });

    const { prepareVirtualAutoComboInputs, createVirtualAutoComboFromPrepared } =
      await load("@shiguang-gateway/open-sse/services/autoCombo/virtualFactory");
    const resolvedSpec = spec.family ? { family: spec.family } : spec;
    const prepared = await prepareVirtualAutoComboInputs({ includeResolvedCapabilities: true });
    const virtualCombo = await createVirtualAutoComboFromPrepared(
      prepared,
      spec.variant,
      resolvedSpec,
    );
    if (!Array.isArray(virtualCombo.models) || virtualCombo.models.length === 0) {
      return Response.json({ error: "No connected providers/models match this auto-combo template" }, { status: 422 });
    }

    const allCombos = await getCombos();
    const rawModels = virtualCombo.models.map((model: any, index: number) => ({
      id: `auto-duplicate-${name}-${index + 1}`,
      kind: "model",
      model: model.model || `${model.providerId}/unknown`,
      weight: model.weight ?? 1,
    }));
    const normalizedModels = normalizeComboModels(rawModels, {
      comboName: `static-${name.replace("auto/", "")}`,
      allCombos,
    });
    if (normalizedModels.length === 0) {
      return Response.json({ error: "No valid models resolved from this auto-combo template" }, { status: 422 });
    }

    const totalWeight = normalizedModels.reduce((sum: number, model: any) => sum + (model.weight ?? 0), 0);
    if (totalWeight > 0) {
      for (const model of normalizedModels as any[]) {
        model.weight = Math.max(1, Math.floor(((model.weight ?? 0) / totalWeight) * 100));
      }
      let remainder = 100 - normalizedModels.reduce((sum: number, model: any) => sum + model.weight, 0);
      for (let index = 0; index < normalizedModels.length && remainder > 0; index += 1, remainder -= 1) {
        (normalizedModels[index] as any).weight += 1;
      }
    }

    const baseName = `static-${name.replace("auto/", "")}`;
    const existingNames = new Set(allCombos.map((combo: any) => combo.name));
    let newName = baseName;
    let counter = 1;
    while (existingNames.has(newName)) newName = `${baseName} ${++counter}`;

    const weightPack = virtualCombo.weights ?? virtualCombo.autoConfig?.weights;
    const comboData = await createCombo({
      name: newName,
      models: normalizedModels,
      strategy: strategy || "priority",
      description: `${name} @ ${new Date().toISOString()}`,
      config: { sourceAutoCombo: name, weightPack },
      version: 2,
    });
    return Response.json(comboData, { status: 201 });
  } catch (error) {
    console.error("Error duplicating auto-combo:", error);
    return Response.json({ error: "Failed to duplicate auto-combo" }, { status: 500 });
  }
}
