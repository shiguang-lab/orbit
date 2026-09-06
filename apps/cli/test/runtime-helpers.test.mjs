import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import test from "node:test";

import {
  buildNodeHeapArgs,
  buildNodeRuntimeArgs,
  buildServerNodeOptions,
  calibrateHeapFallbackMb,
  resolveMaxOldSpaceMb,
} from "../src/cli/runtime/nodeRuntime.mjs";
import {
  detectNativeBinaryTarget,
  isNativeBinaryCompatible,
} from "../src/cli/runtime/nativeBinaryCompat.mjs";
import { isTermux } from "../src/cli/runtime/platform.mjs";
import { resolveTlsOptions } from "../src/cli/runtime/tlsOptions.mjs";

test("Termux detection accepts env signals and safely falls back to the filesystem", () => {
  assert.equal(isTermux({ TERMUX_VERSION: "0.119" }, () => false), true);
  assert.equal(isTermux({ PREFIX: "/data/data/com.termux/files/usr" }, () => false), true);
  assert.equal(isTermux({}, () => true), true);
  assert.equal(isTermux({}, () => false), false);
  assert.equal(
    isTermux({}, () => {
      throw new Error("unavailable");
    }),
    false
  );
});

test("heap helpers preserve explicit NODE_OPTIONS and calibrate bounded defaults", () => {
  assert.equal(resolveMaxOldSpaceMb("2048"), 2048);
  assert.equal(resolveMaxOldSpaceMb("63", 768), 768);
  assert.equal(resolveMaxOldSpaceMb("invalid"), 512);
  assert.equal(calibrateHeapFallbackMb(0), 512);
  assert.equal(calibrateHeapFallbackMb(8 * 1024 ** 3), 2867);
  assert.equal(calibrateHeapFallbackMb(128 * 1024 ** 3), 4096);

  const explicit = { NODE_OPTIONS: "--enable-source-maps --max-old-space-size=8192" };
  assert.equal(buildServerNodeOptions(explicit, 1024), explicit.NODE_OPTIONS);
  assert.deepEqual(buildNodeHeapArgs(explicit, 1024), []);
  assert.deepEqual(buildNodeRuntimeArgs(explicit, 1024, "/srv/server.js"), [
    "--dns-result-order=ipv4first",
    "/srv/server.js",
  ]);

  const inherited = { NODE_OPTIONS: "--enable-source-maps" };
  assert.equal(
    buildServerNodeOptions(inherited, 1024),
    "--enable-source-maps --max-old-space-size=1024"
  );
  assert.deepEqual(buildNodeHeapArgs(inherited, 1024), ["--max-old-space-size=1024"]);
});

test("TLS helper requires a readable certificate and key pair", () => {
  const warnings = [];
  const warn = (message) => warnings.push(message);
  assert.equal(resolveTlsOptions({}, { warn }), null);
  assert.equal(
    resolveTlsOptions({ SHIGUANG_GATEWAY_TLS_CERT: "/cert.pem" }, { warn }),
    null
  );
  assert.match(warnings.pop(), /both SHIGUANG_GATEWAY_TLS_CERT and SHIGUANG_GATEWAY_TLS_KEY/);

  const reads = [];
  const result = resolveTlsOptions(
    {
      SHIGUANG_GATEWAY_TLS_CERT: " /cert.pem ",
      SHIGUANG_GATEWAY_TLS_KEY: " /key.pem ",
    },
    {
      warn,
      readFileSync(path) {
        reads.push(path);
        return Buffer.from(path);
      },
    }
  );
  assert.deepEqual(reads, ["/cert.pem", "/key.pem"]);
  assert.deepEqual(result, {
    cert: Buffer.from("/cert.pem"),
    key: Buffer.from("/key.pem"),
    certPath: "/cert.pem",
    keyPath: "/key.pem",
  });

  assert.equal(
    resolveTlsOptions(
      { SHIGUANG_GATEWAY_TLS_CERT: "/cert.pem", SHIGUANG_GATEWAY_TLS_KEY: "/key.pem" },
      {
        warn,
        readFileSync() {
          const error = new Error("denied");
          error.code = "EACCES";
          throw error;
        },
      }
    ),
    null
  );
  assert.match(warnings.pop(), /EACCES/);
});

test("native binary detection rejects a mismatched architecture before dlopen", () => {
  const elfX64 = Buffer.alloc(20);
  elfX64.writeUInt32BE(0x7f454c46, 0);
  elfX64[5] = 1;
  elfX64.writeUInt16LE(62, 18);
  assert.deepEqual(detectNativeBinaryTarget(elfX64), {
    platform: "linux",
    architectures: ["x64"],
  });

  const directory = mkdtempSync(join(tmpdir(), "shiguang-cli-native-"));
  const binaryPath = join(directory, "addon.node");
  try {
    writeFileSync(binaryPath, elfX64);
    let dlopenCalls = 0;
    assert.equal(
      isNativeBinaryCompatible(binaryPath, {
        runtimePlatform: "linux",
        runtimeArch: "arm64",
        dlopen() {
          dlopenCalls += 1;
        },
      }),
      false
    );
    assert.equal(dlopenCalls, 0);
    assert.equal(
      isNativeBinaryCompatible(binaryPath, {
        runtimePlatform: "linux",
        runtimeArch: "x64",
        dlopen() {
          dlopenCalls += 1;
        },
      }),
      true
    );
    assert.equal(dlopenCalls, 1);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test("bare --version exits successfully without loading command runtime", () => {
  const cliPath = fileURLToPath(new URL("../src/shiguang-gateway.mjs", import.meta.url));
  const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
  const expectedVersion = JSON.parse(readFileSync(packagePath, "utf8")).version;
  const result = spawnSync(process.execPath, [cliPath, "--version"], {
    encoding: "utf8",
    timeout: 5_000,
  });

  assert.equal(result.error, undefined);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(result.stdout.trim(), expectedVersion);
});
