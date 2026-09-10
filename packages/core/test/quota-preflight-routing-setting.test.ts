import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

/**
 * Quota-preflight routing setting — backend round-trip coverage.
 *
 * The Settings → Resilience "Quota Preflight" card PATCHes /api/resilience with
 * `{ quotaPreflight: { enabled, defaultThresholdPercent, warnThresholdPercent } }`
 * and reads it back from GET. These tests pin the pieces the card depends on:
 *
 *   1. `updateResilienceSchema` accepts a `quotaPreflight` section — previously
 *      the section was validated nowhere and silently rejected by `.strict()`.
 *   2. A persisted `enabled: true` reaches `resolveResilienceSettings`, which is
 *      the flag auth.ts's preflight gate reads to arm per-account skipping.
 *   3. The schema still rejects an entirely-empty PATCH (existing behavior).
 */

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-quota-preflight-setting-"));
const originalDataDir = process.env.DATA_DIR;
const originalCutoffFlag = process.env.QUOTA_PREFLIGHT_CUTOFF_ENABLED;
process.env.DATA_DIR = dataDir;
// Deterministic factory default regardless of the developer's shell.
delete process.env.QUOTA_PREFLIGHT_CUTOFF_ENABLED;

const db = await import("../src/lib/db/core.ts");
const settingsDb = await import("../src/lib/db/settings.ts");
const { updateResilienceSchema } = await import("../src/shared/validation/schemas/settings.ts");
const { validateBody, isValidationFailure } = await import("../src/shared/validation/helpers.ts");
const { resolveResilienceSettings } = await import("../src/lib/resilience/settings.ts");

test.after(() => {
  db.resetDbInstance();
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  if (originalCutoffFlag === undefined) delete process.env.QUOTA_PREFLIGHT_CUTOFF_ENABLED;
  else process.env.QUOTA_PREFLIGHT_CUTOFF_ENABLED = originalCutoffFlag;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

test("updateResilienceSchema accepts a quotaPreflight section", () => {
  const validation = validateBody(updateResilienceSchema, {
    quotaPreflight: { enabled: true, defaultThresholdPercent: 5 },
  });
  assert.equal(isValidationFailure(validation), false, "quotaPreflight must be a valid PATCH key");
  if (!isValidationFailure(validation)) {
    assert.equal(
      (validation.data as { quotaPreflight?: { enabled?: boolean } }).quotaPreflight?.enabled,
      true
    );
    assert.equal(
      (validation.data as { quotaPreflight?: { defaultThresholdPercent?: number } }).quotaPreflight
        ?.defaultThresholdPercent,
      5
    );
  }
});

test("updateResilienceSchema rejects malformed quotaPreflight values", () => {
  const outOfRange = validateBody(updateResilienceSchema, {
    quotaPreflight: { defaultThresholdPercent: 500 },
  });
  assert.equal(isValidationFailure(outOfRange), true, "out-of-range threshold must be rejected");

  const emptySection = validateBody(updateResilienceSchema, {});
  assert.equal(isValidationFailure(emptySection), true, "an empty PATCH must still be rejected");
});

test("a persisted quotaPreflight section is surfaced by resolveResilienceSettings", async () => {
  const before = resolveResilienceSettings(await settingsDb.getSettings());
  assert.equal(before.quotaPreflight.enabled, false, "factory default is opt-in / disabled");

  await settingsDb.updateSettings({
    resilienceSettings: {
      quotaPreflight: {
        enabled: true,
        defaultThresholdPercent: 10,
        warnThresholdPercent: 25,
      },
    },
  });

  const after = resolveResilienceSettings(await settingsDb.getSettings());
  assert.equal(
    after.quotaPreflight.enabled,
    true,
    "auth.ts's preflight gate arms on resilience.quotaPreflight.enabled — the persisted toggle must resolve to true"
  );
  assert.equal(after.quotaPreflight.defaultThresholdPercent, 10);
  assert.equal(after.quotaPreflight.warnThresholdPercent, 25);
});
