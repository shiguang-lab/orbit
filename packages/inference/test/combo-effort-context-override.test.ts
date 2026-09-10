import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-combo-effort-context-"));
const originalDataDir = process.env.DATA_DIR;
process.env.DATA_DIR = dataDir;

const db = await import("@orbit/core/db/connection");
const { removeModelContextOverride, setModelContextOverride } = await import(
  "@orbit/core/control/model-context-overrides"
);
const { installRuntimePorts } = await import("../src/services/dbRuntimeHooks.ts");
installRuntimePorts();
const { evaluateContextLimit } = await import(
  "../src/services/combo/contextOverrideGate.ts"
);

test.after(() => {
  db.resetDbInstance();
  if (originalDataDir === undefined) delete process.env.DATA_DIR;
  else process.env.DATA_DIR = originalDataDir;
  fs.rmSync(dataDir, { recursive: true, force: true });
});

const requirements = { estimatedInputTokens: 300_000, requiredContextTokens: 348_000 };

test("effort-suffixed target inherits its base model context override", () => {
  setModelContextOverride("unit-effort", "GLM-5.3", 385_351);
  try {
    assert.equal(
      evaluateContextLimit(
        { maxInputTokens: 200_000, contextWindow: 200_000 },
        requirements,
        "unit-effort/GLM-5.3-high"
      ),
      true
    );
  } finally {
    removeModelContextOverride("unit-effort", "GLM-5.3");
  }
});

test("exact effort-variant override takes precedence over the base override", () => {
  setModelContextOverride("unit-effort", "GLM-5.3", 385_351);
  setModelContextOverride("unit-effort", "GLM-5.3-xhigh", 10_000);
  try {
    assert.equal(
      evaluateContextLimit(
        { maxInputTokens: 1_000_000, contextWindow: 1_000_000 },
        requirements,
        "unit-effort/GLM-5.3-xhigh"
      ),
      false
    );
  } finally {
    removeModelContextOverride("unit-effort", "GLM-5.3-xhigh");
    removeModelContextOverride("unit-effort", "GLM-5.3");
  }
});

test("mixed-case effort suffix inherits without changing the base model key", () => {
  setModelContextOverride("unit-effort", "GLM-5.3-Flash", 899_153);
  try {
    assert.equal(
      evaluateContextLimit(
        { maxInputTokens: 200_000, contextWindow: 200_000 },
        requirements,
        "unit-effort/GLM-5.3-Flash-XHIGH"
      ),
      true
    );
  } finally {
    removeModelContextOverride("unit-effort", "GLM-5.3-Flash");
  }
});
