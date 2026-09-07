import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { discoverRouteModules } from "./smoke-route-imports.mjs";

test("discovers current Nest modules without any retired route tree", async () => {
  const root = await mkdtemp(join(tmpdir(), "route-discovery-"));
  try {
    for (const app of ["control-api", "edge-gateway"]) {
      const src = join(root, "apps", app, "src");
      await mkdir(src, { recursive: true });
      for (const file of ["app.module.ts", "test.controller.ts", "test.handler.ts", "main.ts"]) {
        await writeFile(join(src, file), "export {};\n");
      }
    }
    const apps = await discoverRouteModules(root);
    assert.equal(apps["control-api"].length, 3);
    assert.equal(apps["edge-gateway"].length, 3);
    for (const file of apps["edge-gateway"]) assert.match(file, /\.(controller|handler|module)\.ts$/);
    await rm(join(root, "apps", "edge-gateway", "src"), { recursive: true });
    await mkdir(join(root, "apps", "edge-gateway", "src"));
    await assert.rejects(discoverRouteModules(root), /No Nest route modules discovered for edge-gateway/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
