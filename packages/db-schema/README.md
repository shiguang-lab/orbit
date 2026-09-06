# `@shiguang-gateway/db-schema`

This package is the canonical database contract shared by the deployable apps.

## Entity catalog

Every table that is part of an app boundary is represented by an
`EntityDefinition` in `src/entities/`:

- `control.entity.ts` — control-plane configuration and operator-managed data
- `edge.entity.ts` — request-path data owned by `edge-gateway`
- `worker.entity.ts` — asynchronous jobs, usage, logs, and model data owned by
  `worker`

The edge catalog includes the shared `compression_analytics` receipt stream and
its `compression_engine_breakdown` rows. They are written by the streaming
request path and read by control/realtime diagnostics, so their complete
receipt/RTK column shape is kept here rather than re-declared by consumers.

`src/index.ts` exports the complete `GATEWAY_TABLES`, `TABLE_OWNERSHIP`, and
`GATEWAY_ENTITIES` catalogs. `assertGatewayEntities()` verifies that every
catalog entry has a matching physical table name, owner, and non-empty column
definition.

The metadata is intentionally ORM-neutral because the runtime uses the shared
synchronous SQLite adapter. SQL migrations remain the installation mechanism;
queries and mutations stay in the owning app/domain implementation. Do not
add app-only tables here. When a table is read or written across app
boundaries, add its entity definition, table constant, ownership entry, and
coverage evidence in the same change.

The coverage audit reports app-private tables separately. For example,
`cloud_agent_credentials` and `cloud_agent_tasks` belong only to the
`edge-gateway` cloud-agents module, so they deliberately remain outside this
shared package. Adding another app consumer requires promoting the table into
this catalog rather than bypassing the entity contract.

## Verification

Run these checks from the repository root after changing the catalog:

```bash
pnpm audit:db-schema-coverage -- --strict
pnpm audit:db-entities
```
