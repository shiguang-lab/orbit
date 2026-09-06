import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types?: string; import?: string } | string>;
};

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", ".turbo"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test("edge/codex-responses-model exposes only WebSocket model resolution", async () => {
  const entry = manifest.exports["./edge/codex-responses-model"];
  assert.deepEqual(entry, {
    types: "./src/public/codexResponsesModel.d.ts",
    import: "./src/edge/codexResponsesModel.ts",
  });
  const runtime = await import(
    pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href,
  );
  assert.deepEqual(Object.keys(runtime), ["resolveCodexWsModelInfo"]);

  const declaration = fs.readFileSync(
    path.join(packageRoot, (entry as { types: string }).types),
    "utf8",
  );
  assert.deepEqual(
    [...declaration.matchAll(/export function (\w+)/g)].map((match) => match[1]),
    ["resolveCodexWsModelInfo"],
  );
});

test("edge/ws-handshake declaration and runtime keys match", async () => {
  const entry = manifest.exports["./edge/ws-handshake"] as { types: string; import: string };
  assert.deepEqual(entry, {
    types: "./src/public/edgeWs.d.ts",
    import: "./src/lib/ws/handshake.ts",
  });
  const expectedKeys = [
    "DEFAULT_WS_PATH",
    "authorizeWebSocketHandshake",
    "extractWsTokenFromRequest",
    "extractWsTokenFromUrl",
    "getWsRuntimeConfig",
  ];
  const runtime = await import(pathToFileURL(path.join(packageRoot, entry.import)).href);
  assert.deepEqual(Object.keys(runtime).sort(), expectedKeys.sort());

  const declaration = fs.readFileSync(path.join(packageRoot, entry.types), "utf8");
  const declaredKeys = [...declaration.matchAll(/export (?:const|function) (\w+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(declaredKeys.sort(), expectedKeys.sort());
  assert.doesNotMatch(declaration, /export function GET\b/);
});

test("the broad Codex Responses WebSocket runtime stays retired", () => {
  assert.equal(manifest.exports["./edge/codex-responses-ws-runtime"], undefined);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/edge/codexResponsesWsRuntime.ts")), false);

  const forbidden = /@shiguang-gateway\/core-domain\/edge\/codex-responses-ws-runtime/;
  for (const root of ["apps", "packages/open-sse"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), forbidden, file);
    }
  }
});
