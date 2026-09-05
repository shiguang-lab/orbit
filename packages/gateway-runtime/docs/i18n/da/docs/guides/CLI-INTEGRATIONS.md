# CLI-INTEGRATIONS (Dansk)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "CLI Integrationer — peg enhver kodnings-CLI mod ShiguangGateway"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI Integrationer

ShiguangGateway leverer en familie af `setup-*` kommandoer, der konfigurerer en kodnings-CLI (Codex, Claude Code, OpenCode, Cline, …) til at bruge ShiguangGateway som sin backend — så værktøjet kommunikerer med **én** endpoint, og ShiguangGateway ruter til den rette udbyder med automatisk tilbagefald. Hver kommando læser den **live** modelkatalog fra en kørende ShiguangGateway (lokal eller fjern) og skriver værktøjets egen konfigurationsfil på **din** maskine. API-nøglen refereres af en miljøvariabel, hvor værktøjet understøtter det. Kommandoer, der bevarer en værktøjslokal miljøfil, er noteret nedenfor.

Der er også en generisk launcher — `shiguang-gateway run <target>` — der starter `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` eller `gemini` med den rette miljøvariabel injiceret, uden at skrive nogen konfiguration overhovedet. Mål og deres aliaser kommer fra det kanoniske manifest `bin/cli/cli-manifest.mjs`
(`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`,
`open-code`, `qwen-code`, `gemini-cli`), og `shiguang-gateway completion` tilbyder de samme manifest-afledte målord. De ældre per-værktøj launchers —
`shiguang-gateway launch` (Claude Code) og `shiguang-gateway launch-codex` (Codex) — forbliver tilgængelige.

Udbyder onboarding er tilgængelig fra den samme lokale/fjern kontekst. De API-første kommandoer nedenfor holder administrationsautentifikation adskilt fra udbyderlegitimationer og printer aldrig en legitimationsoplysning i struktureret output:

```bash
shiguang-gateway providers add glm --credential-env GLM_API_KEY --name work
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth openai
shiguang-gateway providers edit <connection-id> --default-model glm/glm-5.2
shiguang-gateway providers remove <connection-id> --yes
```

For scripts, foretræk `--credential-stdin` eller `--credential-env`; `--credential`
bevares til kontrolleret lokal brug. `providers remove` kræver `--yes` på en
ikke-interaktiv terminal, og alle fem kommandoer respekterer den aktive kontekst eller de globale `--base-url`/`--api-key` muligheder.

For den engangs, håndskrevne basisopsætning af de to rigeste integrationer, se de
per-værktøj dybdegående analyser:

- [Claude Code konfiguration](./CLAUDE-CODE-CONFIGURATION.md)
- [Codex CLI konfiguration](./CODEX-CLI-CONFIGURATION.md)
- [Fjernmode](./REMOTE-MODE.md) — styre en fjern ShiguangGateway (VPS / Tailnet) fra din bærbare computer
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — OmniCopilot-udvidelsen; den kan også køre disse
  `setup-*` kommandoer for dig fra indeni editoren

---

## Mastertabel

Hver kommando respekterer den **aktive kontekst** (sat med `shiguang-gateway connect`, se
[Remote Mode](./REMOTE-MODE.md)) eller eksplicitte `--remote <url> --api-key <key>` flag. "Lokal vs fjern" nedenfor betyder: uden flag retter den sig mod `http://localhost:20128`;
med `--remote` (eller en aktiv fjern kontekst) henter den kataloget fra den
server og skriver konfigurationen lokalt.

