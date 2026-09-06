# Core domain

`@shiguang-gateway/core-domain` provides shared domain and persistence capabilities
used by multiple deployable apps. It does not own HTTP routes, listeners, application
bootstrap, or scheduler policy; those live in `apps/*`.

## Boundary rules

- New NestJS controllers, modules, providers, guards, interceptors, and middleware
  belong in the owning app (or in a focused Nest package), not in this package.
- Transport adapters (Fastify, WebSocket, SSE) belong in the owning app or a focused
  transport package. The package must not contain a route tree or start a listener.
- Consumers should use an explicit `package.json#exports` subpath. Do not import
  `src/**` files directly or add new wildcard exports.
- Deployable apps and focused packages must not import this package's `src/**` paths
  directly; use an explicit `package.json#exports` contract.
- Shared contracts and schema definitions belong in `@shiguang-gateway/contracts`
  or `@shiguang-gateway/db-schema`; environment/config primitives belong in
  `@shiguang-gateway/config`.

## Migration order

For app-specific behavior, define its public contract, move the implementation into
the owning app, update consumers to the public export, then delete the obsolete core
export. Shared implementation remains here only when at least two deployable consumers
need it.
