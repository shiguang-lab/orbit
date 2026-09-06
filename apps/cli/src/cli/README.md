# apps/cli/src/cli — ShiguangGateway CLI internals

This directory contains the CLI runtime, helpers, and commands for the `shiguang-gateway` binary.

## Structure

```
apps/cli/src/cli/
├── CONVENTIONS.md          ← normative design rules (read this first)
├── README.md               ← this file
├── program.mjs             ← Commander setup — global flags, registerCommands()
├── api.mjs                 ← apiFetch() — all HTTP calls + retry/backoff
├── runtime.mjs             ← withRuntime() — server-first / DB-fallback
├── i18n.mjs                ← t() — i18n helper + locale detection
├── output.mjs              ← emit() — table/json/jsonl/csv + printSuccess/printError
├── io.mjs                  ← ask() / askSecret() — interactive prompts
├── data-dir.mjs            ← resolveDataDir() / resolveStoragePath()
├── sqlite.mjs              ← openShiguangGatewayDb() — DB bootstrap
├── encryption.mjs          ← encrypt/decrypt credentials
├── provider-catalog.mjs    ← static provider catalog
├── provider-store.mjs      ← DB CRUD for provider_connections
├── provider-test.mjs       ← testProviderApiKey()
├── settings-store.mjs      ← DB CRUD for key_value settings
├── locales/
│   ├── en.json             ← English strings (source of truth, 43 locales)
│   ├── pt-BR.json          ← Portuguese (Brazil) — fully translated
│   └── {locale}.json       ← 42 additional locales (ar, az, de, es, fr, ja, zh-CN, …)
├── scripts/
│   └── generate-locales.mjs ← scaffold locale files from locale-catalog.mjs
└── commands/
    ├── setup.mjs
    ├── doctor.mjs
    ├── providers.mjs
    ├── config.mjs          ← includes `config lang get/set/list`
    ├── status.mjs
    ├── logs.mjs
    └── update.mjs
```

## Key helpers

### `apiFetch(path, opts)` — `api.mjs`

All HTTP calls to the ShiguangGateway server must go through this wrapper.

```js
import { apiFetch } from "./api.mjs";

const res = await apiFetch("/api/health");
if (!res.ok) await res.assertOk(); // throws ApiError with mapped exit code
const data = await res.json();
```

Options:

- `baseUrl` — override base URL (default: `SHIGUANG_GATEWAY_BASE_URL` env or `localhost:8787`)
- `apiKey` — override API key (default: `SHIGUANG_GATEWAY_API_KEY`)
- `method`, `body`, `headers` — standard fetch options
- `timeout` — per-attempt ms (default: `30000`)
- `retry` — `false` to disable (default: enabled)
- `retryMax` — total attempts (default: `3`)
- `verbose` — log retry attempts to stderr

### `withRuntime(fn, opts)` — `runtime.mjs`

Provides server-first / DB-fallback transparently.

```js
import { withRuntime } from "./runtime.mjs";

await withRuntime(async (ctx) => {
  if (ctx.kind === "http") {
    const res = await ctx.api("/v1/providers");
    return res.json();
  }
  return ctx.db.prepare("SELECT * FROM provider_connections").all();
});
```

- `opts.requireServer = true` — throws `ServerOfflineError` (exit 3) if offline
- `opts.preferDb = true` — always use DB (skip server check)

### `t(key, vars)` — `i18n.mjs`

Internationalized strings. Catalog loaded from `locales/{locale}.json`.

```js
import { t } from "./i18n.mjs";

console.log(t("common.serverOffline"));
console.log(t("setup.testFailed", { error: err.message }));
```

Locale detection order: `SHIGUANG_GATEWAY_LANG` → `LC_ALL` → `LC_MESSAGES` → `LANG` → `en`.

### `emit(data, opts)` — `output.mjs`

Format-aware output. Reads `opts.output` to select table/json/jsonl/csv.

```js
import { emit, printError, EXIT_CODES } from "./output.mjs";

emit(providers, { output: opts.output ?? "table" });
printError("Something went wrong");
process.exit(EXIT_CODES.SERVER_OFFLINE);
```

## Locale selection

The CLI displays text in the user's language. Detection order:

1. `--lang <code>` flag on the command line
2. `SHIGUANG_GATEWAY_LANG` environment variable
3. System env: `LC_ALL` → `LC_MESSAGES` → `LANG`
4. Fallback: `en`

**Set permanently:**

```bash
shiguang-gateway config lang set pt-BR       # saves to ~/.shiguang-gateway/.env
shiguang-gateway config lang list            # show all 42 available locales
shiguang-gateway config lang get             # show currently active locale
```

**One-time override:**

```bash
shiguang-gateway --lang de providers list    # run in German, not persisted
SHIGUANG_GATEWAY_LANG=ja shiguang-gateway status    # same effect via env
```

**Adding a new locale**: add its code to `locale-catalog.mjs`, then run:

```bash
node apps/cli/src/cli/scripts/generate-locales.mjs
```

## Adding a new command

1. Create `apps/cli/src/cli/commands/your-command.mjs`
2. Export `registerYourCommand(program)` following the Commander pattern
3. Register in `apps/cli/src/cli/commands/registry.mjs`
4. Add strings to `locales/en.json` and `locales/pt-BR.json`
5. Write test in `tests/unit/cli-your-command.test.ts`

See `CONVENTIONS.md` for exit codes, flag naming, output format, and destructive-action rules.