| Kommando                   | Værktøj                      | Hvad den skriver                                                                                                                                                   | Nøgleflag                                                                                                                                  | Lokal vs fjern |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------- |
| `shiguang-gateway setup-codex`    | OpenAI Codex CLI             | `~/.codex/<name>.config.toml` — én profil pr. kompatibel tekstmodel (`codex --profile <name>`)                                                                     | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | Begge          |
| `shiguang-gateway setup-claude`   | Claude Code                  | `~/.claude/profiles/<name>/settings.json` — én profil pr. matchet model (`CLAUDE_CONFIG_DIR`)                                                                      | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | Begge          |
| `shiguang-gateway setup-opencode` | OpenCode (openai-kompatibel) | `~/.config/opencode/opencode.json` — `shiguang-gateway` udbyder med hver katalogmodel (`opencode -m shiguang-gateway/<model>`)                                                   | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | Begge          |
| `shiguang-gateway setup-cline`    | Cline                        | `~/.cline/data/{globalState,secrets}.json` (CLI mode) + printer VS Code udvidelsesindstillinger                                                                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | Begge          |
| `shiguang-gateway setup-kilo`     | Kilo Code                    | `~/.local/share/kilo/auth.json` (CLI) + fusionerer `kilocode.*` ind i VS Code `settings.json`, hvis til stede                                                      | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | Begge          |
| `shiguang-gateway setup-continue` | Continue / `cn` CLI          | `~/.continue/config.yaml` — `provider: openai` modeller, nøgle via `${{ secrets.SHIGUANG_GATEWAY_API_KEY }}`                                                              | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Begge          |
| `shiguang-gateway setup-cursor`   | Cursor                       | Intet — printer de trin i appen (Cursor konfiguration er uklar SQLite)                                                                                             | `--remote` `--api-key` `--only` `--port`                                                                                                   | Begge          |
| `shiguang-gateway setup-roo`      | Roo Code                     | `~/.shiguang-gateway/roo-settings.json` (importdokument) + sætter `roo-cline.autoImportSettingsPath`, hvis en VS Code `settings.json` eksisterer                          | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | Begge          |
| `shiguang-gateway setup-crush`    | Crush                        | `~/.config/crush/crush.json` — `openai-kompat` udbyder, nøgle via `$SHIGUANG_GATEWAY_API_KEY`                                                                             | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Begge          |
| `shiguang-gateway setup-goose`    | Goose                        | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + printer miljøopskrift                                                               | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Begge          |
| `shiguang-gateway setup-aider`    | Aider                        | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + printer miljøopskrift                                                                             | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Begge          |
| `shiguang-gateway setup-qwen`     | Qwen Code                    | `~/.qwen/settings.json` — V4 `modelProviders.openai` array + `SHIGUANG_GATEWAY_API_KEY` i `~/.qwen/.env`                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | Begge          |
| `shiguang-gateway run <target>`   | Runtime launch (generisk)    | Intet — starter `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` med det rette miljø og argumenter; Qwen og Gemini bruger et midlertidigt isoleret hjem | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | Begge          |
| `shiguang-gateway launch`         | Claude Code                  | Intet — starter `claude` med `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` injiceret                                                                                 | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | Begge          |
| `shiguang-gateway launch-codex`   | OpenAI Codex CLI             | Intet — starter `codex` med `shiguang-gateway` udbyderen injiceret via `-c` flag                                                                                          | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | Begge          |

Bemærkninger om flag (verificeret i kommandoens kilde):

- `--remote <url>` — hent kataloget fra en fjern ShiguangGateway (overskriver `--port`
  og den aktive kontekst). `--api-key <key>` leverer legitimationsoplysningen for den
  server (standard til `SHIGUANG_GATEWAY_API_KEY` miljøvariabel, eller den aktive kontexts token).
- `--only <patterns>` — komma-separerede understrenge; behold kun model-ID'er, der matcher
  (f.eks. `--only glm,kimi`). Tilgængelig på `setup-codex`, `setup-claude`,
  `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`.
- `--dry-run` — print præcist hvad der ville blive skrevet uden at røre ved
  filsystemet. Tilgængelig på hver `setup-*` kommando **undtagen** `setup-cursor`
  (som aldrig skriver en fil).
- `--model <id>` — påkrævet (eller valgt interaktivt) for de værktøjer, der ikke har
  model auto-opdagelse: Cline, Kilo, Roo, Goose, Qwen, Aider. Disse værktøjer
  accepterer også `--yes` til ikke-interaktive kørsel (som så kræver `--model`).
  `setup-opencode` tager `--model` for at sætte den standard top-niveau model.
