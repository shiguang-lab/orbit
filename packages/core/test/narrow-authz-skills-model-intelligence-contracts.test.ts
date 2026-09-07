import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string } | string>;
};

const contracts = {
  "./shared/authz-headers": {
    entry: "./src/shared/authzHeaders.ts",
    types: "./src/public/authzHeaders.d.ts",
    keys: ["AUTHZ_HEADER_AUTH_ID", "AUTHZ_HEADER_AUTH_KIND", "AUTHZ_HEADER_PEER_LOCALITY"],
    retiredTarget: "./src/server/authz/headers.ts",
  },
  "./control/skills-github": {
    entry: "./src/control/skillsGithub.ts",
    types: "./src/public/skillsGithub.d.ts",
    keys: ["resolveInstallPath", "searchGitHubSkills"],
    retiredTarget: "./src/lib/skills/githubCollector.ts",
  },
  "./db/model-intelligence": {
    entry: "./src/db/modelIntelligence.ts",
    types: "./src/public/modelIntelligenceDb.d.ts",
    keys: [
      "deleteUserFitnessOverrideEntry",
      "getModelIntelligenceBySource",
      "setUserFitnessOverrideEntry",
    ],
    retiredTarget: "./src/lib/db/modelIntelligence.ts",
  },
} as const;

function declaredValueKeys(source: string): string[] {
  return [...source.matchAll(/export\s+(?!type\s)\{([^}]+)\}/gs)].flatMap((match) =>
    match[1]
      .split(",")
      .map((part) => part.trim().split(/\s+as\s+/).at(-1) ?? "")
      .filter(Boolean),
  );
}

test("authz, GitHub skills, and model intelligence expose exact runtime and type keys", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], {
      types: contract.types,
      import: contract.entry,
    });

    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), `${subpath} runtime`);

    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    assert.deepEqual(
      declaredValueKeys(declaration).sort(),
      [...contract.keys].sort(),
      `${subpath} declarations`,
    );
  }
});

test("wide implementation files stay retired as package export targets", () => {
  const targets = Object.values(manifest.exports).map((entry) =>
    typeof entry === "string" ? entry : entry.import,
  );
  for (const contract of Object.values(contracts)) {
    assert.equal(targets.includes(contract.retiredTarget), false, contract.retiredTarget);
  }
});
