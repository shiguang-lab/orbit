# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS source
WORKDIR /workspace
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 make g++ \
    && rm -rf /var/lib/apt/lists/*
RUN corepack enable && corepack prepare pnpm@10.28.0 --activate
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY scripts ./scripts
RUN find apps packages -type d -name dist -prune -exec rm -rf {} +

# Install and compile only the selected application and its workspace
# dependencies. This avoids resolving the console and unrelated service trees
# for every image target.
FROM source AS console-build
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @orbit/console...
RUN pnpm build --filter @orbit/console...

FROM source AS deploy-gateway
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @orbit/gateway...
RUN pnpm build --filter @orbit/gateway...
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --legacy --filter @orbit/gateway --prod /runtime

FROM source AS deploy-control
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @orbit/control...
RUN pnpm build --filter @orbit/control...
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --legacy --filter @orbit/control --prod /runtime

FROM source AS deploy-realtime
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @orbit/realtime...
RUN pnpm build --filter @orbit/realtime...
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --legacy --filter @orbit/realtime --prod /runtime

FROM source AS deploy-worker
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile --filter @orbit/worker...
RUN pnpm build --filter @orbit/worker...
RUN --mount=type=cache,id=orbit-pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm deploy --legacy --filter @orbit/worker --prod /runtime

FROM node:22-bookworm-slim AS runtime-base
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
ENV NODE_ENV=production \
    TSX_TSCONFIG_PATH=/app/tsconfig.runtime.json \
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
RUN printf '%s\n' '{"compilerOptions":{"target":"ES2022","module":"NodeNext","moduleResolution":"NodeNext","experimentalDecorators":true,"emitDecoratorMetadata":true}}' > /app/tsconfig.runtime.json
RUN mkdir -p /app/data && chown node:node /app/data
USER node
EXPOSE 8787 8788 8790 20132
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD node -e "const p=process.env.APP_NAME; const port=p==='gateway'?process.env.EDGE_GATEWAY_PORT:p==='control'?process.env.CONTROL_API_PORT:p==='realtime'?process.env.REALTIME_PORT:p==='worker'?(process.env.WORKER_COMMAND_PORT||'8791'):null; if(!port) process.exit(1); fetch('http://127.0.0.1:'+port+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

FROM runtime-base AS gateway
ENV APP_NAME=gateway
COPY --from=deploy-gateway --chown=node:node /runtime/ ./
CMD ["node", "--import", "tsx", "dist/main.js"]

FROM runtime-base AS control
ENV APP_NAME=control
COPY --from=deploy-control --chown=node:node /runtime/ ./
CMD ["node", "--import", "tsx", "dist/main.js"]

FROM runtime-base AS realtime
ENV APP_NAME=realtime
COPY --from=deploy-realtime --chown=node:node /runtime/ ./
CMD ["node", "--import", "tsx", "dist/main.js"]

FROM runtime-base AS worker
ENV APP_NAME=worker
COPY --from=deploy-worker --chown=node:node /runtime/ ./
CMD ["node", "--import", "tsx", "dist/main.js"]

FROM gateway AS default

FROM nginx:1.27-alpine AS console
COPY --from=console-build /workspace/apps/console/dist /usr/share/nginx/html
COPY deploy/console-nginx.conf /etc/nginx/conf.d/default.conf
