# App domain boundaries

The deployable unit is the boundary. An app owns its listener, lifecycle and
failure policy; packages provide contracts or infrastructure without opening a
port or selecting a surface at runtime.

| App | Owns | Reads/writes | Acceptance |
| --- | --- | --- | --- |
| `edge-gateway` | Public `/v1`, `/v1beta`, A2A and provider execution; no live-dashboard listener | Provider connections, batches/files (through app-owned Nest modules and handlers) | `pnpm --filter @shiguang-gateway/edge-gateway typecheck && pnpm --filter @shiguang-gateway/edge-gateway build && pnpm smoke:split-deployment` |
| `control-api` | Admin `/api`, authz, CRUD, settings, logs, audit commands, free-proxy catalog/promotion and system version/update controls; migrated health route group in `apps/control-api/src/routes/api` | Control-plane tables and read-only usage projections | `pnpm --filter @shiguang-gateway/control-api typecheck && pnpm --filter @shiguang-gateway/control-api build` |
| `realtime` | Live dashboard WebSocket transport (`apps/realtime/src/live-ws`) | Event projections only | `pnpm --filter @shiguang-gateway/realtime typecheck && pnpm --filter @shiguang-gateway/realtime build` |
| `worker` | Schedulers, sync, cleanup and background writes; task manifest/runner in `apps/worker/src/jobs` | Usage, quota, audit and job tables | `pnpm --filter @shiguang-gateway/worker typecheck && pnpm --filter @shiguang-gateway/worker build && pnpm smoke:worker` |
| `importer` | One-shot snapshot import and migration | Import target only | `pnpm --filter @shiguang-gateway/importer typecheck && pnpm --filter @shiguang-gateway/importer build` |
| `admin` | Browser UI; no database access | `contracts` and same-origin APIs | `pnpm --filter @shiguang-gateway/admin typecheck && pnpm --filter @shiguang-gateway/admin build` |

## Shared package rule

`packages/contracts`, `packages/config`, `packages/db-schema`, `packages/network-guard`,
`packages/http-kernel`, `packages/web-route-compat` and `packages/error-sanitization`
are shared dependency leaves. `error-sanitization` contains only transport-neutral
redaction helpers and is consumed directly by multiple deployable apps.
`db-schema` contains the canonical ORM-neutral entity metadata under `src/entities/*.entity.ts`:
physical SQLite table names, verified column definitions, and write ownership. The project currently uses
raw SQLite adapters rather than TypeORM/Drizzle, so these entities deliberately have no decorators, database
connection, Nest module, query, or mutation logic. SQL migrations remain the single runtime migration source
under the database owner; SQL queries and mutations stay in the owning domain service. New shared tables must
first add a verified entity here, while app-only temporary tables stay app-owned and are not exported from this package.

Proxy relay deployment backends (Cloudflare Workers, Deno Deploy, and Vercel)
are control-api-owned Nest handlers under `apps/control-api/src/settings/proxy`;
provider API calls, polling, relay generation, and proxy registration stay in
that app rather than in `core-domain`.

Every deployable server app declares `@shiguang-gateway/db-schema` directly and validates the catalog during startup. This keeps the entity contract active at runtime instead of relying only on audit scripts.
`network-guard` contains pure outbound URL parsing, host classification and SSRF error contracts; it has no
database, framework or application lifecycle dependency. Configuration-backed guard policy remains in the owning
domain service. `packages/core-domain` contains the provider/protocol domain
implementation and exposes only allow-listed subpaths for app-owned workers,
realtime adapters, and the remaining migration seams. Worker scheduling policy and task ordering
live only in `apps/worker/src/jobs`; the package exports implementations, not a
process-wide scheduler registry. `packages/http-kernel` contains only transport-level
Fastify middleware and the compatibility dispatch protocol. Each HTTP app constructs
Nest/Fastify itself; the shared package has no app factory and accepts no app selector.
The free-proxy provider/database primitives are exposed through the explicit
`core-domain/shared/free-proxies` contract: control owns the HTTP catalog and
promotion module, while worker may invoke the same primitives from its explicit
free-proxy scheduler entrypoint. Importing the control contract does not start a
background timer.

### Job control boundary

The `/api/jobs` management surface is intentionally still served by the compatibility
catalog. `JobRegistry` owns process-local timers and handlers, and those handlers are
registered only by `apps/worker`; a control process can update the persisted `jobs.enabled`
flag but cannot safely invoke or stop a worker timer. Moving `run-now`, `enable`, or
`disable` into `control-api` requires a versioned contracts command and a worker-owned
HTTP/IPC command endpoint. Until that contract exists, the job route remains a documented
legacy seam rather than a misleading Nest controller that would report success without
affecting the worker.

The package rule is enforced by `pnpm audit:package-boundaries --strict`: a package must
have at least two workspace consumers and must not contain app-owned route trees. The
legacy `core-domain` and `open-sse` packages currently fail this gate and remain an
explicit migration backlog; new app-only code must not be added to them.

## Entity sharing evidence

