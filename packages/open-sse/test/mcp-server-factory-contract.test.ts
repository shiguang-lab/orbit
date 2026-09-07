import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, { types?: string; import?: string } | string> };

test("MCP server factory is callable and the executable entry stays retired", async () => {
  assert.equal(manifest.exports["./mcp-server/entry"], undefined);
  assert.deepEqual(manifest.exports["./mcp-server/factory"], {
    types: "./dist/types/mcp-server/factory.d.ts",
    import: "./mcp-server/factory.ts",
  });
  const runtime = await import(
    pathToFileURL(path.join(packageRoot, "mcp-server/factory.ts")).href
  );
  assert.deepEqual(Object.keys(runtime).sort(), [
    "createMcpServer",
    "getMcpServerRuntimeInfo",
  ]);

  const declaration = fs.readFileSync(
    path.join(packageRoot, "dist/types/mcp-server/factory.d.ts"),
    "utf8",
  );
  const declared = [...declaration.matchAll(/export declare function (\w+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(declared.sort(), Object.keys(runtime).sort());
});
