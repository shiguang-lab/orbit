export const COMBO_USAGE_GUIDE_STORAGE_KEY = "orbit:combos:hide-usage-guide";

const listeners = new Set<() => void>();

export function subscribeComboUsageGuide(onStoreChange: () => void): () => void {
  listeners.add(onStoreChange);
  globalThis.addEventListener?.("storage", onStoreChange);
  return () => {
    listeners.delete(onStoreChange);
    globalThis.removeEventListener?.("storage", onStoreChange);
  };
}

export function getComboUsageGuideDismissed(): boolean {
  try {
    return globalThis.localStorage?.getItem(COMBO_USAGE_GUIDE_STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export function getComboUsageGuideServerSnapshot(): boolean {
  return false;
}

export function setComboUsageGuideDismissed(dismissed: boolean): void {
  try {
    if (dismissed) globalThis.localStorage?.setItem(COMBO_USAGE_GUIDE_STORAGE_KEY, "1");
    else globalThis.localStorage?.removeItem(COMBO_USAGE_GUIDE_STORAGE_KEY);
  } catch {
    // Restricted/private storage keeps the guide visible for the next mount.
  }
  for (const listener of listeners) listener();
}
