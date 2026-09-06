type AutoSpec = { variant?: string; category?: string; tier?: string; family?: string };

export type AutoComboProjection = {
  id: string;
  name: string;
  variant: string | null;
  type: "auto";
  isHidden: false;
  candidatePool: unknown[];
  candidateCount: number;
  context_length: number;
  max_output_tokens: number;
  config: Record<string, unknown>;
};

/** Build dashboard projections beside the edge-owned auto-combo runtime state. */
export async function projectAutoComboTemplates(): Promise<{ combos: AutoComboProjection[] }> {
  const [prefix, catalog, suffixes, factory] = await Promise.all([
    import("@shiguang-gateway/open-sse/services/autoCombo/autoPrefix"),
    import("@shiguang-gateway/open-sse/services/autoCombo/builtinCatalog"),
    import("@shiguang-gateway/open-sse/services/autoCombo/suffixComposition"),
    import("@shiguang-gateway/open-sse/services/autoCombo/virtualFactory"),
  ]);
  const combos: AutoComboProjection[] = [];
  const seenIds = new Set<string>();
  const add = async (id: string, name: string, variant?: string, spec?: Record<string, unknown>) => {
    if (seenIds.has(id)) return;
    try {
      const virtual = await factory.createVirtualAutoCombo(variant, spec);
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
      // A single unavailable provider must not hide the other templates.
    }
  };

  for (const variant of [undefined, ...prefix.VALID_VARIANTS]) {
    const id = variant ? `auto/${variant}` : "auto";
    const label = variant ? `Auto ${variant.charAt(0).toUpperCase()}${variant.slice(1)}` : "Auto";
    await add(id, label, variant);
  }
  for (const modelStr of Object.keys(catalog.AUTO_TEMPLATE_VARIANTS)) {
    const variant = catalog.AUTO_TEMPLATE_VARIANTS[modelStr];
    await add(
      modelStr,
      variant ? `Auto ${variant.charAt(0).toUpperCase()}${variant.slice(1)}` : "Auto Chat",
      variant,
      modelStr === "auto/best-free" ? { tier: "free" } : undefined,
    );
  }
  for (const modelStr of catalog.AUTO_SUFFIX_VARIANTS) {
    const parsed = suffixes.parseAutoSuffix(modelStr.slice("auto/".length));
    if (!parsed.valid) continue;
    const category = parsed.category
      ? `${parsed.category.charAt(0).toUpperCase()}${parsed.category.slice(1)}`
      : "";
    const tier = parsed.tier
      ? `${parsed.tier.charAt(0).toUpperCase()}${parsed.tier.slice(1)}`
      : "";
    await add(modelStr, `Auto ${category}${tier ? ` ${tier}` : ""}`, undefined, {
      category: parsed.category,
      ...(parsed.tier ? { tier: parsed.tier } : {}),
    });
  }
  for (const modelStr of catalog.AUTO_FAMILY_IDS) {
    const family = modelStr.slice("auto/".length);
    await add(
      modelStr,
      `Auto ${family.charAt(0).toUpperCase()}${family.slice(1)}`,
      undefined,
      { family },
    );
  }
  return { combos };
}

/** Resolve and materialize a built-in template against edge-owned live quota state. */
export async function materializeAutoComboTemplate(name: string): Promise<
  | { recognized: false }
  | {
      recognized: true;
      models: Array<{ model?: string; providerId?: string; weight?: number }>;
      weights?: unknown;
      autoConfig?: { weights?: unknown };
    }
> {
  const [catalog, families, factory] = await Promise.all([
    import("@shiguang-gateway/open-sse/services/autoCombo/builtinCatalog"),
    import("@shiguang-gateway/open-sse/services/autoCombo/modelFamily"),
    import("@shiguang-gateway/open-sse/services/autoCombo/virtualFactory"),
  ]);
  const suffix = name.slice("auto/".length);
  const resolved = catalog.resolveBuiltinAutoSpec(name, suffix) as AutoSpec;
  const spec = resolved.category || resolved.variant !== undefined
    ? resolved
    : families.MODEL_FAMILIES.includes(suffix as never)
      ? { family: suffix }
      : null;
  if (!spec) return { recognized: false };

  const prepared = await factory.prepareVirtualAutoComboInputs({ includeResolvedCapabilities: true });
  const resolvedSpec = spec.family ? { family: spec.family } : spec;
  const virtual = await factory.createVirtualAutoComboFromPrepared(
    prepared,
    spec.variant,
    resolvedSpec,
  );
  return {
    recognized: true,
    models: virtual.models,
    weights: virtual.weights,
    autoConfig: virtual.autoConfig,
  };
}
