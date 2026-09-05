# App domain boundaries

The deployable unit is the boundary. An app owns its listener, lifecycle and
failure policy; packages provide contracts or infrastructure without opening a
port or selecting a surface at runtime.

| App | Owns | Reads/writes | Acceptance |
| --- | --- | --- | --- |
| `edge-gateway` | Public `/v1`, `/v1beta`, A2A and provider execution; no live-dashboard listener | Provider connections, batches/files (through domain services) | `pnpm --filter @shiguang-gateway/edge-gateway typecheck && pnpm --filter @shiguang-gateway/edge-gateway build && pnpm smoke:split-deployment` |
| `control-api` | Admin `/api`, authz, CRUD, settings and audit commands; migrated health route group in `apps/control-api/src/routes/api` | Control-plane tables | `pnpm --filter @shiguang-gateway/control-api typecheck && pnpm --filter @shiguang-gateway/control-api build` |
| `realtime` | Live dashboard WebSocket transport (`apps/realtime/src/live-ws`) | Event projections only | `pnpm --filter @shiguang-gateway/realtime typecheck && pnpm --filter @shiguang-gateway/realtime build` |
| `worker` | Schedulers, sync, cleanup and background writes; task manifest/runner in `apps/worker/src/jobs` | Usage, quota, audit and job tables | `pnpm --filter @shiguang-gateway/worker typecheck && pnpm --filter @shiguang-gateway/worker build && pnpm smoke:worker` |
| `importer` | One-shot snapshot import and migration | Import target only | `pnpm --filter @shiguang-gateway/importer typecheck && pnpm --filter @shiguang-gateway/importer build` |
| `admin` | Browser UI; no database access | `contracts` and same-origin APIs | `pnpm --filter @shiguang-gateway/admin typecheck && pnpm --filter @shiguang-gateway/admin build` |

## Shared package rule

`packages/contracts`, `packages/config` and `packages/db-schema` are dependency leaves. `db-schema` contains table names and
ownership metadata only; SQL queries and mutations stay in the owning domain
service. `packages/core-domain` contains the provider/protocol domain
implementation and exposes only allow-listed subpaths for app-owned workers,
realtime adapters, and the remaining migration seams. Worker scheduling policy and task ordering
live only in `apps/worker/src/jobs`; the package exports implementations, not a
process-wide scheduler registry. `packages/http-kernel` contains only transport-level
Fastify middleware and the compatibility dispatch protocol. Each HTTP app constructs
Nest/Fastify itself; the shared package has no app factory and accepts no app selector.

Route migration is physical: handlers already accepted by an app live below
that app's `src/routes` tree. The parity audits aggregate those app-owned trees
with the remaining domain handlers, so each move is independently verifiable.

The current migration wave has moved the control auth/health/status/process-control/
token-health/synced-models/provider-stats/provider-metrics/provider-nodes list/validation/provider-models and complete API-key management groups (including devices, regeneration, reveal, usage limits, key groups, memberships, and permissions), and the edge music,
speech-to-text, embeddings, audio-transcriptions, audio-speech, audio-translations, text-to-speech, image edits/generations/upscale, moderation, rerank, ElevenLabs voices, plus WebSocket handshake routes. Remaining route groups stay in
`core-domain` until their dependencies can move without reintroducing a
cross-app adapter; each subsequent move must update app registration and rerun
the parity, import, and split-deployment smoke gates.

No app may import another app, reach into a package through a relative source
path, or pass a surface flag to a generic process factory. The boundary audit
is the first gate for every domain migration:

```bash
pnpm audit:app-boundaries
```

After that gate, run the owning app's acceptance command from the table above.
The release gate runs the same boundary audit before route parity and data
readiness checks.
