import { existsSync } from "node:fs";

/**
 * Detect Termux even though its Node.js runtime normally reports `linux`.
 *
 * @param {NodeJS.ProcessEnv | Record<string, string | undefined>} [env]
 * @param {(path: string) => boolean} [pathExists]
 */
export function isTermux(env = process.env, pathExists = existsSync) {
  if (env?.TERMUX_VERSION) return true;
  if (typeof env?.PREFIX === "string" && env.PREFIX.includes("com.termux")) return true;

  try {
    return pathExists("/data/data/com.termux");
  } catch {
    return false;
  }
}
