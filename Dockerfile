# syntax=docker/dockerfile:1.7

FROM node:22-bookworm-slim AS build
WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.28.0 --activate

# Copy manifests first so dependency installation remains cacheable.
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY apps/bff/package.json apps/bff/package.json
COPY packages/config/package.json packages/config/package.json
COPY packages/contracts/package.json packages/contracts/package.json
COPY packages/ui/package.json packages/ui/package.json
RUN pnpm install --frozen-lockfile

COPY . .
ARG VITE_AUTH_MODE=shiguang
ENV VITE_AUTH_MODE=${VITE_AUTH_MODE}
RUN pnpm build \
  && pnpm deploy --legacy --filter @omniroute/bff --prod /tmp/bff-runtime

FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    BFF_HOST=0.0.0.0 \
    BFF_PORT=8787 \
    ADMIN_STATIC_DIR=/app/apps/admin/dist \
    NODE_OPTIONS=--enable-source-maps

# pnpm deploy produces a pruned, self-contained BFF runtime (including workspace
# config/contracts packages). No database, .env, or build toolchain is included.
COPY --from=build /tmp/bff-runtime ./
COPY --from=build /app/apps/admin/dist ./apps/admin/dist
# The proxy deployment serves the static provider registry locally. Keep the
# generated registry data beside the compiled BFF because pnpm deploy only
# copies package runtime files and does not include source-side JSON assets.
COPY --from=build /app/apps/bff/src/lib/static-catalog.json ./dist/lib/static-catalog.json
COPY --from=build /app/apps/bff/src/lib/static-models.json ./dist/lib/static-models.json
USER node

EXPOSE 8787
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:8787/api/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "dist/index.js"]
