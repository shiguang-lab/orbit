import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { importCliproxy } from "./import-cliproxy.mjs";

test("CPA import preserves config, credentials and binary and refuses overwrite", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "orbit-cpa-import-"));
  try {
    const sourceConfig = path.join(root, "config.yaml"),
      sourceAuthDir = path.join(root, "auth"),
      sourceBinary = path.join(root, "cpa");
    const original =
      "port: 8317\nproxy-url: http://proxy.internal:7890\nrequest-retry: 3\napi-keys: [existing-private-key]\noauth-model-alias:\n  xai: [{name: grok, alias: shared}]\n";
    fs.writeFileSync(sourceConfig, original);
    fs.mkdirSync(sourceAuthDir);
    const credential = '{"type":"xai","access_token":"private-credential"}';
    fs.writeFileSync(path.join(sourceAuthDir, "account.json"), credential);
    fs.writeFileSync(sourceBinary, "test binary");
    const input = {
      sourceConfig,
      sourceAuthDir,
      sourceBinary,
      targetDir: path.join(root, "target"),
      id: "nas",
      name: "NAS",
      version: "7.2.147",
    };
    const result = importCliproxy(input);
    const target = path.join(input.targetDir, "instances/nas");
    const config = JSON.parse(
      fs.readFileSync(path.join(target, "config.yaml")),
    );
    const state = JSON.parse(
      fs.readFileSync(path.join(target, "instance.json")),
    );
    assert.equal(config["proxy-url"], "http://proxy.internal:7890");
    assert.equal(config["request-retry"], 3);
    assert.deepEqual(config["oauth-model-alias"], {
      xai: [{ name: "grok", alias: "shared" }],
    });
    assert.deepEqual(config["api-keys"], ["existing-private-key"]);
    assert.equal(state.apiKey, "existing-private-key");
    assert.equal(
      state.managementKey,
      config["remote-management"]["secret-key"],
    );
    assert.equal(config["auth-dir"], path.join(target, "auth"));
    assert.equal(
      fs.readFileSync(path.join(target, "auth/account.json"), "utf8"),
      credential,
    );
    assert.equal(fs.readFileSync(sourceConfig, "utf8"), original);
    assert.equal(
      fs.statSync(path.join(target, "instance.json")).mode & 0o777,
      0o600,
    );
    assert.equal(result.credentialFiles, 1);
    assert.ok(!JSON.stringify(result).includes("private"));
    assert.throws(() => importCliproxy(input), /refusing overwrite/);
  } finally {
    fs.rmSync(root, { recursive: true });
  }
});
