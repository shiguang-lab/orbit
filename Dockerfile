# Multi-target production image. Each target below is a separately deployable
# service image; no launcher selects an application at runtime and no sibling
# checkout is required in the container.
# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN --mount=type=cache,id=shiguang-gateway-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
# COPY includes ignored build output when building from a developer checkout.
# Remove it before compiling so stale legacy route bundles cannot enter the image.
RUN find apps packages -type d -name dist -prune -exec rm -rf {} +
RUN pnpm build
# Create a deployable production tree instead of copying the complete workspace
# (including admin/docs/build tooling) into every server image. The legacy mode
# is required because this workspace uses linked, rather than injected, packages.
RUN --mount=type=cache,id=shiguang-gateway-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --legacy --filter @shiguang-gateway/worker --prod /app/runtime
# The runtime base is shared by all service targets, so its pnpm store must
# contain the production dependency closure of every deployable app. Keep the
# worker deployment as the base and merge the other app closures into its
# .pnpm store; app-local link trees below then resolve all direct dependencies
# without copying the complete development workspace.
RUN --mount=type=cache,id=shiguang-gateway-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --legacy --filter @shiguang-gateway/edge-gateway --prod /app/runtime-edge \
    && pnpm deploy --legacy --filter @shiguang-gateway/control-api --prod /app/runtime-control \
    && pnpm deploy --legacy --filter @shiguang-gateway/realtime --prod /app/runtime-realtime \
    && pnpm deploy --legacy --filter @shiguang-gateway/importer --prod /app/runtime-importer \
    && mkdir -p /app/runtime/node_modules/.pnpm \
    && for closure in /app/runtime-edge /app/runtime-control /app/runtime-realtime /app/runtime-importer; do \
         cp -a "$closure/node_modules/.pnpm/." /app/runtime/node_modules/.pnpm/; \
       done

# Collect every workspace package with the same runtime layout. Preserve pnpm's
# relative links; omit unrelated documentation/tests from ordinary packages.
RUN node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
for (const name of fs.readdirSync('/app/packages')) {
  const source = path.join('/app/packages', name);
  if (!fs.existsSync(path.join(source, 'package.json'))) continue;
  const target = path.join('/app/runtime-packages', name);
  fs.mkdirSync(target, { recursive: true });
  const runtimeEntries = new Set(['package.json', 'src', 'dist', 'types', 'node_modules']);
  function includeExports(value) {
    if (typeof value === 'string' && value.startsWith('./')) runtimeEntries.add(value.slice(2).split('/')[0]);
    else if (value && typeof value === 'object') for (const child of Object.values(value)) includeExports(child);
  }
  includeExports(JSON.parse(fs.readFileSync(path.join(source, 'package.json'), 'utf8')).exports);
  const entries = name === 'open-sse' ? fs.readdirSync(source) : fs.readdirSync(source)
    .filter(entry => runtimeEntries.has(entry) || /^tsconfig.*\.json$/.test(entry));
  for (const entry of entries) fs.cpSync(path.join(source, entry), path.join(target, entry), { recursive: true, verbatimSymlinks: true });
}
const openapi = '/app/runtime-packages/core-domain/docs';
fs.mkdirSync(openapi, { recursive: true });
fs.copyFileSync('/app/packages/core-domain/docs/openapi.yaml', path.join(openapi, 'openapi.yaml'));
NODE

FROM node:22-bookworm-slim AS runtime-base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    TSX_TSCONFIG_PATH=/app/packages/http-kernel/tsconfig.json \
    APP_NAME=edge-gateway \
    EDGE_GATEWAY_HOST=0.0.0.0 \
    EDGE_GATEWAY_PORT=8787 \
    CONTROL_API_HOST=0.0.0.0 \
    CONTROL_API_PORT=8788 \
    REALTIME_HOST=0.0.0.0 \
    REALTIME_PORT=8790 \
    LIVE_WS_HOST=0.0.0.0 \
    LIVE_WS_PORT=20132 \
    DATA_DIR=/app/data \
    SQLITE_FILE=/app/data/storage.sqlite \
    NODE_OPTIONS=--enable-source-maps
