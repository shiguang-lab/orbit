/**
 * Source guards for the round-robin extract (#12811).
 *
 * The lift of `handleRoundRobinCombo` (+ its private `resolveTargetTokenLimit`) out of the
 * 4k-line combo.ts is only reviewable if the moved contract is pinned: without these guards a
 * 1000-line move is indistinguishable from a 1000-line rewrite. Everything here is a cheap
 * source assertion so a future edit that silently drops the rotation loop back into combo.ts,
 * or loses the safety-timer cleanup / sticky-pin release, goes red immediately.
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const comboSrc = readFileSync(join(root, "packages/inference/src/services/combo.ts"), "utf8");
const rrPath = join(root, "packages/inference/src/services/combo/roundRobinCombo.ts");

test("defines handleRoundRobinCombo in roundRobinCombo.ts, not combo.ts", () => {
  assert.equal(existsSync(rrPath), true, "roundRobinCombo.ts must exist");
  const rr = readFileSync(rrPath, "utf8");
  assert.match(rr, /export async function handleRoundRobinCombo/);
  assert.equal(
    /^(export )?async function handleRoundRobinCombo/m.test(comboSrc),
    false,
    "combo.ts must not define handleRoundRobinCombo after the lift"
  );
  assert.match(
    comboSrc,
    /import \{ handleRoundRobinCombo \} from "\.\/combo\/roundRobinCombo\.ts";/,
    "combo.ts must dispatch into the extracted module"
  );
});

test("moved resolveTargetTokenLimit out of the import sandwich", () => {
  const rr = readFileSync(rrPath, "utf8");
  assert.match(rr, /function resolveTargetTokenLimit/);
  assert.equal(
    comboSrc.includes("function resolveTargetTokenLimit"),
    false,
    "combo.ts must not keep resolveTargetTokenLimit between import blocks"
  );
});

test("clears rrLoopSafetyTimer in a finally on the extracted file", () => {
  const rr = readFileSync(rrPath, "utf8");
  assert.match(rr, /rrLoopSafetyTimer = setTimeout\(/);
  assert.match(rr, /finally\s*\{[^}]*clearTimeout\(rrLoopSafetyTimer\)/s);
});

test("calls releaseStickyPinOnFailure (injection: deleting the call goes red)", () => {
  const rr = readFileSync(rrPath, "utf8");
  assert.match(
    rr,
    /releaseStickyPinOnFailure\(/,
    "#6692 quality/exhaustion path must still release the sticky pin"
  );
});
