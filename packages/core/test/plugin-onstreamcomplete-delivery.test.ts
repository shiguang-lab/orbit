import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

import { loadPlugin } from "../src/lib/plugins/loader.ts";
import { validateManifest } from "../src/lib/plugins/manifest.ts";

test("manifest and disk loader deliver onStreamComplete with requestId", async (t) => {
  const dir = await mkdtemp(join(tmpdir(), "orbit-stream-plugin-"));
  const entry = join(dir, "index.mjs");
  const output = join(dir, "received.json");
  await writeFile(
    entry,
    `import { writeFile } from "node:fs/promises";
export async function onStreamComplete(payload) {
  await writeFile(${JSON.stringify(output)}, JSON.stringify(payload));
}
`
  );

  const manifest = validateManifest({
    name: "stream-complete-test",
    version: "1.0.0",
    main: "index.mjs",
    hooks: { onStreamComplete: true },
  });
  assert.equal(manifest.hooks.onStreamComplete, true);

  const loaded = await loadPlugin(entry, manifest);
  t.after(async () => {
    loaded.cleanup();
    await rm(dir, { recursive: true, force: true });
  });
  assert.equal(typeof loaded.plugin.onStreamComplete, "function");

  await loaded.plugin.onStreamComplete?.({ status: 200, requestId: "request-371" });
  const received = JSON.parse(await readFile(output, "utf8"));
  assert.equal(received.status, 200);
  assert.equal(received.requestId, "request-371");
});
