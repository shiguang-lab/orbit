import { requireManagementAuth } from "@shiguang-gateway/core-domain/control/management-auth";

type AutoRuntime = {
  createVirtualAutoCombo(variant?: string, spec?: Record<string, unknown>): Promise<any>;
};

const load = (specifier: string): Promise<any> => import(specifier);

async function autoRuntime(): Promise<AutoRuntime> {
  return (await load("@shiguang-gateway/open-sse/services/autoCombo/virtualFactory")) as AutoRuntime;
}

/** GET /api/combos/auto. Enumerate supported virtual auto-combo templates. */
export async function listAutoCombos(request: Request): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;

  try {
    const [{ VALID_VARIANTS }, { AUTO_SUFFIX_VARIANTS, AUTO_TEMPLATE_VARIANTS, AUTO_FAMILY_IDS }, { parseAutoSuffix }] =
      await Promise.all([
        load("@shiguang-gateway/open-sse/services/autoCombo/autoPrefix"),
        load("@shiguang-gateway/open-sse/services/autoCombo/builtinCatalog"),
        load("@shiguang-gateway/open-sse/services/autoCombo/suffixComposition"),
      ]);
    const { createVirtualAutoCombo } = await autoRuntime();
    const combos: Record<string, unknown>[] = [];
    const seenIds = new Set<string>();
    const add = async (id: string, name: string, variant?: string, spec?: Record<string, unknown>) => {
      if (seenIds.has(id)) return;
      try {
        const virtual = await createVirtualAutoCombo(variant, spec);
        combos.push({
          id,
          name,
          variant: variant ?? null,
          type: "auto",
          isHidden: false,
          candidatePool: virtual.candidatePool ?? [],
          candidateCount: virtual.candidatePool?.length ?? 0,
          context_length: virtual.advertisedContextLength || 128000,
          max_output_tokens: virtual.advertisedMaxOutputTokens || 8192,
          config: virtual.config ?? {},
        });
        seenIds.add(id);
      } catch {
        // A single unavailable provider must not hide other templates.
      }
    };

    for (const variant of [undefined, ...VALID_VARIANTS]) {
      const id = variant ? `auto/${variant}` : "auto";
      const label = variant ? `Auto ${variant.charAt(0).toUpperCase()}${variant.slice(1)}` : "Auto";
      await add(id, label, variant);
    }
    for (const modelStr of Object.keys(AUTO_TEMPLATE_VARIANTS)) {
      const variant = AUTO_TEMPLATE_VARIANTS[modelStr];
      await add(modelStr, variant ? `Auto ${variant.charAt(0).toUpperCase()}${variant.slice(1)}` : "Auto Chat", variant, modelStr === "auto/best-free" ? { tier: "free" } : undefined);
    }
    for (const modelStr of AUTO_SUFFIX_VARIANTS) {
      const parsed = parseAutoSuffix(modelStr.slice("auto/".length));
      if (!parsed.valid) continue;
      const category = parsed.category ? `${parsed.category.charAt(0).toUpperCase()}${parsed.category.slice(1)}` : "";
      const tier = parsed.tier ? `${parsed.tier.charAt(0).toUpperCase()}${parsed.tier.slice(1)}` : "";
      await add(modelStr, `Auto ${category}${tier ? ` ${tier}` : ""}`, undefined, { category: parsed.category, ...(parsed.tier ? { tier: parsed.tier } : {}) });
    }
    for (const modelStr of AUTO_FAMILY_IDS) {
      const family = modelStr.slice("auto/".length);
      await add(modelStr, `Auto ${family.charAt(0).toUpperCase()}${family.slice(1)}`, undefined, { family });
    }
    return Response.json({ combos });
  } catch (error) {
    console.error("Error fetching auto combos:", error);
    return Response.json({ combos: [] });
  }
}
