/** Process bootstrap shared by non-HTTP deployables.
 *
 * HTTP composition lives in `@shiguang-gateway/http-kernel`; this module only
 * restores the persisted signing secrets needed by edge, realtime and worker
 * processes before they load domain services.
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
