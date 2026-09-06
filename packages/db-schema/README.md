# `@shiguang-gateway/db-schema`

This package is the canonical database contract for the deployable apps.  It
contains one ORM-neutral entity definition for every governed table, while the
SQL that creates an app-owned table remains in that app. The gamification
bootstrap is the one shared schema helper (`src/gamification.ts`) because both
the control and edge runtimes may access its tables; callers provide their own
SQLite executor.

## Entity catalog

Every table that is part of an app boundary is represented by an
`EntityDefinition` in `src/entities/`:

- `control.entity.ts` — control-plane configuration and operator-managed data,
  including control-api-owned audit, playground, plugin metric, gamification,
  evaluation suite/case/run, and model-assessment/health tables
- `edge.entity.ts` — request-path data owned by `edge-gateway`
- `worker.entity.ts` — asynchronous jobs, usage, logs, and model data owned by
  `worker`

The edge catalog includes the shared `compression_analytics` receipt stream and
its `compression_engine_breakdown` rows. They are written by the streaming
request path and read by control/realtime diagnostics, so their complete
receipt/RTK column shape is kept here rather than re-declared by consumers.

It also includes `semantic_cache` and its `cache_metrics` counters. The edge
request pipeline owns cache writes and hit accounting, while control-api reads
and invalidates entries for operator-facing cache management. Their canonical
column definitions therefore belong to the shared catalog even though cache
queries remain outside this package.

Session stickiness and reasoning replay are likewise shared runtime contracts:
`session_model_history` is written/read by the edge `open-sse` request path and
maintained by combo invalidation, while `reasoning_cache` is persisted by the
same streaming path and purged by the worker cleanup job. Their query logic
stays in the consuming package/app; only the physical entity definitions live
here.

`src/index.ts` exports the complete `GATEWAY_TABLES`, `TABLE_OWNERSHIP`, and
`GATEWAY_ENTITIES` catalogs. `assertGatewayEntities()` verifies that every
catalog entry has a matching physical table name, owner, and non-empty column
definition.

The metadata is intentionally ORM-neutral because the runtime uses the shared
synchronous SQLite adapter. Queries and mutations stay in the owning
app/domain implementation. Add every governed table's entity definition,
table constant, and ownership entry here; keep app-specific DDL/initialization
in the owning Nest app rather than in a package migration. Shared bootstrap
helpers must remain executor-based and must not access a database directly.

The coverage audit reports app-private tables separately while they are being
migrated. For example, `cloud_agent_credentials` and `cloud_agent_tasks`
belong only to the `edge-gateway` cloud-agents module and keep their DDL in
that app. If another app starts consuming one, promote it into this catalog
and declare the new ownership contract before sharing it.

## Verification

Run these checks from the repository root after changing the catalog:

```bash
pnpm audit:db-schema-coverage -- --strict
pnpm audit:db-entities
```
