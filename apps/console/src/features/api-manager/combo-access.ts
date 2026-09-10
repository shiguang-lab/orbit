export const ALL_COMBOS_ACCESS_RULE = "combo/*";

export function editableComboAccessRules(rules: readonly string[] | null | undefined): string[] {
  return (rules ?? []).filter((rule) => rule !== ALL_COMBOS_ACCESS_RULE);
}

export function listUnrenderableComboAccessRules(
  selectedCombos: readonly string[],
  allCombos: ReadonlyArray<{ name: string }>
): string[] {
  const renderable = new Set(allCombos.map((combo) => combo.name));
  return selectedCombos.filter(
    (name) => name !== ALL_COMBOS_ACCESS_RULE && !renderable.has(name)
  );
}

export function comboAccessSaveValue(mode: "all" | "restricted", selected: string[]): string[] {
  return mode === "all" ? [ALL_COMBOS_ACCESS_RULE] : selected;
}
