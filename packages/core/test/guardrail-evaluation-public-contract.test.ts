import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(
  fs.readFileSync(path.join(packageRoot, "package.json"), "utf8"),
) as { exports: Record<string, { types?: string; import?: string } | string> };

const expectedRuntimeKeys = [
  "evaluateGuardrailsPostCall",
  "evaluateGuardrailsPreCall",
  "resolveDisabledGuardrails",
] as const;
const retiredAliases = ["./edge/guardrails-runtime", "./runtime/guardrails"] as const;

function sourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".turbo"].includes(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...sourceFiles(target));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) files.push(target);
  }
  return files;
}

test("guardrails/evaluation exposes only request evaluation operations", async () => {
  const entry = manifest.exports["./guardrails/evaluation"];
  assert.deepEqual(entry, {
    types: "./src/public/guardrailEvaluation.d.ts",
    import: "./src/guardrails/evaluation.ts",
  });

  const runtime = await import(
    pathToFileURL(path.join(packageRoot, (entry as { import: string }).import)).href,
  );
  assert.deepEqual(Object.keys(runtime).sort(), [...expectedRuntimeKeys].sort());

  const declaration = fs.readFileSync(
    path.join(packageRoot, (entry as { types: string }).types),
    "utf8",
  );
  const declaredFunctions = [...declaration.matchAll(/export function (\w+)/g)].map(
    (match) => match[1],
  );
  assert.deepEqual(declaredFunctions.sort(), [...expectedRuntimeKeys].sort());
  assert.doesNotMatch(
    declaration,
    /\b(?:guardrailRegistry|registerDefaultGuardrails|resetGuardrailsForTests)\b/,
  );
});

test("mutable guardrail registry aliases stay retired", () => {
  for (const alias of retiredAliases) assert.equal(manifest.exports[alias], undefined, alias);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/edge/guardrailsRuntime.ts")), false);
  assert.equal(fs.existsSync(path.join(packageRoot, "src/public/guardrailsEdgeRuntime.d.ts")), false);

  const retiredImportPattern = new RegExp(
    `core/(?:${retiredAliases.map((alias) => alias.slice(2).replaceAll("/", "\\/")).join("|")})(?=["'])`,
  );
  const evaluationSpecifier = "@orbit/core/guardrails/evaluation";
  const managementSpecifier = "@orbit/core/control/guardrails";
  const evaluationConsumers: string[] = [];
  const managementConsumers: string[] = [];
  for (const root of ["apps", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      const source = fs.readFileSync(file, "utf8");
      assert.doesNotMatch(source, retiredImportPattern, file);
      if (source.includes(evaluationSpecifier)) {
        evaluationConsumers.push(path.relative(repoRoot, file).split(path.sep).join("/"));
      }
      if (source.includes(managementSpecifier)) {
        managementConsumers.push(path.relative(repoRoot, file).split(path.sep).join("/"));
      }
    }
  }
  assert.deepEqual(evaluationConsumers.sort(), [
    "packages/inference/src/handlers/chat.ts",
    "packages/inference/src/handlers/chatCore.ts",
    "packages/inference/src/handlers/chatCore/postCallGuardrailContext.ts",
  ]);
  assert.deepEqual(managementConsumers, [
    "apps/control/src/guardrails/guardrails.service.ts",
  ]);
});