- `--model <id>` på `shiguang-gateway run` følger manifestets per-mål wiring
  (`bin/cli/cli-manifest.mjs`): **aider** modtager `--model openai/<id>` og
  **opencode** `--model shiguang-gateway/<id>` (præfikset tilføjes kun, når id'et
  ikke allerede bærer det); **qwen** og **gemini** modtager id'et verbatim;
  **claude** får det via `ANTHROPIC_MODEL`, **goose** via `GOOSE_MODEL`, og
  **codex** via `-c model_providers.shiguang-gateway.*` args. **Qwen er det eneste kørsel
  mål, der hårdt kræver `--model`** — `shiguang-gateway run qwen` uden det afslutter
  `2` med en eksplicit fejl.
- `--port <port>` — lokal ShiguangGateway port (standard `20128`, ignoreres når `--remote`
  er sat). Tilstede på alle `setup-*` og begge launchers.
- `shiguang-gateway run` exit-koder: barnets CLI's egen exit-kode videreføres
  verbatim; `2` = ugyldige argumenter (unsupported target, manglende påkrævet
  `--model`, container guard); `127` = mål-binæren er ikke i `PATH`;
  `130`/`143`/`129` når lanceringen afsluttes af `SIGINT`/`SIGTERM`/`SIGHUP`;
  `1` = anden runtime lancering fejl.
- De to launchers (`launch`, `launch-codex`) accepterer `--profile <name>` for at vælge
  en profil skrevet af `setup-claude` / `setup-codex`, plus pass-through args for
  den underliggende `claude` / `codex` binære.

Den interaktive vælger deles også af opsætningsopskrifterne:

```bash
# Vælg fra den aktive lokale eller fjern modelkatalog og konfigurer målet.
shiguang-gateway configure claude
shiguang-gateway configure opencode --provider glm
shiguang-gateway configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` delegerer i øjeblikket til de testede opskrifter for `codex`, `claude`,
`opencode`, `qwen`, `aider`, `goose`, `cline`, `continue`, og `kilo`. IDE-only,
MITM, og guide-only katalogindgange forbliver eksplicitte `setup-*`/manuelle flows og
præsenteres ikke som lancerbare mål.

> `setup-opencode` er den **lette openai-kompatible** OpenCode integration.
> Der er også en rigere plugin-integration — `shiguang-gateway setup opencode` — som
> installerer `@shiguang-gateway/opencode-plugin`. De er forskellige kommandoer; tabellen
> ovenfor dokumenterer `setup-opencode`.

---

## Lokal brug

Med ShiguangGateway kørende på `localhost:20128`, skal du blot køre opsætningskommandoen for dit værktøj. Kataloget hentes fra den lokale server.

```bash
# Codex: skriv en profil pr. matchet model ind i ~/.codex/
shiguang-gateway setup-codex
codex --profile glm52            # brug en genereret profil

# Claude Code: skriv profiler pr. model, og start så en
shiguang-gateway setup-claude
shiguang-gateway launch --profile glm52

# OpenCode: skriv den openai-kompatible udbyder med alle katalogmodeller
shiguang-gateway setup-opencode
export SHIGUANG_GATEWAY_API_KEY=sk-...  # refereret via {env:SHIGUANG_GATEWAY_API_KEY}, aldrig på disk
opencode -m shiguang-gateway/glm/glm-5.2 "..."

# Værktøjer uden automatisk opdagelse kræver en eksplicit model:
shiguang-gateway setup-aider --model glm/glm-5.2
shiguang-gateway setup-qwen --model qwen/qwen3.8-max-preview

# Forhåndsvisning uden at skrive noget:
shiguang-gateway setup-continue --dry-run
```

Start uden at skrive nogen konfiguration overhovedet (kun miljøinjektion):

