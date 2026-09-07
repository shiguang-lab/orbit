import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const packageRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "package.json"), "utf8")) as {
  exports: Record<string, { types: string; import: string } | string>;
};

const contracts = {
  "./control/gamification": {
    entry: "./src/control/gamification.ts",
    types: "./src/public/gamification.d.ts",
    keys: [
      "connectServer",
      "createInvite",
      "disconnectServer",
      "getAnomalies",
      "getBalance",
      "getHistory",
      "getNeighbors",
      "getRank",
      "getTopN",
      "listInvites",
      "listServers",
      "redeemInviteCode",
      "revokeInvite",
      "rotateScope",
      "seedBuiltinBadges",
      "transferTokens",
      "updateScore",
    ],
  },
  "./control/gamification-db": {
    entry: "./src/control/gamificationDb.ts",
    types: "./src/public/gamificationDb.d.ts",
    keys: ["getConnectedServerByKeyHash"],
  },
  "./control/gamification-notifications": {
    entry: "./src/control/gamificationNotifications.ts",
    types: "./src/public/gamificationNotifications.d.ts",
    keys: ["createBadgeNotificationStream"],
  },
  "./gamification/profile": {
    entry: "./src/gamification/profile.ts",
    types: "./src/public/gamificationProfile.d.ts",
    keys: ["getBadgeDefinitions", "getBadges", "getXp"],
  },
  "./gamification/rules": {
    entry: "./src/gamification/rules.ts",
    types: "./src/public/gamificationRules.d.ts",
    keys: ["calculateLevel"],
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

function sourceFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (["dist", "node_modules", ".turbo"].includes(entry.name)) return [];
    const target = path.join(dir, entry.name);
    return entry.isDirectory() ? sourceFiles(target) : /\.[cm]?[jt]sx?$/.test(entry.name) ? [target] : [];
  });
}

test("gamification contracts expose exact runtime and declaration keys", async () => {
  for (const [subpath, contract] of Object.entries(contracts)) {
    assert.deepEqual(manifest.exports[subpath], {
      types: contract.types,
      import: contract.entry,
    });
    const runtime = await import(pathToFileURL(path.join(packageRoot, contract.entry)).href);
    assert.deepEqual(Object.keys(runtime).sort(), [...contract.keys].sort(), `${subpath} runtime`);
    const declaration = fs.readFileSync(path.join(packageRoot, contract.types), "utf8");
    assert.deepEqual(declaredValueKeys(declaration).sort(), [...contract.keys].sort(), `${subpath} types`);
  }
});

test("gamification DB, rules, and request lifecycle ownership stay separated", () => {
  const exports = Object.values(manifest.exports).map((entry) =>
    typeof entry === "string" ? entry : entry.import,
  );
  assert.equal(exports.includes("./src/lib/gamification/index.ts"), false);
  assert.equal(exports.includes("./src/lib/db/gamification.ts"), false);

  const forbiddenControl = /@orbit\/core\/control\/gamification(?:-db|-notifications)?(?=["'])/;
  for (const root of ["apps/gateway", "apps/realtime", "apps/worker", "packages/inference"]) {
    for (const file of sourceFiles(path.join(repoRoot, root))) {
      assert.doesNotMatch(fs.readFileSync(file, "utf8"), forbiddenControl, file);
    }
  }

  const notificationConsumers = sourceFiles(path.join(repoRoot, "apps"))
    .filter((file) => fs.readFileSync(file, "utf8").includes("core/control/gamification-notifications"))
    .map((file) => path.relative(repoRoot, file).split(path.sep).join("/"));
  assert.deepEqual(notificationConsumers, [
    "apps/control/src/gamification/handlers/notifications.handler.ts",
  ]);
});
