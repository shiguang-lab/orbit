# App domain boundaries

The deployable unit is the boundary. An app owns its listener, lifecycle and
failure policy; packages provide contracts or infrastructure without opening a
port or selecting a surface at runtime.

| App | Owns | Reads/writes | Acceptance |
| --- | --- | --- | --- |
| `gateway` | Public `/v1`, `/v1beta`, A2A, cloud-agent tasks and provider execution; no live-dashboard listener | Provider connections, cloud-agent credentials/tasks, batches/files (through app-owned Nest modules and handlers) | `pnpm --filter @orbit/gateway typecheck && pnpm --filter @orbit/gateway build && pnpm smoke:split-deployment` |
| `control` | Admin `/api`, authz, CRUD, settings, logs, audit commands, free-proxy catalog/promotion and system version/update controls; local-only provider discovery management; Jobs projections and worker command client; migrated health route group in `apps/control/src/routes/api`; named compression-combo CRUD and assignments; AgentBridge state, mappings and bypass administration; Traffic Inspector session CRUD under `apps/control/src/tools/traffic-inspector` | Control-plane tables and read-only usage/job projections | `pnpm --filter @orbit/control typecheck && pnpm --filter @orbit/control build` |
| `realtime` | Live dashboard WebSocket transport (`apps/realtime/src/live-ws`) | Event projections only | `pnpm --filter @orbit/realtime typecheck && pnpm --filter @orbit/realtime build` |
| `worker` | Schedulers, sync, cleanup and background writes; task manifest/runner and authenticated internal Jobs command endpoint in `apps/worker/src/jobs` | Usage, quota, audit and job tables | `pnpm --filter @orbit/worker typecheck && pnpm --filter @orbit/worker build && pnpm smoke:worker` |
| `importer` | One-shot snapshot import and migration | Import target only | `pnpm --filter @orbit/importer typecheck && pnpm --filter @orbit/importer build` |
| `console` | Browser UI; no database access | `contracts` and same-origin APIs | `pnpm --filter @orbit/console typecheck && pnpm --filter @orbit/console build` |

## Shared package rule

`packages/contracts`, `packages/config`, `packages/utils` and `packages/http`
are shared infrastructure packages. `utils/errors` contains framework-independent error responses and
redaction helpers and is consumed directly by multiple deployable apps.
`contracts/db-schema` contains the canonical ORM-neutral entity metadata under `src/db-schema/entities/*.entity.ts`:
physical SQLite table names, verified column definitions, and write ownership. The project currently uses
raw SQLite adapters rather than TypeORM/Drizzle, so these entities deliberately have no decorators, database
connection, Nest module, query, or mutation logic. SQL migrations remain the single runtime migration source
under the database owner; SQL queries and mutations stay in the owning domain service. New shared tables must
first add a verified entity here, while app-only temporary tables stay app-owned and are not exported from this package.

Proxy relay deployment backends (Cloudflare Workers, Deno Deploy, and Vercel)
are control-owned Nest handlers under `apps/control/src/settings/proxy`;
provider API calls, polling, relay generation, and proxy registration stay in
that app rather than in `core`.

Every deployable server app declares `@orbit/contracts` directly and validates the catalog during startup. This keeps the entity contract active at runtime instead of relying only on audit scripts.
`utils/network` contains pure outbound URL parsing, host classification and SSRF error contracts; it has no
database, framework or application lifecycle dependency. Configuration-backed guard policy remains in the owning
domain service. `packages/core` contains the provider/protocol domain
implementation and exposes only allow-listed subpaths for app-owned workers,
realtime adapters, and the remaining migration seams. Worker scheduling policy and task ordering
live only in `apps/worker/src/jobs`; the package exports implementations, not a
process-wide scheduler registry. `packages/http` contains only shared Nest
transport middleware, filters, interceptors and Web handler adapters. Its `web-handler` export adapts
an explicitly selected Web Request handler to Fastify without route discovery. Each HTTP app constructs
Nest/Fastify itself; the shared package has no app factory and accepts no app selector.
Package `src/bin` trees are executable-only entries: they may open a listener only when an owning app
explicitly spawns them, and application/library imports must never evaluate those files. The AgentBridge
MITM child entry is `packages/core/src/bin/mitm/server.cjs`, spawned only by the control-owned
MITM manager.
The free-proxy provider/database primitives are exposed through the explicit
`core/shared/free-proxies` contract: control owns the HTTP catalog and
promotion module, while worker may invoke the same primitives from its explicit
free-proxy scheduler entrypoint. Importing the control contract does not start a
background timer.