```bash
shiguang-gateway launch                 # Claude Code → lokal ShiguangGateway
shiguang-gateway launch-codex           # Codex CLI → lokal ShiguangGateway
shiguang-gateway launch-codex --profile glm52
shiguang-gateway run claude --model openai/gpt-5.4
shiguang-gateway run codex --model openai/gpt-5.4 --dry-run --json
shiguang-gateway run aider --model glm/glm-5.2 -- --message "reply OK"
shiguang-gateway run goose --model glm/glm-5.2
shiguang-gateway run opencode --model glm/glm-5.2 -- run "reply OK"
shiguang-gateway run qwen --model glm/glm-5.2 -- -p "reply OK"
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# Eksplicit kommando sti: send alt hvad der kommer efter --
shiguang-gateway run claude -- --print-system-prompt "review this diff"
```

---

## Fjernbrug

Peg enhver opsætningskommando mod en fjern ShiguangGateway med `--remote` + `--api-key`. Kataloget hentes fra den fjerne; konfigurationen skrives på din lokale maskine.

```bash
# OpenCode mod en fjern VPS, behold kun glm/kimi modeller
shiguang-gateway setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m shiguang-gateway/glm/glm-5.2 "..."   # eksportér SHIGUANG_GATEWAY_API_KEY først

# Codex profiler fra et fjernt katalog
shiguang-gateway setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# Start en CLI direkte mod den fjerne
shiguang-gateway launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
shiguang-gateway launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

I stedet for at sende `--remote`/`--api-key` hver gang, log ind én gang og lad den **aktive kontekst** levere dem automatisk:

```bash
shiguang-gateway connect 192.168.0.15        # opretter en scoped token, gemmer konteksten
shiguang-gateway setup-codex                 # ← bruger nu det fjerne katalog
shiguang-gateway setup-opencode              # ← samme
shiguang-gateway launch                      # ← Claude Code mod den fjerne
```

Se [Fjerntilstand](./REMOTE-MODE.md) for kontekster, scopes og tokenhåndtering.

---

## Basis-URL konventioner (hvilke værktøjer ønsker `/v1`)

ShiguangGateway eksponerer OpenAI-overfladen ved `/v1`, den Anthropic-overflade ved roden, og en native Gemini-overflade ved `/v1beta`. Hver integration er tilsluttet den form, som dens værktøj forventer (verificeret i kommandoens kilde):

| Integration                                                                | Basis-URL skrevet | `/v1`?                                        |
| -------------------------------------------------------------------------- | ----------------- | --------------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | rod               | Nej — Cline tilføjer `/v1/chat/completions`   |
| `setup-goose` (`OPENAI_HOST`)                                              | rod               | Nej — Goose tilføjer stien                    |
| `setup-aider` (`OPENAI_API_BASE`)                                          | rod               | Nej — LiteLLM tilføjer `/v1/chat/completions` |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | med `/v1`         | Ja                                            |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | rod               | Nej — Claude Code tilføjer `/v1/messages`     |
| `setup-codex`, `launch-codex` (`model_providers.shiguang-gateway.base_url`)       | med `/v1`         | Ja                                            |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | med `/v1`         | Ja                                            |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | rod               | Nej — SDK'en tilføjer `/v1beta/models/…`      |

---

## Bevare native afhængigheder ved opdatering: `--include=optional`

Når du opdaterer med `shiguang-gateway update` (efter bekræftelse eller med `--apply`),
kører ShiguangGateway installationen med `--include=optional` indbygget:

```bash
npm install -g shiguang-gateway@latest --include=optional
```

Dette er **ikke** en flag, du sender til `shiguang-gateway update` — det anvendes altid af
opdateringsprogrammet. Det garanterer, at `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, LLMLingua SLM-stakken) overlever opdateringen, selvom din npm-konfiguration
har `omit=optional` indstillet, hvilket ellers stille ville fjerne den native SQLite
driver og OS-keyring binding. For at forhåndsvise den nøjagtige kommando uden at anvende:

```bash
shiguang-gateway update --dry-run
# [DRY RUN] Ville køre: npm install -g shiguang-gateway@latest --include=optional
```

