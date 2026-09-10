import assert from "node:assert/strict";
import { test } from "node:test";

import {
  COMBO_USAGE_GUIDE_STORAGE_KEY,
  getComboUsageGuideDismissed,
  getComboUsageGuideServerSnapshot,
  setComboUsageGuideDismissed,
  subscribeComboUsageGuide,
} from "../src/features/combos/usage-guide-store.ts";

test("combo usage-guide dismissal is an observable external store", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
      removeItem: (key: string) => values.delete(key),
    },
  });

  let notifications = 0;
  const unsubscribe = subscribeComboUsageGuide(() => notifications++);
  try {
    assert.equal(getComboUsageGuideServerSnapshot(), false);
    assert.equal(getComboUsageGuideDismissed(), false);

    setComboUsageGuideDismissed(true);
    assert.equal(values.get(COMBO_USAGE_GUIDE_STORAGE_KEY), "1");
    assert.equal(getComboUsageGuideDismissed(), true);

    setComboUsageGuideDismissed(false);
    assert.equal(values.has(COMBO_USAGE_GUIDE_STORAGE_KEY), false);
    assert.equal(getComboUsageGuideDismissed(), false);
    assert.equal(notifications, 2);
  } finally {
    unsubscribe();
    Reflect.deleteProperty(globalThis, "localStorage");
  }
});
