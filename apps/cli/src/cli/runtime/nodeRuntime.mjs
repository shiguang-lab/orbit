/** Resolve a V8 heap ceiling in MB, accepting only the supported range. */
export function resolveMaxOldSpaceMb(value, fallback = 512) {
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) && parsed >= 64 && parsed <= 16384 ? parsed : fallback;
}

/** Derive a default heap ceiling from physical memory, clamped to 512–4096 MB. */
export function calibrateHeapFallbackMb(totalmemBytes) {
  const totalMb = Number(totalmemBytes) / (1024 * 1024);
  if (!Number.isFinite(totalMb) || totalMb <= 0) return 512;
  return Math.min(4096, Math.max(512, Math.floor(totalMb * 0.35)));
}

const MAX_OLD_SPACE_FLAG = "--max-old-space-size";

export function envHasExplicitHeapFlag(env) {
  const sourceEnv = arguments.length === 0 ? process.env : env;
  return String(sourceEnv?.NODE_OPTIONS || "").includes(MAX_OLD_SPACE_FLAG);
}

/** Preserve caller NODE_OPTIONS and only add a heap ceiling when none is present. */
export function buildServerNodeOptions(env = process.env, memoryLimit) {
  const existing = String(env?.NODE_OPTIONS || "").trim();
  if (existing.includes(MAX_OLD_SPACE_FLAG)) return existing;
  return `${existing} ${MAX_OLD_SPACE_FLAG}=${memoryLimit}`.trim();
}

export function buildNodeHeapArgs(env = process.env, memoryLimit) {
  return envHasExplicitHeapFlag(env) ? [] : [`${MAX_OLD_SPACE_FLAG}=${memoryLimit}`];
}

export function buildNodeRuntimeArgs(env = process.env, memoryLimit, serverPath) {
  return ["--dns-result-order=ipv4first", ...buildNodeHeapArgs(env, memoryLimit), serverPath];
}
