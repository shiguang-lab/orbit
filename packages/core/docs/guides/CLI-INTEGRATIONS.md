---
title: "CLI Integrations — point any coding CLI at Orbit"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI Integrations

Orbit ships a family of `setup-*` commands that configure a coding
CLI (Codex, Claude Code, OpenCode, Cline, …) to use Orbit as its backend — so
the tool talks to **one** endpoint and Orbit routes to the right provider with
auto-fallback. Each command reads the **live** model catalog from a running
Orbit (local or remote) and writes the tool's own config file on **your**
machine. The API key is referenced by an environment variable wherever the tool
supports it. Commands that persist a tool-local environment file are noted below.

There is also a generic launcher — `orbit run <target>` — that spawns
`claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` or `gemini` with the
right env injected, without writing any config at all. Targets and their
aliases come from the canonical manifest `apps/cli/src/cli/cli-manifest.mjs`
(`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`,
`open-code`, `qwen-code`, `gemini-cli`), and `orbit completion` offers the
same manifest-derived target words. The legacy per-tool launchers —
`orbit launch` (Claude Code) and `orbit launch-codex` (Codex) — remain
available.

Provider onboarding is available from the same local/remote context. The
API-first commands below keep management authentication separate from provider
credentials and never print a credential in structured output:

```bash
orbit providers add glm --credential-env GLM_API_KEY --name work
orbit providers import ./providers.json --dry-run --json
orbit providers auth openai
orbit providers edit <connection-id> --default-model glm/glm-5.2
orbit providers remove <connection-id> --yes
```

For scripts, prefer `--credential-stdin` or `--credential-env`; `--credential`
is retained for controlled local use. `providers remove` requires `--yes` on a
non-interactive terminal, and all five commands honor the active context or the
global `--base-url`/`--api-key` options.

For the one-time, hand-written base setup of the two richest integrations, see the
per-tool deep dives:

- [Claude Code configuration](./CLAUDE-CODE-CONFIGURATION.md)
- [Codex CLI configuration](./CODEX-CLI-CONFIGURATION.md)
- [Remote Mode](./REMOTE-MODE.md) — drive a remote Orbit (VPS / Tailnet) from your laptop
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — the OmniCopilot extension; it can also run these
  `setup-*` commands for you from inside the editor

---

## Master table

Every command honours the **active context** (set with `orbit connect`, see
[Remote Mode](./REMOTE-MODE.md)) or explicit `--remote <url> --api-key <key>` flags.
"Local vs remote" below means: with no flags it targets `http://localhost:20128`;
with `--remote` (or an active remote context) it fetches the catalog from that
server and writes the config locally.

