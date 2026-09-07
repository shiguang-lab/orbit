import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const CLI_APP_ROOT = fileURLToPath(new URL("../..", import.meta.url));
export const CLI_PACKAGE_JSON = fileURLToPath(new URL("../../package.json", import.meta.url));
export const CLI_ENTRY = fileURLToPath(new URL("../orbit.mjs", import.meta.url));
export const CLI_LOCALES_DIR = fileURLToPath(new URL("./locales", import.meta.url));

export function readCliPackage(readFile = readFileSync) {
  return JSON.parse(readFile(CLI_PACKAGE_JSON, "utf8"));
}

export function readCliVersion(readFile = readFileSync) {
  return readCliPackage(readFile).version ?? "unknown";
}

export function cliWorkingDirectory() {
  return dirname(CLI_PACKAGE_JSON);
}