### Job control boundary

`control` serves `/api/jobs` but reads only persisted job/run projections through
`core/control/jobs`. It never imports or constructs `JobRegistry`. Mutating actions
use the versioned `@orbit/contracts/job-command` protocol and are executed by
the worker-owned internal endpoint; only that process imports `core/worker/jobs`,
registers handlers and owns timers. The listener defaults to `127.0.0.1:8791` for a local
deployment; split deployment sets `WORKER_COMMAND_HOST`, `WORKER_COMMAND_PORT`, and
`ORBIT_WORKER_COMMAND_URL`. Both processes use
`ORBIT_WORKER_COMMAND_TOKEN`, falling back to their shared `JWT_SECRET`.
Unreachable, unauthenticated, disabled, unregistered and rejected commands are non-2xx and
must never be reported as successful control operations.

### Tunnel control boundary

`control` owns the operator-facing `/api/tunnels/*` routes, their validation, and
public-safe response projection. Cloudflared, ngrok, and Tailscale host processes are
owned and executed only by `gateway`, the host serving the public API endpoint.
Control sends the typed `@orbit/contracts/tunnel-command` protocol to the
edge-owned `POST /api/internal/tunnels/command` endpoint. This internal endpoint requires
the shared `ORBIT_INTERNAL_SERVICE_TOKEN`; it is never an operator-facing API.
Split deployments also set `EDGE_GATEWAY_URL` on control so a control replica cannot
accidentally operate on its own host. Tailscale install progress is streamed back through
the authenticated internal hop. Only edge may import `core/edge/tunnels`.

The package rule is enforced by `pnpm audit:package-boundaries --strict`: a package must
have at least two workspace consumers and must not contain app-owned route trees. The
current package graph passes this gate; `core` and `inference` are classified as
shared packages with multiple deployable consumers. The stricter
`pnpm audit:inference-boundary` source-layer audit remains a separate migration gate;
new app-only routes, listeners, or orchestration must not be added to either package.

## Entity sharing evidence

Run `pnpm audit:db-entities --json` when changing a table definition. The audit
compiles the canonical entities, resolves transitive workspace consumers, and scans
`apps/*/src` plus package source for SQL table references. In the current graph,
`@orbit/contracts/db-schema` reaches four deployable apps through the remaining
`core` seam: `control`, `gateway`, `realtime`, and `worker`.

The entity write owners are intentionally narrower than those consumers:

| Owner | Entities |
| --- | --- |
| `control` | settings, configAuditLog, playgroundPresets, pluginMetrics, middleware_hooks, evalSuites/evalCases/evalRuns, providerConnections, providerNodes, apiKeys, apiKeyGroups, combos, compressionCombos, compressionComboAssignments, modelComboMappings, webhooks, apiKeyTokenLimits, providerPlans, plugins, modelContextOverrides, modelCapabilityOverrides, tierConfig, tierAssignments, freeProxies, freeProxySyncErrors, reasoningRoutingRules, quotaGroups, quotaPools, quotaAllocations, quotaPoolConnections, quotaAllocationModelCaps, gamification leaderboard/user levels/badges/invites/community servers, inspectorSessions/inspectorSessionRequests/inspectorCustomHosts, discovery_results |
| `gateway` | batches, files, agenticConversations, conversationTurnNodes, apiKeyTokenCounters, apiKeyTokenLimitResetLogs, providerQuotaState, quotaConsumption, compressionAnalytics, compressionEngineBreakdown, pluginAnalytics, middleware_logs, mcpToolAudit |
| `worker` | usageHistory, callLogs, proxyLogs, quotaSnapshots, auditLogs, memories, jobs, modelCapabilities, modelIntelligence |

AgentBridge's `agent_bridge_state`, `agent_bridge_mappings`, and
`agent_bridge_bypass` tables are intentionally app-private control
storage. Their DDL lives in
`apps/control/src/tools/agent-bridge/agent-bridge-schema.ts`; they are not
exported as shared `db-schema` entities because no other deployable app reads
or writes them.

Traffic Inspector session rows are control-owned: only the control-plane
HTTP module creates, updates, and exports recordings. Their DDL is initialized
by `apps/control/src/infrastructure/control-schema.ts`, while the canonical
entity metadata remains in `packages/contracts/src/db-schema/entities/control.entity.ts`.
Custom-host rows are managed by control but read by the edge MITM repair,
DNS provisioning, and interception hooks; that concrete cross-app read path is
why `inspector_custom_hosts` is cataloged alongside the app-owned session
tables rather than treated as a private package table.