| Command                    | Tool                         | What it writes                                                                                                                                         | Key flags                                                                                                                                  | Local vs remote |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `orbit setup-codex`    | OpenAI Codex CLI             | `~/.codex/<name>.config.toml` — one profile per compatible text model (`codex --profile <name>`)                                                       | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | Both            |
| `orbit setup-claude`   | Claude Code                  | `~/.claude/profiles/<name>/settings.json` — one profile per matched model (`CLAUDE_CONFIG_DIR`)                                                        | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | Both            |
| `orbit setup-opencode` | OpenCode (openai-compatible) | `~/.config/opencode/opencode.json` — `orbit` provider with every catalog model (`opencode -m orbit/<model>`)                                   | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | Both            |
| `orbit setup-cline`    | Cline                        | `~/.cline/data/{globalState,secrets}.json` (CLI mode) + prints VS Code extension settings                                                              | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | Both            |
| `orbit setup-kilo`     | Kilo Code                    | `~/.local/share/kilo/auth.json` (CLI) + merges `kilocode.*` into VS Code `settings.json` if present                                                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | Both            |
| `orbit setup-continue` | Continue / `cn` CLI          | `~/.continue/config.yaml` — `provider: openai` models, key via `${{ secrets.ORBIT_API_KEY }}`                                                      | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Both            |
| `orbit setup-cursor`   | Cursor                       | Nothing — prints the in-app steps (Cursor config is opaque SQLite)                                                                                     | `--remote` `--api-key` `--only` `--port`                                                                                                   | Both            |
| `orbit setup-roo`      | Roo Code                     | `~/.orbit/roo-settings.json` (import doc) + sets `roo-cline.autoImportSettingsPath` if a VS Code `settings.json` exists                            | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | Both            |
| `orbit setup-crush`    | Crush                        | `~/.config/crush/crush.json` — `openai-compat` provider, key via `$ORBIT_API_KEY`                                                                  | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Both            |
| `orbit setup-goose`    | Goose                        | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + prints env recipe                                                       | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Both            |
| `orbit setup-aider`    | Aider                        | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + prints env recipe                                                                     | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Both            |
| `orbit setup-qwen`     | Qwen Code                    | `~/.qwen/settings.json` — V4 `modelProviders.openai` array + `ORBIT_API_KEY` in `~/.qwen/.env`                                                     | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | Both            |
| `orbit run <target>`   | Runtime launch (generic)     | Nothing — spawn `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` with the right env and args; Qwen and Gemini use a temporary isolated home | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | Both            |
| `orbit launch`         | Claude Code                  | Nothing — spawns `claude` with `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` injected                                                                    | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | Both            |
| `orbit launch-codex`   | OpenAI Codex CLI             | Nothing — spawns `codex` with the `orbit` provider injected via `-c` flags                                                                         | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | Both            |

Notes on flags (verified in the command source):

