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
# The compiled OpenAPI route reads this path from process.cwd(). Keep the
# single runtime asset while leaving the rest of the 158 MB source/docs tree out.
COPY --from=build --chown=node:node /app/packages/core-domain/docs/openapi.yaml ./packages/core-domain/docs/openapi.yaml
# tsx follows the HTTP kernel tsconfig while resolving its remaining
# TypeScript source imports, so retain only the small config files it needs.
COPY --from=build --chown=node:node /app/tsconfig.base.json ./tsconfig.base.json
COPY --from=build --chown=node:node /app/packages/http-kernel/tsconfig.json ./packages/http-kernel/tsconfig.json
COPY --from=build --chown=node:node /app/packages/core-domain/tsconfig.json ./packages/core-domain/tsconfig.json
COPY --from=build --chown=node:node /app/packages/http-kernel/src ./packages/http-kernel/src
COPY --from=build --chown=node:node /app/packages/core-domain/src ./packages/core-domain/src
COPY --from=build --chown=node:node /app/packages/open-sse ./packages/open-sse
# Edge-owned route modules are loaded from source by the tsx catch-all loader.
COPY --from=build --chown=node:node /app/apps/edge-gateway/src/routes ./apps/edge-gateway/src/routes
COPY --from=build --chown=node:node /app/packages/http-kernel/package.json ./packages/http-kernel/package.json
COPY --from=build --chown=node:node /app/packages/core-domain/package.json ./packages/core-domain/package.json
COPY --from=build --chown=node:node /app/packages/http-kernel/node_modules ./packages/http-kernel/node_modules
COPY --from=build --chown=node:node /app/packages/core-domain/node_modules ./packages/core-domain/node_modules
COPY --from=build --chown=node:node /app/packages/auth/node_modules ./packages/auth/node_modules
COPY --from=build --chown=node:node /app/packages/web-handler-adapter/node_modules ./packages/web-handler-adapter/node_modules
COPY --from=build --chown=node:node /app/packages/contracts/src ./packages/contracts/src
COPY --from=build --chown=node:node /app/packages/contracts/package.json ./packages/contracts/package.json
COPY --from=build --chown=node:node /app/packages/contracts/tsconfig.json ./packages/contracts/tsconfig.json
COPY --from=build --chown=node:node /app/packages/config/src ./packages/config/src
COPY --from=build --chown=node:node /app/packages/config/package.json ./packages/config/package.json
COPY --from=build --chown=node:node /app/packages/config/tsconfig.json ./packages/config/tsconfig.json
COPY --from=build --chown=node:node /app/packages/cli-profile-config/src ./packages/cli-profile-config/src
COPY --from=build --chown=node:node /app/packages/cli-profile-config/package.json ./packages/cli-profile-config/package.json
COPY --from=build --chown=node:node /app/packages/cli-profile-config/tsconfig.json ./packages/cli-profile-config/tsconfig.json
COPY --from=build --chown=node:node /app/packages/db-schema/src ./packages/db-schema/src
COPY --from=build --chown=node:node /app/packages/db-schema/package.json ./packages/db-schema/package.json
COPY --from=build --chown=node:node /app/packages/db-schema/tsconfig.json ./packages/db-schema/tsconfig.json
COPY --from=build --chown=node:node /app/packages/auth/src ./packages/auth/src
COPY --from=build --chown=node:node /app/packages/realtime-publisher/src ./packages/realtime-publisher/src
COPY --from=build --chown=node:node /app/packages/realtime-publisher/package.json ./packages/realtime-publisher/package.json
COPY --from=build --chown=node:node /app/packages/realtime-publisher/tsconfig.json ./packages/realtime-publisher/tsconfig.json
COPY --from=build --chown=node:node /app/packages/auth/package.json ./packages/auth/package.json
COPY --from=build --chown=node:node /app/packages/auth/tsconfig.json ./packages/auth/tsconfig.json
COPY --from=build --chown=node:node /app/packages/web-handler-adapter/src ./packages/web-handler-adapter/src
COPY --from=build --chown=node:node /app/packages/web-handler-adapter/package.json ./packages/web-handler-adapter/package.json
COPY --from=build --chown=node:node /app/packages/web-handler-adapter/tsconfig.json ./packages/web-handler-adapter/tsconfig.json
RUN rm -f /app/node_modules/@shiguang-gateway/http-kernel /app/node_modules/@shiguang-gateway/core-domain /app/node_modules/@shiguang-gateway/open-sse \
    /app/node_modules/@shiguang-gateway/auth /app/node_modules/@shiguang-gateway/web-handler-adapter \
    /app/node_modules/@shiguang-gateway/contracts /app/node_modules/@shiguang-gateway/config \
    /app/node_modules/@shiguang-gateway/db-schema \
    && ln -s /app/packages/http-kernel /app/node_modules/@shiguang-gateway/http-kernel \
    && ln -s /app/packages/core-domain /app/node_modules/@shiguang-gateway/core-domain \
    && ln -s /app/packages/open-sse /app/node_modules/@shiguang-gateway/open-sse \
    && ln -s /app/packages/auth /app/node_modules/@shiguang-gateway/auth \
    && ln -s /app/packages/web-handler-adapter /app/node_modules/@shiguang-gateway/web-handler-adapter \
    && ln -s /app/packages/contracts /app/node_modules/@shiguang-gateway/contracts \
    && ln -s /app/packages/config /app/node_modules/@shiguang-gateway/config \
    && ln -s /app/packages/db-schema /app/node_modules/@shiguang-gateway/db-schema
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