The promoted entities have concrete cross-app evidence: edge creates conversation
roots/turn identities while control reads them; control configures token limits,
provider plans, plugins and model capability overrides while edge enforces or executes them; edge owns the
hot-path token/quota ledgers; edge writes compression receipts and per-engine
breakdowns while control analytics and realtime diagnostics read them; and worker
syncs model capabilities consumed by edge routing. Gamification tables are initialized from the
single executor-only helper in `packages/contracts/src/db-schema` by both control and edge because the
streaming event path writes leaderboard/XP rows while the control API serves management views.
The replay/relay tables `reasoning_cache`, `session_model_history`, and
`context_handoffs` are now explicitly promoted because the edge streaming path
and worker maintenance share them. Likewise `skills` is a shared contract:
control manages definitions while the edge/inference execution path reads
and records executions. A shared package import alone is not a reason to
promote an app-private table; each promotion requires concrete cross-app
read/write evidence.

`model_intelligence` is synced by the worker's `arena-elo-sync` job, read by
edge auto-combo task fitness, and read by the control free-provider rankings
surface, so worker is the single write owner. `plugin_analytics` is an
append-only request-runtime hook log exposed by the MCP/plugin management
surface; edge is its operational write owner while control-facing readers use
the shared database contract. These tables are cataloged in
`packages/contracts/src/db-schema` rather than treated as app-private DDL.

`mcp_tool_audit` follows the same cross-app pattern: the MCP server runtime
appends invocation records, while control exposes read-only audit queries.
Its canonical columns and edge write ownership are therefore declared in
`packages/contracts/src/db-schema`; the runtime logger and control query surface remain
implemented in their owning apps/packages.

Middleware hooks follow the same split: control owns the `middleware_hooks`
configuration rows, while edge/inference loads and executes those definitions.
The edge request runtime appends `middleware_logs`, and control reads those
records for management and observability. Their canonical columns and ownership
are declared in `packages/contracts/src/db-schema`; registry execution and query code stay in
the consuming modules.

The SQL scan currently finds table references in `core` rather than direct
app source, so the report labels these rows `PASS-indirect-declared-owner`. This is
evidence that the package is shared, not proof that the legacy package has already
enforced each app's write boundary. A domain migration must move its queries and
mutations into the owner app and should make the row `PASS-direct`; an app-only
temporary table must not be added to `db-schema`.

Run `pnpm audit:db-schema-coverage -- --strict` for the broader migration inventory.
It compares static `CREATE TABLE`/`ALTER TABLE` declarations with the canonical
entity catalog and fails if a deployable server app contains SQL for an uncovered
table. Remaining package-only declarations are legacy internals in `core`;
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
MCP accessibility configuration, compression run telemetry, Caveman settings alias and rule metadata, RTK configuration,
filter discovery and filter catalog diagnostics, provider token refresh,
Qdrant configuration, health, semantic-search diagnostics, cleanup, and embedding-model discovery,
reasoning-routing rule CRUD and policy simulation, Claude Code discovery-alias usage metrics,
task-aware routing configuration and detection diagnostics,
model-alias settings (built-in/custom alias inspection and management),
MITM settings/status, certificate download and regeneration, and start/stop controls,
Notion integration token settings and Obsidian REST/WebDAV settings,
local-corpus source configuration and index lifecycle,
compression analytics summary and per-engine diagnostics, named compression-combo CRUD/assignment/default-plan routes,
token-health/synced-models/provider-stats/provider-metrics/provider-nodes list/validation/provider-models, provider validation/observability (OpenRouter stats, quota windows, expiration, health matrix), provider policy settings (Claude Code aliases, parameter filters, web interception rules, tier configuration), client connection export and web-session contract, combo management (builder options, duplicate, metrics, reorder, auto and test), webhook management, memory settings, and complete API-key management groups (including app-owned root handlers, devices, regeneration, reveal, usage limits, key groups, memberships, and permissions), and the edge files, music,
speech-to-text, embeddings, audio-transcriptions, audio-speech, audio-translations, text-to-speech, image edits/generations/upscale, moderation, rerank, ElevenLabs voices, plus WebSocket handshake routes. Remaining route groups stay in
`core` until their dependencies can move without reintroducing a
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