Andre `shiguang-gateway update` flag (verificeret i kildekoden): `--check` (afslut 1 hvis
forældet), `--apply` (installer uden at spørge), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI via `shiguang-gateway run gemini`

Kontrakten er verificeret mod `@google/gemini-cli` 0.50.0: CLI'en respekterer
`GOOGLE_GEMINI_BASE_URL` og udsender `POST /v1beta/models/<model>:generateContent`
(og `:streamGenerateContent?alt=sse`) imod det — præcist ShiguangGateways native
Gemini-overflade (`/v1beta`). `shiguang-gateway run gemini` forbinder det automatisk:

- `GOOGLE_GEMINI_BASE_URL` → den aktive ShiguangGateway base URL (rod, ingen `/v1`);
- `GEMINI_API_KEY` → den løste ShiguangGateway legitimationsoplysning (mulighed/miljø/kontekst);
- en **midlertidig isoleret `GEMINI_CLI_HOME`** hvis `.gemini/settings.json`
  vælger `gemini-api-key` autentifikation, så en gemt Google OAuth-session (Code Assist)
  aldrig overskriver den ShiguangGateway-styrede lancering — fjernet efter exit;
- **miljøhygiejne**: børne-miljøet er renset for `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` og `GOOGLE_GENAI_USE_GCA` (som ville omdirigere
  autentifikation til Vertex/Code Assist), og `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key` er
  indstillet som en sikkerhedsforanstaltning — de andre `run` mål får samme
  behandling for deres egne konfliktende variabler;
- `--model <id>` injektion fra `--provider`/`--model`.

```bash
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

Geminis arbejdsplads-tillidsbeskyttelse gælder stadig i headless-tilstand — send
`--skip-trust` (eller stol på mappen interaktivt) selv; lanceren
omgår bevidst ikke dette. Denne lancer er forskellig fra **ACP
registreringen** (`src/lib/acp/registry.ts`, `gemini --acp`), som forbliver
agent-protokol integrationen for `/dashboard/acp-agents`.

---

## Real smoke sweep (opt-in)

Deterministiske lanceringsplan regressionskørsler i CI (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). For at validere de REAL binære mod en REAL
ShiguangGateway server, findes der en opt-in ramme ved
`tests/integration/upstream-cli-smoke.int.test.ts`. Den kører aldrig automatisk
(alle under-tests springes over medmindre `RUN_CLI_SMOKE=1`), sender legitimationsoplysningerne via miljøvariabel
NAVN (aldrig ved værdi), redigerer nøgleformede strenge fra enhver registreret output, springer
mål over hvis binæren ikke er installeret, og klassificerer fejl som
auth / upstream / config i stedet for en ren boolean:

```bash
RUN_CLI_SMOKE=1 \
SHIGUANG_GATEWAY_SMOKE_BASE_URL="http://localhost:20128" \
SHIGUANG_GATEWAY_SMOKE_MODEL="<provider/model>" \
SHIGUANG_GATEWAY_SMOKE_API_KEY_ENV="SHIGUANG_GATEWAY_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

Valgfrit: `SHIGUANG_GATEWAY_SMOKE_TARGETS="codex,opencode,qwen"` begrænser sweepet;
`SHIGUANG_GATEWAY_SMOKE_TIMEOUT_MS` overskriver timeout på 120s pr. mål.

---

## Se også

- [Claude Code konfiguration](./CLAUDE-CODE-CONFIGURATION.md) — den dybere Claude Code guide
- [Codex CLI konfiguration](./CODEX-CLI-CONFIGURATION.md) — den engangs `[model_providers.shiguang-gateway]` grundopsætning
- [Fjernbetjeningstilstand](./REMOTE-MODE.md) — kontekster, scoped adgangstokens, kørsel af en fjernserver
- [CLI Værktøjer reference](../reference/CLI-TOOLS.md) — det fulde katalog over understøttede værktøjer + dashboard sider
- [Opsætningsguide](./SETUP_GUIDE.md) — installationsmetoder og onboarding ved første kørsel
