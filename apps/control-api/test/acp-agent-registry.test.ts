import assert from "node:assert/strict";
import test from "node:test";

import { resolveVersionProbe } from "../src/acp/runtime/agent-registry.js";

test("custom ACP probes accept only the configured binary and a version flag", () => {
  assert.deepEqual(resolveVersionProbe("my-cli", "my-cli --version", true), {
    command: "my-cli",
    args: ["--version"],
  });
  assert.deepEqual(resolveVersionProbe("/opt/tools/my-cli", "my-cli -V", true), {
    command: "my-cli",
    args: ["-V"],
  });

  assert.equal(resolveVersionProbe("my-cli", "other-cli --version", true), null);
  assert.equal(resolveVersionProbe("node", "node -e", true), null);
  assert.equal(resolveVersionProbe("my-cli", "my-cli --version; whoami", true), null);
  assert.equal(resolveVersionProbe("my-cli", "my-cli '--version", true), null);
});

test("built-in ACP probes are tokenized without invoking a shell", () => {
  assert.deepEqual(resolveVersionProbe("ignored", "tool --version beta"), {
    command: "tool",
    args: ["--version", "beta"],
  });
  assert.equal(resolveVersionProbe("ignored", "tool | other"), null);
});
