import { randomUUID } from "node:crypto";

let cachedToken: string | null = null;

/** Process-local shared secret used by the MITM child process ingest bridge. */
export function getIngestTokenForBootstrap(): string {
  if (cachedToken) return cachedToken;
  const configured = process.env.INSPECTOR_INTERNAL_INGEST_TOKEN;
  cachedToken = configured && configured.length >= 16 ? configured : randomUUID().replace(/-/g, "");
  return cachedToken;
}
