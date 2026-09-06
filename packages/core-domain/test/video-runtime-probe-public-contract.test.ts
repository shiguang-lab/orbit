import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, { types?: string; import?: string } | string> };

test("video runtime probing does not expose frame extraction internals", async () => {
  const entry = manifest.exports["./guardrails/video-runtime-probe"];
  assert.deepEqual(entry, {
    types: "./src/public/videoBridgeRuntime.d.ts",
    import: "./src/guardrails/videoRuntimeProbe.ts",
  });
  const runtime = await import(
    pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href
  );
  assert.deepEqual(Object.keys(runtime), ["probeVideoRuntime"]);
  assert.equal(manifest.exports["./edge/video-bridge-runtime"], undefined);
});
