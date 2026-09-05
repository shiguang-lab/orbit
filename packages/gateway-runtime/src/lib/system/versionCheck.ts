/**
 * Latest-version discovery + comparison for the dashboard "Update Available" banner.
 *
 * #4100: the banner is gated on `isNewer(latest, current)`. Previously `latest` came
 * ONLY from `npm info shiguangGateway version --json` (the `npm` CLI binary). When that binary
 * is absent (Docker / desktop / locked-down installs) or the registry is unreachable, the
 * call returned null and the banner silently never rendered — even when an update existed.
 *
 * This module keeps the fast `npm` CLI path as the primary source but adds two
 * npm-binary-free HTTP fallbacks, reachable with plain `fetch`. Both endpoints
 * are operator-configurable; no external endpoint is assumed.
 * It logs a warning instead of degrading silently when ALL sources fail. Version parsing
 * is also hardened so a `v`-prefix or pre-release suffix no longer collapses the
 * comparison to `false` via `NaN`.
 */
import { execFile } from "child_process";
import { promisify } from "util";
import { createLogger } from "../../shared/utils/logger.ts";
import { buildNpmExecOptions } from "../services/installers/utils.ts";

const execFileAsync = promisify(execFile);
const log = createLogger("system/versionCheck");

/**
 * npm-binary-free latest-version source: opt-in operator-owned registry JSON.
 *
 * There is intentionally no default public package URL. A standalone
 * deployment must not contact an upstream/npm package feed merely to
 * render an update banner; operators can point this at their own registry.
 */
const NPM_REGISTRY_LATEST_URL = process.env.SHIGUANG_GATEWAY_UPDATE_REGISTRY_URL?.trim() || "";

/**
 * Optional operator-provided release metadata endpoint. Empty by default so a standalone
 * deployment never contacts an upstream repository.
 */
const RELEASES_LATEST_URL = process.env.SHIGUANG_GATEWAY_RELEASES_LATEST_URL?.trim() || "";

const LOOKUP_TIMEOUT_MS = 10_000;
const MAX_VERSION_RESPONSE_BYTES = 16 * 1024;
const LATEST_VERSION_CACHE_TTL_MS = 10 * 60_000;
const MAX_LATEST_VERSION_CACHE_TTL_MS = 10 * 60_000;

type LatestVersionCacheEntry = { value: string; expiresAt: number };

let latestVersionCache: LatestVersionCacheEntry | null = null;
let latestVersionLookup: Promise<string | null> | null = null;
let latestVersionRefresh: Promise<string | null> | null = null;
let latestVersionCacheGeneration = 0;

// The pure semver helpers live in `./versionCompare` (dependency-free) so
// client-reachable modules can import them without pulling this file's
// server-only `child_process` import into the browser bundle. Re-exported here
// for back-compat with existing server-side importers.
export { normalizeVersion, isNewer } from "./versionCompare";

/**
 * Latest published version via the `npm` CLI (fast when npm is on PATH, e.g. source installs).
 *
 * `execFn` is injectable for tests (same pattern as the CLI's own
 * `bin/cli/commands/update.mjs::getLatestVersion()`).
 */
