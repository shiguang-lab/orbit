import { decrypt, encrypt, isEncryptionEnabled } from "../db/encryption";
import { getLogExportDestinationType } from "./registry";

export const SECRET_PLACEHOLDER = "__stored__";
const keys = (type: string) => getLogExportDestinationType(type)?.secretFields ?? [];
export function requiresEncryptionKey(type: string, config: Record<string, unknown>): boolean {
  return !isEncryptionEnabled() && keys(type).some((key) => typeof config[key] === "string" && Boolean(config[key]));
}
export function encryptDestinationConfig(type: string, config: Record<string, unknown>) {
  const out = { ...config };
  for (const key of keys(type)) if (typeof out[key] === "string" && out[key]) out[key] = encrypt(out[key] as string) ?? "";
  return out;
}
export function decryptDestinationConfig(type: string, config: Record<string, unknown>) {
  const out = { ...config };
  for (const key of keys(type)) if (typeof out[key] === "string" && out[key]) out[key] = decrypt(out[key] as string, { quiet: true }) ?? "";
  return out;
}
export function redactDestinationConfig(type: string, config: Record<string, unknown>) {
  const out = { ...config };
  for (const key of keys(type)) { if (typeof out[key] === "string" && out[key]) out[key] = SECRET_PLACEHOLDER; else delete out[key]; }
  return out;
}
export function mergeDestinationConfig(type: string, stored: Record<string, unknown>, incoming: Record<string, unknown>) {
  const out = { ...incoming };
  for (const key of keys(type)) if (out[key] === SECRET_PLACEHOLDER || out[key] === undefined) { if (stored[key] !== undefined) out[key] = stored[key]; else delete out[key]; }
  return out;
}
