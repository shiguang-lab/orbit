import { apiFetch, isServerUp } from "./api.mjs";

export class ServerOfflineError extends Error {
  constructor(message = "Server is offline and operation requires HTTP runtime") {
    super(message);
    this.name = "ServerOfflineError";
    this.exitCode = 3;
  }
}

function makeHttpContext(opts) {
  return {
    kind: "http",
    api: (path, fetchOpts = {}) => apiFetch(path, { ...opts, ...fetchOpts }),
    baseUrl: opts.baseUrl,
  };
}

async function importDbModules() {
  const { getCombos } = await import("@shiguang-gateway/core-domain/db/combos");
  return { combos: { getCombos } };
}

async function makeDbContext() {
  const modules = await importDbModules();
  return { kind: "db", db: modules };
}

export async function withRuntime(fn, opts = {}) {
  const up = await isServerUp(opts);
  if (up) {
    return await fn(makeHttpContext(opts));
  }

  return fn(await makeDbContext());
}

export async function withHttp(fn, opts = {}) {
  const up = await isServerUp(opts);
  if (!up) throw new ServerOfflineError();
  return fn(makeHttpContext(opts));
}