export async function getLatestVersionFromNpmCli(
  execFn: typeof execFileAsync = execFileAsync
): Promise<string | null> {
  if (!process.env.SHIGUANG_GATEWAY_UPDATE_PACKAGE?.trim()) return null;
  try {
    // #5542 — win32 npm is npm.cmd; execFile without a shell throws "spawn npm ENOENT"
    // on Node ≥24 (nodejs/node#52554). buildNpmExecOptions enables the shell on win32.
    // #11885 — `--prefer-online` forces npm to revalidate its HTTP cache against the
    // registry. Without it `npm info` can return a stale cached version, the same known
    // bug class already fixed in the CLI's own copy for #4376 (see that fix's comment in
    // bin/cli/commands/update.mjs::getLatestVersion()) but never mirrored here — this is
    // the function backing the dashboard's "Update Available" banner.
    const { stdout } = await execFn(
      "npm",
      ["info", process.env.SHIGUANG_GATEWAY_UPDATE_PACKAGE.trim(), "version", "--json", "--prefer-online"],
      buildNpmExecOptions(process.platform, { timeoutMs: LOOKUP_TIMEOUT_MS })
    );
    const parsed = JSON.parse(String(stdout).trim());
    return typeof parsed === "string" && parsed ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Latest published version via the npm registry HTTP API. Needs only network access — no
 * `npm` binary — so it works in Docker / desktop / locked-down installs.
 */
async function readBoundedJson(response: Response): Promise<unknown> {
  const declaredLength = Number(response.headers.get("Content-Length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_VERSION_RESPONSE_BYTES) {
    await response.body?.cancel();
    throw new Error("Version metadata response is too large");
  }

  if (!response.body) return response.json();
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_VERSION_RESPONSE_BYTES) {
        await reader.cancel();
        throw new Error("Version metadata response is too large");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const body = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return JSON.parse(new TextDecoder().decode(body));
}

export async function getLatestVersionFromRegistry(
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  if (!NPM_REGISTRY_LATEST_URL) return null;
  try {
    const res = await fetchImpl(NPM_REGISTRY_LATEST_URL, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
    });
    if (!res.ok) return null;
    const data = (await readBoundedJson(res)) as { version?: unknown };
    return typeof data?.version === "string" && data.version ? data.version : null;
  } catch {
    return null;
  }
}

/**
 * Latest published version via an optional operator-owned release endpoint.
 */
export async function getLatestVersionFromReleaseEndpoint(
  fetchImpl: typeof fetch = fetch
): Promise<string | null> {
  try {
    if (!RELEASES_LATEST_URL) return null;
    const res = await fetchImpl(RELEASES_LATEST_URL, {
      signal: AbortSignal.timeout(LOOKUP_TIMEOUT_MS),
      headers: {
        "User-Agent": "shiguangGateway-independent-version-check",
        Accept: "application/json",
      },
    });
    if (!res.ok) return null;
    const data = (await readBoundedJson(res)) as { version?: unknown; tag_name?: unknown };
    const version = data?.version ?? data?.tag_name;
    return typeof version === "string" && version ? version : null;
  } catch {
    return null;
  }
}

/**
 * Resolve the latest published version. Tries the `npm` CLI first (fast on source installs),
 * then the registry HTTP API, then the GitHub releases API — both npm-binary-free. Logs a
 * warning — instead of silently degrading to "no update available" — when ALL sources fail.
 * Thunks are injectable for tests.
 */
export function clearLatestVersionCache(): void {
  latestVersionCache = null;
  latestVersionCacheGeneration += 1;
}

/** Coalesce and briefly cache successful latest-version lookups. */
export async function resolveLatestVersionCached(opts?: {
  lookup?: () => Promise<string | null>;
  bypassCache?: boolean;
  storeResult?: boolean;
  now?: () => number;
  ttlMs?: number;
}): Promise<string | null> {
  const now = opts?.now ?? Date.now;
  if (!opts?.bypassCache && latestVersionCache?.expiresAt > now()) {
    return latestVersionCache.value;
  }

  const inFlight = opts?.bypassCache ? latestVersionRefresh : latestVersionLookup;
  if (inFlight) return inFlight;
  if (opts?.bypassCache) clearLatestVersionCache();

  const generation = latestVersionCacheGeneration;
  const lookup = opts?.lookup ?? resolveLatestVersion;
  const ttlMs = Math.min(
    Math.max(opts?.ttlMs ?? LATEST_VERSION_CACHE_TTL_MS, 0),
    MAX_LATEST_VERSION_CACHE_TTL_MS
  );
  const pending = lookup().then((value) => {
    if (value && opts?.storeResult !== false && latestVersionCacheGeneration === generation) {
      latestVersionCache = { value, expiresAt: now() + ttlMs };
    }
    return value;
  });
  if (opts?.bypassCache) latestVersionRefresh = pending;
  else latestVersionLookup = pending;

  try {
    return await pending;
  } finally {
    if (latestVersionLookup === pending) latestVersionLookup = null;
    if (latestVersionRefresh === pending) latestVersionRefresh = null;
  }
}

export async function resolveLatestVersion(opts?: {
  npmCli?: () => Promise<string | null>;
  registry?: () => Promise<string | null>;
  releaseEndpoint?: () => Promise<string | null>;
}): Promise<string | null> {
  const npmCli = opts?.npmCli ?? getLatestVersionFromNpmCli;
  const registry = opts?.registry ?? (() => getLatestVersionFromRegistry());
  const releaseEndpoint = opts?.releaseEndpoint ?? (() => getLatestVersionFromReleaseEndpoint());

  const viaCli = await npmCli();
  if (viaCli) return viaCli;

  const viaRegistry = await registry();
  if (viaRegistry) return viaRegistry;

  const viaReleaseEndpoint = await releaseEndpoint();
  if (viaReleaseEndpoint) return viaReleaseEndpoint;

  log.warn(
    "Latest-version lookup failed via npm CLI, registry HTTP, and optional release endpoint"
  );
  return null;
}
