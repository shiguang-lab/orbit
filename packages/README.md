# Shared packages

All packages use the `@orbit/` scope. Apps own listeners, routes and process lifecycle.

| Package | Responsibility |
| --- | --- |
| auth | Signed identities, service authentication and credential encryption |
| config | Environment configuration and CLI profile generation (`cli/codex`, `cli/claude`, `cli/model-profile`) |
| contracts | Cross-app contracts and database entity metadata (`db-schema`) |
| utils | Error responses, sanitization, logging, network validation and bounded event publishing |
| http | Nest HTTP middleware, filters and Fastify Web handler integration |
| providers | Provider/model metadata including rerank providers |
| core | Shared business services, persistence and runtime primitives |
| inference | Provider execution, protocol translation, streaming and routing |

Utilities have explicit subpath exports: `@orbit/utils/errors`,
`@orbit/utils/errors/error-response`, `@orbit/utils/logging`,
`@orbit/utils/network`, and `@orbit/utils/realtime`. There is no aggregate root
entrypoint. Browser code imports only browser-safe modules, such as
`@orbit/utils/network/private-host`. Node-dependent configuration generation stays
under `@orbit/config/cli/*` and is not exported by the config root.

Utilities may depend on `config` and `contracts`; neither depends on utilities.
Utilities must not import persistence, Nest or HTTP server composition. Gateway core and the
inference engine must not depend on Nest or `http`.

`inference` keeps implementation and bundled resources under `src/`, tests
under `test/`, build tooling under `scripts/`, and generated declarations under
`dist/types/`. Public package subpaths are mapped explicitly by `exports`.