Run `pnpm audit:db-entities --json` when changing a table definition. The audit
compiles the canonical entities, resolves transitive workspace consumers, and scans
`apps/*/src` plus package source for SQL table references. In the current graph,
`@shiguang-gateway/db-schema` reaches four deployable apps through the remaining
`core-domain` seam: `control-api`, `edge-gateway`, `realtime`, and `worker`.

The entity write owners are intentionally narrower than those consumers:

| Owner | Entities |
| --- | --- |
| `control-api` | settings, providerConnections, providerNodes, apiKeys, apiKeyGroups, combos, modelComboMappings, webhooks, apiKeyTokenLimits, providerPlans, plugins, modelContextOverrides, modelCapabilityOverrides, tierConfig, tierAssignments, freeProxies, freeProxySyncErrors, reasoningRoutingRules, quotaGroups, quotaPools, quotaAllocations, quotaPoolConnections, quotaAllocationModelCaps |
| `edge-gateway` | batches, files, agenticConversations, conversationTurnNodes, apiKeyTokenCounters, apiKeyTokenLimitResetLogs, providerQuotaState, quotaConsumption |
| `worker` | usageHistory, callLogs, proxyLogs, quotaSnapshots, auditLogs, memories, jobs, modelCapabilities |

The promoted entities have concrete cross-app evidence: edge creates conversation
roots/turn identities while control reads them; control configures token limits,
provider plans, plugins and model capability overrides while edge enforces or executes them; edge owns the
hot-path token/quota ledgers; and worker syncs model capabilities consumed by edge
routing. Runtime-only tables such as `session_model_history` remain package-only
until another deployable app needs them; a shared package import alone is not a
reason to promote an app-private table.

The SQL scan currently finds table references in `core-domain` rather than direct
app source, so the report labels these rows `PASS-indirect-declared-owner`. This is
evidence that the package is shared, not proof that the legacy package has already
enforced each app's write boundary. A domain migration must move its queries and
mutations into the owner app and should make the row `PASS-direct`; an app-only
temporary table must not be added to `db-schema`.

Run `pnpm audit:db-schema-coverage -- --strict` for the broader migration inventory.
It compares static `CREATE TABLE`/`ALTER TABLE` declarations with the canonical
entity catalog and fails if a deployable server app contains SQL for an uncovered
table. Remaining package-only declarations are legacy internals in `core-domain`;
they must be classified as app-private or promoted into `db-schema` as their owning
domain is migrated. New tables are rejected from app code until their classification
is explicit.

Route migration is physical: handlers already accepted by an app live below
that app's `src/routes` tree. The parity audits aggregate those app-owned trees
with the remaining domain handlers, so each move is independently verifiable.

The current migration wave has moved the control auth (status, CSRF, password login,
logout and OIDC), health/status/process-control/system version/update/version-manager/Bifrost controls,
rate-limit toggle, proxy connectivity/registry management, free-proxy catalog/list/stats/sync/
promotion, settings/database maintenance and feature flags, OneProxy compatibility redirects, compression settings,
MCP accessibility configuration, compression run telemetry, Caveman settings alias and rule metadata, provider token refresh,
Qdrant configuration, health, semantic-search diagnostics, cleanup, and embedding-model discovery,
reasoning-routing rule CRUD and policy simulation, Claude Code discovery-alias usage metrics,
task-aware routing configuration and detection diagnostics,
model-alias settings (built-in/custom alias inspection and management),
Notion integration token settings and Obsidian REST/WebDAV settings,
local-corpus source configuration and index lifecycle,
token-health/synced-models/provider-stats/provider-metrics/provider-nodes list/validation/provider-models, provider validation/observability (OpenRouter stats, quota windows, expiration, health matrix), provider policy settings (Claude Code aliases, parameter filters, web interception rules, tier configuration), client connection export and web-session contract, combo management (builder options, duplicate, metrics, reorder, auto and test), webhook management, memory settings, and complete API-key management groups (including app-owned root handlers, devices, regeneration, reveal, usage limits, key groups, memberships, and permissions), and the edge files, music,
speech-to-text, embeddings, audio-transcriptions, audio-speech, audio-translations, text-to-speech, image edits/generations/upscale, moderation, rerank, ElevenLabs voices, plus WebSocket handshake routes. Remaining route groups stay in
`core-domain` until their dependencies can move without reintroducing a
cross-app adapter; each subsequent move must update app registration and rerun
the parity, import, and split-deployment smoke gates. Provider credential import
and archive extraction (Claude, Codex, and Agy) are owned by the control
`providers/auth` Nest feature; provider execution remains edge-owned.

Nest HTTP apps keep transport entry points in `*.controller.ts` files registered
through `*.module.ts`; app source must not add Next-style `*.route.ts` modules.
Raw request/response compatibility handlers use the `*.handler.ts` suffix and
are invoked by an app-owned service.

No app may import another app, reach into a package through a relative source
path, or pass a surface flag to a generic process factory. The boundary audit
is the first gate for every domain migration:

```bash
pnpm audit:app-boundaries
```

After that gate, run the owning app's acceptance command from the table above.
The release gate runs the same boundary audit before route parity and data
readiness checks.