- `--remote <url>` — fetch the catalog from a remote Orbit (overrides `--port`
  and the active context). `--api-key <key>` supplies the credential for that
  server (defaults to the `ORBIT_API_KEY` env var, or the active context's token).
- `--only <patterns>` — comma-separated substrings; keep only model IDs that match
  (e.g. `--only glm,kimi`). Available on `setup-codex`, `setup-claude`,
  `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`.
- `--dry-run` — print exactly what would be written without touching the
  filesystem. Available on every `setup-*` command **except** `setup-cursor`
  (which never writes a file).
- `--model <id>` — required (or picked interactively) for the tools that have no
  model auto-discovery: Cline, Kilo, Roo, Goose, Qwen, Aider. Those tools
  also accept `--yes` for non-interactive runs (which then requires `--model`).
  `setup-opencode` takes `--model` to set the default top-level model.
- `--model <id>` on `orbit run` follows the manifest's per-target wiring
  (`apps/cli/src/cli/cli-manifest.mjs`): **aider** receives `--model openai/<id>` and
  **opencode** `--model orbit/<id>` (the prefix is added only when the id
  does not already carry it); **qwen** and **gemini** receive the id verbatim;
  **claude** gets it via `ANTHROPIC_MODEL`, **goose** via `GOOSE_MODEL`, and
  **codex** via `-c model_providers.orbit.*` args. **Qwen is the only run
  target that hard-requires `--model`** — `orbit run qwen` without it exits
  `2` with an explicit error.
- `--port <port>` — local Orbit port (default `20128`, ignored when `--remote`
  is set). Present on all `setup-*` and both launchers.
- `orbit run` exit codes: the child CLI's own exit code is propagated
  verbatim; `2` = invalid arguments (unsupported target, missing required
  `--model`, container guard); `127` = the target binary is not in `PATH`;
  `130`/`143`/`129` when the launch is ended by `SIGINT`/`SIGTERM`/`SIGHUP`;
  `1` = other runtime launch failure.
- The two launchers (`launch`, `launch-codex`) accept `--profile <name>` to select
  a profile written by `setup-claude` / `setup-codex`, plus pass-through args for
  the underlying `claude` / `codex` binary.

The interactive picker is also shared by the setup recipes:

```bash
# Pick from the active local or remote model catalog and configure the target.
orbit configure claude
orbit configure opencode --provider glm
orbit configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` currently delegates to the tested recipes for `codex`, `claude`,
`opencode`, `qwen`, `aider`, `goose`, `cline`, `continue`, and `kilo`. IDE-only,
MITM, and guide-only catalog entries remain explicit `setup-*`/manual flows and
are not presented as launchable targets.

> `setup-opencode` is the **lightweight openai-compatible** OpenCode integration.
> There is also a richer plugin integration — `orbit setup opencode` — which
> installs `@orbit/opencode-plugin`. They are different commands; the table
> above documents `setup-opencode`.

---

## Local usage

With Orbit running on `localhost:20128`, just run the setup command for your
tool. The catalog is fetched from the local server.

```bash
# Codex: write a profile per matched model into ~/.codex/
orbit setup-codex
codex --profile glm52            # use a generated profile

# Claude Code: write per-model profiles, then launch one
orbit setup-claude
orbit launch --profile glm52

# OpenCode: write the openai-compatible provider with all catalog models
orbit setup-opencode
export ORBIT_API_KEY=sk-...  # referenced via {env:ORBIT_API_KEY}, never on disk
opencode -m orbit/glm/glm-5.2 "..."

# Tools without auto-discovery need an explicit model:
orbit setup-aider --model glm/glm-5.2
orbit setup-qwen --model qwen/qwen3.8-max-preview

# Preview without writing anything:
orbit setup-continue --dry-run
```

Launch without writing any config at all (env-injection only):

```bash
orbit launch                 # Claude Code → local Orbit
orbit launch-codex           # Codex CLI → local Orbit
orbit launch-codex --profile glm52
orbit run claude --model openai/gpt-5.4
orbit run codex --model openai/gpt-5.4 --dry-run --json
orbit run aider --model glm/glm-5.2 -- --message "reply OK"
orbit run goose --model glm/glm-5.2
orbit run opencode --model glm/glm-5.2 -- run "reply OK"
orbit run qwen --model glm/glm-5.2 -- -p "reply OK"
orbit run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# Explicit command path: pass through whatever comes after --
orbit run claude -- --print-system-prompt "review this diff"
```

---

## Remote usage

Point any setup command at a remote Orbit with `--remote` + `--api-key`. The
catalog is fetched from the remote; the config is written on your local machine.

```bash
# OpenCode against a remote VPS, keep only glm/kimi models
orbit setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m orbit/glm/glm-5.2 "..."   # export ORBIT_API_KEY first

# Codex profiles from a remote catalog
orbit setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# Launch a CLI straight against the remote
orbit launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
orbit launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

Instead of passing `--remote`/`--api-key` every time, log in once and let the
**active context** supply them automatically:

```bash
orbit connect 192.168.0.15        # mints a scoped token, stores the context
orbit setup-codex                 # ← now uses the remote catalog
orbit setup-opencode              # ← same
orbit launch                      # ← Claude Code against the remote
```

See [Remote Mode](./REMOTE-MODE.md) for contexts, scopes, and token management.

---

## Base URL conventions (which tools want `/v1`)

Orbit exposes the OpenAI surface at `/v1`, the Anthropic surface at the root,
and a native Gemini surface at `/v1beta`. Each integration is wired to the form its
tool expects (verified in the command source):

| Integration                                                                | Base URL written | `/v1`?                                      |
| -------------------------------------------------------------------------- | ---------------- | ------------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | root             | No — Cline appends `/v1/chat/completions`   |
| `setup-goose` (`OPENAI_HOST`)                                              | root             | No — Goose appends the path                 |
| `setup-aider` (`OPENAI_API_BASE`)                                          | root             | No — LiteLLM appends `/v1/chat/completions` |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | with `/v1`       | Yes                                         |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | root             | No — Claude Code appends `/v1/messages`     |
| `setup-codex`, `launch-codex` (`model_providers.orbit.base_url`)       | with `/v1`       | Yes                                         |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | with `/v1`       | Yes                                         |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | root             | No — the SDK appends `/v1beta/models/…`     |

---

## Keeping native deps on update: `--include=optional`

When you update with `orbit update` (after confirming, or with `--apply`),
Orbit runs the install with `--include=optional` baked in:

```bash
npm install -g orbit@latest --include=optional
```

This is **not** a flag you pass to `orbit update` — it is always applied by the
updater. It guarantees the `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, the LLMLingua SLM stack) survive the update even if your npm config
has `omit=optional` set, which would otherwise silently drop the native SQLite
driver and OS-keyring binding. To preview the exact command without applying:

