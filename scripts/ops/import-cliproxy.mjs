#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { randomBytes, createHash } from "node:crypto";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";

const runtimeRequire = createRequire(
  path.join(process.cwd(), "apps/control/package.json"),
);
const { load } = await import(
  pathToFileURL(runtimeRequire.resolve("js-yaml")).href
);
const hash = (data) => createHash("sha256").update(data).digest("hex");
const secret = () => randomBytes(32).toString("hex");

/** Import from a stopped source into an unused manager data directory. Never overwrite either. */
export function importCliproxy({
  sourceConfig,
  sourceAuthDir,
  sourceBinary,
  targetDir,
  id,
  name,
  version,
}) {
  if (
    !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/.test(id) ||
    !/^v?\d+\.\d+\.\d+$/.test(version)
  )
    throw new Error("Invalid instance ID or version");
  const original = fs.readFileSync(sourceConfig);
  const config = load(original.toString("utf8"));
  if (!config || typeof config !== "object" || Array.isArray(config))
    throw new Error("Invalid source configuration");
  const port = config.port;
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error("Invalid source port");
  const binary = fs.readFileSync(sourceBinary);
  const finalDir = path.join(targetDir, "instances", id);
  if (fs.existsSync(finalDir))
    throw new Error("Target instance already exists; refusing overwrite");
  fs.mkdirSync(path.dirname(finalDir), { recursive: true, mode: 0o700 });
  const staging = fs.mkdtempSync(path.join(path.dirname(finalDir), ".import-"));
  const credentials = [];
  function copyPrivateTree(source, target, relative = "") {
    fs.mkdirSync(target, { recursive: true, mode: 0o700 });
    for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
      if (entry.isSymbolicLink())
        throw new Error(
          "Source credentials contain a symlink; resolve it before importing",
        );
      const src = path.join(source, entry.name),
        dst = path.join(target, entry.name);
      const rel = path.join(relative, entry.name);
      if (entry.isDirectory()) copyPrivateTree(src, dst, rel);
      else if (entry.isFile()) {
        const data = fs.readFileSync(src);
        fs.writeFileSync(dst, data, { mode: 0o600 });
        if (hash(fs.readFileSync(dst)) !== hash(data))
          throw new Error("Credential copy verification failed");
        credentials.push({ file: rel, sha256: hash(data), bytes: data.length });
      }
    }
  }
  try {
    copyPrivateTree(sourceAuthDir, path.join(staging, "auth"));
    const apiKeys = Array.isArray(config["api-keys"])
      ? [...config["api-keys"]]
      : [];
    const apiKey =
      apiKeys.find(
        (value) => typeof value === "string" && value.length >= 16,
      ) || secret();
    if (!apiKeys.includes(apiKey)) apiKeys.push(apiKey);
    const managementKey = secret();
    const managedConfig = {
      ...config,
      host: "127.0.0.1",
      "auth-dir": path.join(finalDir, "auth"),
      "api-keys": apiKeys,
      "remote-management": {
        ...config["remote-management"],
        "allow-remote": false,
        "secret-key": managementKey,
        "disable-control-panel": true,
      },
      "force-model-prefix": true,
    };
    const release = version.startsWith("v") ? version : `v${version}`;
    const binaryPath = path.join(staging, "versions", release, "cliproxyapi");
    fs.mkdirSync(path.dirname(binaryPath), { recursive: true, mode: 0o700 });
    fs.writeFileSync(binaryPath, binary, { mode: 0o700 });
    if (hash(fs.readFileSync(binaryPath)) !== hash(binary))
      throw new Error("Binary copy verification failed");
    const write = (file, value) =>
      fs.writeFileSync(
        path.join(staging, file),
        JSON.stringify(value, null, 2),
        { mode: 0o600 },
      );
    write("config.yaml", managedConfig);
    fs.writeFileSync(path.join(staging, "source-config.yaml"), original, {
      mode: 0o600,
    });
    write("instance.json", {
      id,
      name,
      port,
      version: release,
      desiredState: "running",
      state: "stopped",
      healthy: false,
      autoStart: true,
      providerExpose: true,
      apiKey,
      managementKey,
      restartCount: 0,
      pid: 0,
      latencyMs: 0,
    });
    const manifest = {
      importedAt: new Date().toISOString(),
      id,
      version: release,
      configSha256: hash(original),
      binarySha256: hash(binary),
      credentials,
    };
    write("import-manifest.json", manifest);
    fs.renameSync(staging, finalDir);
    return {
      id,
      version: release,
      port,
      credentialFiles: credentials.length,
      configSha256: manifest.configSha256,
      binarySha256: manifest.binarySha256,
    };
  } finally {
    if (fs.existsSync(staging)) fs.rmSync(staging, { recursive: true });
  }
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href
) {
  const { values } = parseArgs({
    options: Object.fromEntries(
      [
        "source-config",
        "source-auth-dir",
        "source-binary",
        "target-dir",
        "id",
        "name",
        "version",
      ].map((key) => [key, { type: "string" }]),
    ),
  });
  if (Object.keys(values).length !== 7)
    throw new Error(
      "Provide --source-config --source-auth-dir --source-binary --target-dir --id --name --version; stop the old CPA process and manager first",
    );
  console.log(
    JSON.stringify(
      importCliproxy({
        sourceConfig: values["source-config"],
        sourceAuthDir: values["source-auth-dir"],
        sourceBinary: values["source-binary"],
        targetDir: values["target-dir"],
        id: values.id,
        name: values.name,
        version: values.version,
      }),
    ),
  );
}
