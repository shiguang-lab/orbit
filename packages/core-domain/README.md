# Core domain (legacy compatibility package)

`@shiguang-gateway/core-domain` is the legacy Next.js server/domain package. It
currently contains the old App Router tree (`src/app`), domain services, database
access, SSE adapters, CLI helpers, and shared UI code. It is kept as a compatibility
boundary while those areas are migrated to the deployable apps and focused packages.

## Boundary rules

- New NestJS controllers, modules, providers, guards, interceptors, and middleware
  belong in the owning app (or in a focused Nest package), not in this package.
- New transport adapters (Fastify, WebSocket, SSE) belong in the owning app or its
  transport package. `src/app` route handlers are legacy entry points, not a place for
  new server modules.
- Consumers should use an explicit `package.json#exports` subpath. Do not import
  `src/**` files directly or add new wildcard exports.
- The package must not import app source trees. Deployable apps may temporarily use
  the existing explicit compatibility exports while a domain is being migrated.
- Shared contracts and schema definitions belong in `@shiguang-gateway/contracts`
  or `@shiguang-gateway/db-schema`; environment/config primitives belong in
  `@shiguang-gateway/config`.

## Migration order

Migrate one domain at a time: define its public contract, move implementation into a
focused package or app module, update consumers to the public export, then delete the
legacy export. Keep this package free of new dependencies so the legacy surface can
shrink monotonically.

