import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-skill-boundary-"));
process.env.DATA_DIR = dataDir;
process.env.API_KEY_SECRET = "skill-boundary-test";
const { projectSkillOutputForBoundary } = await import("../src/lib/skills/executor.ts");

test.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));

test("failed skill output is recursively sanitized", () => {
  const projected = projectSkillOutputForBoundary({
    success: false,
    error: "failed with sk-secret123456789 at /Users/private/source.ts",
    details: { token: "private-token", reason: "denied" },
  });
  const serialized = JSON.stringify(projected);
  assert.equal(serialized.includes("sk-secret123456789"), false);
  assert.equal(serialized.includes("/Users/private"), false);
  assert.equal(serialized.includes("private-token"), false);
});

test("successful skill output preserves data but sanitizes nested error aliases", () => {
  const shared = { message: "Bearer private-token" };
  const projected = projectSkillOutputForBoundary({
    success: true,
    data: { answer: "keep me" },
    warning: shared,
    echoedWarning: shared,
  });
  assert.equal((projected.data as { answer: string }).answer, "keep me");
  assert.equal(JSON.stringify(projected).includes("private-token"), false);
});

test("circular skill outputs fail closed without throwing", () => {
  const output: Record<string, unknown> = { success: true };
  output.self = output;
  assert.equal(projectSkillOutputForBoundary(output).self, "[circular]");
});