COPY --from=build --chown=node:node /app/runtime/ ./
COPY --from=build --chown=node:node /app/apps/edge-gateway/dist ./apps/edge-gateway/dist
COPY --from=build --chown=node:node /app/apps/control-api/dist ./apps/control-api/dist
COPY --from=build --chown=node:node /app/apps/realtime/dist ./apps/realtime/dist
COPY --from=build --chown=node:node /app/apps/worker/dist ./apps/worker/dist
COPY --from=build --chown=node:node /app/apps/importer/dist ./apps/importer/dist
# Each app has a small pnpm link tree for its direct dependencies (for
# example realtime imports fastify directly). Keep these link trees while the
# package contents remain shared in the deployed production store above.
COPY --from=build --chown=node:node /app/apps/edge-gateway/node_modules ./apps/edge-gateway/node_modules
COPY --from=build --chown=node:node /app/apps/control-api/node_modules ./apps/control-api/node_modules
COPY --from=build --chown=node:node /app/apps/realtime/node_modules ./apps/realtime/node_modules
COPY --from=build --chown=node:node /app/apps/worker/node_modules ./apps/worker/node_modules
COPY --from=build --chown=node:node /app/apps/importer/node_modules ./apps/importer/node_modules
# App and package links resolve to this complete canonical runtime package tree.
COPY --from=build --chown=node:node /app/runtime-packages ./packages
COPY --from=build --chown=node:node /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build --chown=node:node /app/apps/edge-gateway/package.json ./apps/edge-gateway/package.json
COPY --from=build --chown=node:node /app/apps/control-api/package.json ./apps/control-api/package.json
COPY --from=build --chown=node:node /app/apps/realtime/package.json ./apps/realtime/package.json
COPY --from=build --chown=node:node /app/apps/worker/package.json ./apps/worker/package.json
COPY --from=build --chown=node:node /app/apps/importer/package.json ./apps/importer/package.json
# Edge-owned route modules are loaded from source by the tsx catch-all loader.
COPY --from=build --chown=node:node /app/apps/edge-gateway/src/routes ./apps/edge-gateway/src/routes
# Validate the final image filesystem, not the build workspace: all production
# dependencies must resolve, every workspace link and export must exist.
RUN node <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');
const packageDirs = fs.readdirSync('/app/packages').map(name => path.join('/app/packages', name))
  .filter(dir => fs.existsSync(path.join(dir, 'package.json')));
for (const dir of packageDirs) {
  const { name } = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8'));
  const link = path.join('/app/node_modules', name);
  fs.mkdirSync(path.dirname(link), { recursive: true });
  try { fs.unlinkSync(link); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  fs.symlinkSync(dir, link);
}
const appDirs = ['edge-gateway', 'control-api', 'realtime', 'worker', 'importer'].map(name => path.join('/app/apps', name));
let checkedDependencies = 0;
let checkedExports = 0;
for (const dir of [...appDirs, ...packageDirs]) {
  const manifestPath = path.join(dir, 'package.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const requireFrom = createRequire(manifestPath);
  for (const name of Object.keys(manifest.dependencies || {})) {
    const candidates = requireFrom.resolve.paths(name) || [];
    const found = candidates.map(base => path.join(base, name, 'package.json')).find(file => fs.existsSync(file));
    if (!found) throw new Error('Missing production dependency ' + manifest.name + ' -> ' + name);
    checkedDependencies++;
  }
  const scope = path.join(dir, 'node_modules', '@shiguang-gateway');
  if (fs.existsSync(scope)) for (const name of fs.readdirSync(scope)) {
    const link = path.join(scope, name);
    if (!fs.existsSync(path.join(link, 'package.json'))) throw new Error('Broken workspace link: ' + link);
    fs.realpathSync(link);
  }
  function checkExports(value) {
    if (typeof value === 'string') {
      if (!value.startsWith('./') || !fs.existsSync(path.join(dir, value))) {
        throw new Error('Missing export ' + manifest.name + ' -> ' + value);
      }
      checkedExports++;
    } else if (value && typeof value === 'object') {
      for (const child of Object.values(value)) checkExports(child);
    }
  }
  checkExports(manifest.exports);
}
console.log(JSON.stringify({ workspacePackages: packageDirs.length, checkedDependencies, checkedExports, status: 'PASS' }));
NODE
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 8787 8788 8790 20132
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const p=process.env.APP_NAME; const port=p==='edge-gateway'?process.env.EDGE_GATEWAY_PORT:p==='control-api'?process.env.CONTROL_API_PORT:p==='realtime'?process.env.REALTIME_PORT:p==='worker'?(process.env.WORKER_COMMAND_PORT||'8791'):null; if(!port) process.exit(1); fetch('http://127.0.0.1:'+port+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

FROM runtime-base AS edge-gateway
ENV APP_NAME=edge-gateway
CMD ["node", "--import", "tsx", "apps/edge-gateway/dist/main.js"]

FROM runtime-base AS control-api
ENV APP_NAME=control-api
CMD ["node", "--import", "tsx", "apps/control-api/dist/main.js"]

FROM runtime-base AS realtime
ENV APP_NAME=realtime
CMD ["node", "--import", "tsx", "apps/realtime/dist/main.js"]

FROM runtime-base AS worker
ENV APP_NAME=worker
CMD ["node", "--import", "tsx", "apps/worker/dist/main.js"]

FROM runtime-base AS importer
ENV APP_NAME=importer
ENTRYPOINT ["node", "--import", "tsx", "apps/importer/dist/main.js"]

# The published single tag is the edge image. Production compose uses the
# explicit targets above for each independently deployable service.
FROM edge-gateway AS default

FROM nginx:1.27-alpine AS admin
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY deploy/admin-nginx.conf /etc/nginx/conf.d/default.conf
