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
  const [combos, recovery] = await Promise.all([
    import("@shiguang-gateway/core-domain/runtime/combos-db"),
    import("@shiguang-gateway/core-domain/runtime/recovery-db"),
  ]);
  return { combos, recovery };
}

async function makeDbContext() {
  const modules = await importDbModules();
  return { kind: "db", db: modules };
}

export async function withRuntime(fn, opts = {}) {
  const requireServer = opts.requireServer === true;
  const preferDb = opts.preferDb === true;

  if (!preferDb) {
    const up = await isServerUp(opts);
    if (up) {
      return await fn(makeHttpContext(opts));
    }
    if (requireServer) {
      throw new ServerOfflineError();
    }
  }

  return fn(await makeDbContext());
}

export async function withHttp(fn, opts = {}) {
  const up = await isServerUp(opts);
  if (!up) throw new ServerOfflineError();
  return fn(makeHttpContext(opts));
}

export async function withDb(fn) {
  return fn(await makeDbContext());
}
