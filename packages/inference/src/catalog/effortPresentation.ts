/** Public projection only. Authorization and internal catalogs use the full catalog. */
export function aggregateEffortVariants(models: Array<Record<string, any>>) {
  const result = new Map<string, Record<string, any>>();
  const efforts = new Map<string, Set<string>>();
  for (const model of models) {
    const variant = model.effort_variant;
    const derived = variant?.source === "orbit";
    const id = derived ? variant.base_model : model.id;
    const identity = JSON.stringify([id, model.type, model.subtype]);
    if (derived) {
      const tiers = efforts.get(identity) || new Set<string>();
      tiers.add(variant.effort);
      efforts.set(identity, tiers);
    }
    const previous = result.get(identity);
    if (!previous || !derived) {
      const { effort_variant: _, ...entry } = model;
      result.set(identity, {
        ...entry,
        id,
        root: derived ? variant.base_root : model.root,
        ...(derived && typeof model.name === "string"
          ? { name: variant.base_name || model.name.replace(/\s*\([^()]*\)$/, "") } : {}),
        ...(derived && typeof model.parent === "string" && model.parent.endsWith(`-${variant.effort}`)
          ? { parent: model.parent.slice(0, -variant.effort.length - 1) } : {}),
      });
    }
  }
  return [...result.entries()].map(([identity, model]) => efforts.has(identity)
    ? { ...model, capabilities: { ...model.capabilities, effort_tiers: [...efforts.get(identity)!] } }
    : model);
}