```bash
orbit update --dry-run
# [DRY RUN] Would run: npm install -g orbit@latest --include=optional
```

Other `orbit update` flags (verified in source): `--check` (exit 1 if
outdated), `--apply` (install without prompting), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI via `orbit run gemini`

Contract verified against `@google/gemini-cli` 0.50.0: the CLI honors
`GOOGLE_GEMINI_BASE_URL` and issues `POST /v1beta/models/<model>:generateContent`
(and `:streamGenerateContent?alt=sse`) against it — exactly Orbit's native
Gemini surface (`/v1beta`). `orbit run gemini` wires that automatically:

- `GOOGLE_GEMINI_BASE_URL` → the active Orbit base URL (root, no `/v1`);
- `GEMINI_API_KEY` → the resolved Orbit credential (option/env/context);
- a **temporary isolated `GEMINI_CLI_HOME`** whose `.gemini/settings.json`
  selects `gemini-api-key` auth, so a stored Google OAuth session (Code Assist)
  never overrides the Orbit-directed launch — removed after exit;
- **env hygiene**: the child env is scrubbed of `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` and `GOOGLE_GENAI_USE_GCA` (which would redirect
  auth to Vertex/Code Assist), and `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key` is
  set as a belt-and-suspenders fallback — the other `run` targets get the same
  treatment for their own conflicting variables;
- `--model <id>` injection from `--provider`/`--model`.

```bash
orbit run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

Gemini's workspace-trust guard still applies in headless mode — pass
`--skip-trust` (or trust the directory interactively) yourself; the launcher
deliberately does not bypass it. This launcher is distinct from the **ACP
inventory** (`apps/control/src/acp/runtime/agent-registry.ts`), which powers
installation detection on `/dashboard/acp-agents` and does not launch agents.

---

## Real smoke sweep (opt-in)

Deterministic launch-plan regression runs in CI (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). To validate the REAL binaries against a REAL
Orbit server, an opt-in harness exists at
`tests/integration/upstream-cli-smoke.int.test.ts`. It never runs automatically
(every sub-test skips unless `RUN_CLI_SMOKE=1`), passes the credential by env-var
NAME (never by value), redacts key-shaped strings from any recorded output, skips
targets whose binary is not installed, and classifies failures as
auth / upstream / config instead of a bare boolean:

```bash
RUN_CLI_SMOKE=1 \
ORBIT_SMOKE_BASE_URL="http://localhost:20128" \
ORBIT_SMOKE_MODEL="<provider/model>" \
ORBIT_SMOKE_API_KEY_ENV="ORBIT_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

Optional: `ORBIT_SMOKE_TARGETS="codex,opencode,qwen"` restricts the sweep;
`ORBIT_SMOKE_TIMEOUT_MS` overrides the 120s per-target timeout.

---

## See also

- [Claude Code configuration](./CLAUDE-CODE-CONFIGURATION.md) — the deeper Claude Code guide
- [Codex CLI configuration](./CODEX-CLI-CONFIGURATION.md) — the one-time `[model_providers.orbit]` base setup
- [Remote Mode](./REMOTE-MODE.md) — contexts, scoped access tokens, driving a remote server
- [CLI Tools reference](../reference/CLI-TOOLS.md) — the full catalog of supported tools + dashboard pages
- [Setup Guide](./SETUP_GUIDE.md) — install methods and first-run onboarding
