import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

// #12803: `blockExtraUsage: false` means "may spend extra credit" — it must
// never cause the account to leave the route just when extra credit exists to
// be spent. All four decision points (evaluateQuotaCutoff, quotaStrategies
// exhaustion filter, quotaCache.isQuotaExhaustedForRequest, preflightQuota)
// must gate on isClaudeExtraUsageAllowed before applying the 5h cutoff.

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-claude-extra-preflight-"));
process.env.DATA_DIR = dataDir;
process.env.NODE_ENV = "test";
process.env.DISABLE_SQLITE_AUTO_BACKUP = "true";

const core = await import("../src/lib/db/core.ts");
core.getDbInstance();

const { isClaudeExtraUsageAllowed } = await import(
  "../src/lib/providers/claudeExtraUsage.ts"
);
const { isQuotaExhaustedForRequest, setQuotaCache } = await import(
  "../src/domain/quotaCache.ts"
);
const { evaluateQuotaCutoff } = await import("../../inference/src/services/quotaPreflight.ts");

test("isClaudeExtraUsageAllowed only fires for claude with blockExtraUsage=false", () => {
  assert.equal(isClaudeExtraUsageAllowed("claude", { blockExtraUsage: false }), true);
  assert.equal(isClaudeExtraUsageAllowed("claude", {}), false);
  assert.equal(isClaudeExtraUsageAllowed("claude", { blockExtraUsage: true }), false);
  assert.equal(isClaudeExtraUsageAllowed("claude", null), false);
  assert.equal(isClaudeExtraUsageAllowed("openai", { blockExtraUsage: false }), false);
  assert.equal(isClaudeExtraUsageAllowed(null, { blockExtraUsage: false }), false);
});

test("evaluateQuotaCutoff lets an extra-usage Claude account past an exhausted 5h window", () => {
  const exhausted = {
    used: 100,
    total: 100,
    percentUsed: 100,
    limitReached: true,
    windows: { "session (5h)": { percentUsed: 100, resetAt: null } },
  };

  const allowed = evaluateQuotaCutoff(exhausted, undefined, {
    provider: "claude",
    providerSpecificData: { blockExtraUsage: false },
  });
  assert.equal(allowed.proceed, true, "extra-usage opt-in must not be pre-dispatch skipped");

  const blocked = evaluateQuotaCutoff(exhausted, undefined, {
    provider: "claude",
    providerSpecificData: {},
  });
  assert.equal(blocked.proceed, false, "without the opt-in the 5h cutoff still applies");
});

test("isQuotaExhaustedForRequest returns false for an opted-in Claude account", () => {
  setQuotaCache("conn-extra-1", "claude", { session: { remainingPercentage: 0 } });

  assert.equal(
    isQuotaExhaustedForRequest("conn-extra-1", "claude", null, { blockExtraUsage: false }),
    false,
    "extra-usage opt-in must not mark the connection exhausted"
  );
  assert.equal(
    isQuotaExhaustedForRequest("conn-extra-1", "claude", null, {}),
    true,
    "without the opt-in the cached exhaustion still blocks"
  );
});

test("quotaStrategies forwards providerSpecificData into the exhaustion filter", async () => {
  const source = fs.readFileSync(
    path.join(import.meta.dirname, "../../inference/src/services/combo/quotaStrategies.ts"),
    "utf8"
  );
  assert.match(
    source,
    /isQuotaExhaustedForRequest\(\s*connectionId,\s*provider,\s*target\.modelStr \|\| null,\s*connection\?\.providerSpecificData/,
    "the exhaustion filter must forward connection.providerSpecificData"
  );

  const comboSource = fs.readFileSync(
    path.join(import.meta.dirname, "../../inference/src/services/combo.ts"),
    "utf8"
  );
  assert.match(
    comboSource,
    /providerSpecificData: connection\?\.providerSpecificData/,
    "buildAutoCandidates must forward providerSpecificData into evaluateQuotaCutoff"
  );
});
