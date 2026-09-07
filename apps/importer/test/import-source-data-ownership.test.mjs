import assert from "node:assert/strict";
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { spawnSync } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import test from "node:test";
import { fileURLToPath } from "node:url";

const appRoot = fileURLToPath(new URL("..", import.meta.url));
const repoRoot = dirname(dirname(appRoot));

test("importer app owns and runs the source-data import", () => {
  const workspace = mkdtempSync(join(tmpdir(), "source-data-importer-"));
  const source = join(workspace, "source");
  const target = join(workspace, "target");
  try {
    mkdirSync(source, { recursive: true });
    const db = new DatabaseSync(join(source, "storage.sqlite"));
    db.exec("CREATE TABLE sample (id INTEGER PRIMARY KEY, value TEXT)");
    db.prepare("INSERT INTO sample (value) VALUES (?)").run("real-data");
    db.close();
    writeFileSync(join(source, "server.env"), "REAL_DATA=1\n", "utf8");
    mkdirSync(join(source, "bin", "cliproxyapi-version"), { recursive: true });
    writeFileSync(join(source, "bin", "cliproxyapi-version", "cli-proxy-api"), "executable-content", { mode: 0o755 });
    symlinkSync("/app/data/bin/cliproxyapi-version/cli-proxy-api", join(source, "bin", "cliproxyapi"));
    symlinkSync("cliproxyapi", join(source, "bin", "relative-cli"));

    const result = spawnSync(
      "pnpm",
      ["--filter", "@shiguang-gateway/importer", "run", "import", "--", "--source-data-dir", source, "--target-data-dir", target],
      { cwd: repoRoot, encoding: "utf8" },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(join(target, "storage.sqlite")), true);
    const manifest = JSON.parse(readFileSync(join(target, "gateway-import-manifest.json"), "utf8"));
    assert.equal(manifest.sqliteIntegrity, "ok");
    assert.equal(manifest.sourceSnapshot, "frozen-file-copy");
    for (const name of ["cliproxyapi", "relative-cli"]) {
      const copied = join(target, "bin", name);
      assert.equal(lstatSync(copied).isSymbolicLink(), false);
      assert.equal(readFileSync(copied, "utf8"), "executable-content");
      assert.equal(lstatSync(copied).mode & 0o111, 0o111);
      assert.ok(manifest.files.some((file) => file.path === `bin/${name}`));
    }
  } finally {
    rmSync(workspace, { recursive: true, force: true });
  }
});

for (const scenario of ["escape", "container-escape", "cycle", "directory-escape"]) {
  test(`importer rejects ${scenario} links before replacing target data`, () => {
    const workspace = mkdtempSync(join(tmpdir(), "source-data-links-"));
    const source = join(workspace, "source");
    const target = join(workspace, "target");
    try {
      mkdirSync(source);
      mkdirSync(target);
      writeFileSync(join(target, "keep.txt"), "original");
      const db = new DatabaseSync(join(source, "storage.sqlite"));
      db.exec("CREATE TABLE sample (id INTEGER)");
      db.close();
      writeFileSync(join(workspace, "outside"), "outside");
      if (scenario === "cycle") {
        symlinkSync("second", join(source, "link"));
        symlinkSync("link", join(source, "second"));
      } else if (scenario === "directory-escape") {
        symlinkSync(workspace, join(source, "directory"));
        symlinkSync("directory/outside", join(source, "link"));
      } else {
        symlinkSync(scenario === "escape" ? "../outside" : "/app/data/../outside", join(source, "link"));
      }
      const result = spawnSync(process.execPath, [join(appRoot, "src", "import-source-data.mjs"),
        "--source-data-dir", source, "--target-data-dir", target, "--replace"], { encoding: "utf8" });
      assert.notEqual(result.status, 0);
      assert.match(result.stderr, /symbolic link/);
      assert.equal(readFileSync(join(target, "keep.txt"), "utf8"), "original");
    } finally {
      rmSync(workspace, { recursive: true, force: true });
    }
  });
}

test("deployable importer source does not escape to root scripts", () => {
  assert.equal(existsSync(join(repoRoot, "scripts", "import-source-data.mjs")), false);
  assert.match(readFileSync(join(appRoot, "src", "main.ts"), "utf8"), /\.\/import-source-data\.mjs/);
  assert.doesNotMatch(readFileSync(join(appRoot, "src", "main.ts"), "utf8"), /\.\.\/\.\.\/\.\.\/scripts/);
  const rootManifest = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
  assert.equal(
    rootManifest.scripts["import:source-data"],
    "pnpm --filter @shiguang-gateway/importer run import",
  );
  assert.match(readFileSync(join(repoRoot, "scripts", "audit-app-boundaries.mjs"), "utf8"), /app-imports-root-script/);
});
