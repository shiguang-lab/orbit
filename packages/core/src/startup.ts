/** Persisted-state initialization that applications run before loading domain services.
 *
 * HTTP composition belongs to each application; this module exposes
 * the explicit startup work required before an application begins serving requests.
 */
import { randomBytes } from "node:crypto";
import { getPersistedSecret, persistSecret } from "./lib/db/secrets.js";

function toBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

function toHex(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("hex");
}

export async function ensureSecrets(): Promise<void> {
  if (!process.env.JWT_SECRET?.trim()) {
    const persisted = getPersistedSecret("jwtSecret");
    const generated = persisted ?? toBase64(randomBytes(48));
    process.env.JWT_SECRET = generated;
    if (!persisted) persistSecret("jwtSecret", generated);
  }

  if (!process.env.API_KEY_SECRET?.trim()) {
    const persisted = getPersistedSecret("apiKeySecret");
    const generated = persisted ?? toHex(randomBytes(32));
    process.env.API_KEY_SECRET = generated;
    if (!persisted) persistSecret("apiKeySecret", generated);
  }
}

/** Complete legacy usage-storage migrations before request handlers are loaded. */
export async function initializeUsageStorage(): Promise<void> {
  const usageStorage = await import("./lib/usage/migrations.js");
  await usageStorage.initializeUsageStorage();
}
