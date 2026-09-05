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

FROM node:22-bookworm-slim AS runtime-base
WORKDIR /app
ENV NODE_ENV=production \
    TSX_TSCONFIG_PATH=/app/packages/server-runtime/tsconfig.json \
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
COPY --from=build --chown=node:node /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml /app/turbo.json /app/tsconfig.base.json ./
COPY --from=build --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/apps/edge-gateway ./apps/edge-gateway
COPY --from=build --chown=node:node /app/apps/control-api ./apps/control-api
COPY --from=build --chown=node:node /app/apps/realtime ./apps/realtime
COPY --from=build --chown=node:node /app/apps/worker ./apps/worker
COPY --from=build --chown=node:node /app/apps/importer ./apps/importer
COPY --from=build --chown=node:node /app/packages ./packages
COPY --from=build --chown=node:node /app/scripts ./scripts
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 8787 8788 8790 20132
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const p=process.env.APP_NAME; const port=p==='edge-gateway'?process.env.EDGE_GATEWAY_PORT:p==='control-api'?process.env.CONTROL_API_PORT:p==='realtime'?process.env.REALTIME_PORT:null; if(!port) process.exit(0); fetch('http://127.0.0.1:'+port+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

FROM runtime-base AS edge-gateway
ENV APP_NAME=edge-gateway
CMD ["node", "--import", "/app/node_modules/.pnpm/tsx@4.23.13/node_modules/tsx/dist/loader.mjs", "apps/edge-gateway/dist/index.js"]

FROM runtime-base AS control-api
ENV APP_NAME=control-api
CMD ["node", "--import", "/app/node_modules/.pnpm/tsx@4.23.13/node_modules/tsx/dist/loader.mjs", "apps/control-api/dist/index.js"]

FROM runtime-base AS realtime
ENV APP_NAME=realtime
CMD ["node", "--import", "/app/node_modules/.pnpm/tsx@4.23.13/node_modules/tsx/dist/loader.mjs", "apps/realtime/dist/index.js"]

FROM runtime-base AS worker
ENV APP_NAME=worker
CMD ["node", "--import", "/app/node_modules/.pnpm/tsx@4.23.13/node_modules/tsx/dist/loader.mjs", "apps/worker/dist/index.js"]

FROM runtime-base AS importer
ENV APP_NAME=importer
ENTRYPOINT ["node", "--import", "/app/node_modules/.pnpm/tsx@4.23.13/node_modules/tsx/dist/loader.mjs", "apps/importer/dist/index.js"]

# The published single tag is the edge image. Production compose uses the
# explicit targets above for each independently deployable service.
FROM edge-gateway AS default

FROM nginx:1.27-alpine AS admin
COPY --from=build /app/apps/admin/dist /usr/share/nginx/html
COPY deploy/admin-nginx.conf /etc/nginx/conf.d/default.conf
