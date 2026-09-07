# CLI-TOOLS (Dansk)

🌐 **Languages:** 🇺🇸 [English](../../../../reference/CLI-TOOLS.md) · 🇸🇦 [ar](../../../ar/docs/reference/CLI-TOOLS.md) · 🇦🇿 [az](../../../az/docs/reference/CLI-TOOLS.md) · 🇧🇬 [bg](../../../bg/docs/reference/CLI-TOOLS.md) · 🇧🇩 [bn](../../../bn/docs/reference/CLI-TOOLS.md) · 🇨🇿 [cs](../../../cs/docs/reference/CLI-TOOLS.md) · 🇩🇪 [de](../../../de/docs/reference/CLI-TOOLS.md) · 🇪🇸 [es](../../../es/docs/reference/CLI-TOOLS.md) · 🇮🇷 [fa](../../../fa/docs/reference/CLI-TOOLS.md) · 🇫🇮 [fi](../../../fi/docs/reference/CLI-TOOLS.md) · 🇫🇷 [fr](../../../fr/docs/reference/CLI-TOOLS.md) · 🇮🇳 [gu](../../../gu/docs/reference/CLI-TOOLS.md) · 🇮🇱 [he](../../../he/docs/reference/CLI-TOOLS.md) · 🇮🇳 [hi](../../../hi/docs/reference/CLI-TOOLS.md) · 🇭🇺 [hu](../../../hu/docs/reference/CLI-TOOLS.md) · 🇮🇩 [id](../../../id/docs/reference/CLI-TOOLS.md) · 🇮🇩 [in](../../../in/docs/reference/CLI-TOOLS.md) · 🇮🇹 [it](../../../it/docs/reference/CLI-TOOLS.md) · 🇯🇵 [ja](../../../ja/docs/reference/CLI-TOOLS.md) · 🇰🇷 [ko](../../../ko/docs/reference/CLI-TOOLS.md) · 🇮🇳 [mr](../../../mr/docs/reference/CLI-TOOLS.md) · 🇲🇾 [ms](../../../ms/docs/reference/CLI-TOOLS.md) · 🇳🇱 [nl](../../../nl/docs/reference/CLI-TOOLS.md) · 🇳🇴 [no](../../../no/docs/reference/CLI-TOOLS.md) · 🇵🇭 [phi](../../../phi/docs/reference/CLI-TOOLS.md) · 🇵🇱 [pl](../../../pl/docs/reference/CLI-TOOLS.md) · 🇵🇹 [pt](../../../pt/docs/reference/CLI-TOOLS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/reference/CLI-TOOLS.md) · 🇷🇴 [ro](../../../ro/docs/reference/CLI-TOOLS.md) · 🇷🇺 [ru](../../../ru/docs/reference/CLI-TOOLS.md) · 🇸🇰 [sk](../../../sk/docs/reference/CLI-TOOLS.md) · 🇸🇪 [sv](../../../sv/docs/reference/CLI-TOOLS.md) · 🇰🇪 [sw](../../../sw/docs/reference/CLI-TOOLS.md) · 🇮🇳 [ta](../../../ta/docs/reference/CLI-TOOLS.md) · 🇮🇳 [te](../../../te/docs/reference/CLI-TOOLS.md) · 🇹🇭 [th](../../../th/docs/reference/CLI-TOOLS.md) · 🇹🇷 [tr](../../../tr/docs/reference/CLI-TOOLS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/reference/CLI-TOOLS.md) · 🇵🇰 [ur](../../../ur/docs/reference/CLI-TOOLS.md) · 🇻🇳 [vi](../../../vi/docs/reference/CLI-TOOLS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/reference/CLI-TOOLS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/reference/CLI-TOOLS.md)

---

---

title: "CLI Værktøjer — ShiguangGateway"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI Værktøjer — ShiguangGateway

Sidst opdateret: 2026-08-18

ShiguangGateway integrerer med tre kategorier af CLI værktøjer fordelt på tre dedikerede dashboard sider:

| Side            | Rute                    | Koncept                                                                       | Antal       |
| --------------- | ----------------------- | ----------------------------------------------------------------------------- | ----------- |
| **CLI Kode's**  | `/dashboard/cli-code`   | Kodningsværktøjer, du peger på ShiguangGateway (Klient → CLI → ShiguangGateway → Udbyder) | 26          |
| **CLI Agenter** | `/dashboard/cli-agents` | Autonome agenter, du peger på ShiguangGateway (samme flow, bredere omfang)          | 8           |
| **ACP Agenter** | `/dashboard/acp-agents` | CLIs, som ShiguangGateway genererer som backend via stdio/ACP (omvendt flow)        | se register |

Legacy ruter omdirigerer via 308: `/dashboard/cli-tools` → `/dashboard/cli-code`, `/dashboard/agents` → `/dashboard/acp-agents`.

---

## Hvordan det fungerer

```
CLI Kode's / CLI Agenter (forbrugsflow):
Claude / Codex / OpenCode / Cline / KiloCode / Continue / Hermes Agent / Goose / ...
           │
           ▼  (alle peger på ShiguangGateway)
    http://YOUR_SERVER:20128/v1
           │
           ▼  (ShiguangGateway ruter til den rigtige udbyder)
    Anthropic / OpenAI / Gemini / DeepSeek / Groq / Mistral / ...

ACP Agenter (omvendt genereringsflow):
    Klientanmodning → ShiguangGateway → genererer CLI via stdio/ACP → svar
```

**Fordele:**

- Én API-nøgle til at administrere alle værktøjer
- Omkostningssporing på tværs af alle CLIs i dashboardet
- Modelskift uden at omkonfigurere hvert værktøj
- Fungerer lokalt og på fjernservere (VPS, Docker, Akamai, Cloudflare Tunnel)

---

## Auto-konfigurer med `setup-*`

Du behøver ikke at skrive hver værktøjs konfiguration i hånden. ShiguangGateway leverer en `setup-*`
kommando pr. understøttet CLI, der læser den **live** modelkatalog fra en kørende
ShiguangGateway (lokal eller fjern) og skriver værktøjets egen konfiguration på din maskine:

```bash
shiguang-gateway setup-codex        shiguang-gateway setup-claude       shiguang-gateway setup-opencode
shiguang-gateway setup-cline        shiguang-gateway setup-kilo         shiguang-gateway setup-continue
shiguang-gateway setup-cursor       shiguang-gateway setup-roo          shiguang-gateway setup-crush
shiguang-gateway setup-goose        shiguang-gateway setup-qwen         shiguang-gateway setup-aider
```

Hver accepterer `--remote <url> --api-key <key>` (konfigurer et lokalt værktøj mod en
fjern ShiguangGateway), `--dry-run` (forhåndsvisning uden at skrive), og `--port`. Værktøjer
uden model auto-opdagelse (Cline, Kilo, Roo, Goose, Aider, Qwen) tager
`--model <id>` (og `--yes` for ikke-interaktive kørsel). For at starte en CLI med den
rette miljøvariabel injiceret og ingen konfiguration skrevet overhovedet, brug den generiske
`shiguang-gateway run <target>` launcher (claude, codex, aider, goose, opencode, qwen,
gemini — mål og aliaser kommer fra `bin/cli/cli-manifest.mjs`); de legacy
per-værktøj launchers `shiguang-gateway launch` (Claude Code) og `shiguang-gateway launch-codex`
(Codex) forbliver tilgængelige. Gemini CLI er kun til lancering: det er et `shiguang-gateway run`
mål, men har ingen `setup-*`/`configure` opskrift.

> **Fuld reference:** mastertabellen — hvad hver kommando skriver, hver flag,
> lokal vs fjern, og hvilke værktøjer der ønsker et `/v1` suffix — findes i
> **[CLI Integrationer](../guides/CLI-INTEGRATIONS.md)**.

### Kørsel af disse inde i en container

En `setup-*` kommando udført inde i ShiguangGateway containeren skriver ind i
containerens egen hjemmemappe, som ingen værts-CLI læser og som forsvinder med
containeren. ShiguangGateway opdager det og afslutter med `2` med instruktioner i stedet for
at skrive. To understøttede måder fremad — installer CLI på værten og
`shiguang-gateway connect` til containeren, eller bind-mount konfigurationsmapperne og sæt
`CLI_CONFIG_HOME` (den compose `host` profil). Hver `setup-*` kommando, plus
`shiguang-gateway configure` og `shiguang-gateway config set`, accepterer
`--allow-container-write`, når konfiguration af containerens egne CLIs er det, du
faktisk mente; `SHIGUANG_GATEWAY_ALLOW_CONTAINER_CONFIG_WRITE=true` gør det samme for
serveren. Se
[Docker Guide → Konfigurering af værts-CLI værktøjer](../guides/DOCKER_GUIDE.md#configuring-host-cli-tools-when-shiguang-gateway-runs-in-docker).

Dashboardets **apply endpoint** (`POST /api/cli-tools/apply`) håndhæver den
samme beskyttelse: i en container, en skrivning hvis mål ikke er bind-mountet fra
værten svarer **`422`** med `containerEphemeralTarget: true`, den sikre fejltekst og — for
de værktøjer med en værtsopskrift (claude, codex, opencode, cline,
kilo, continue) — en `hostSetupCommand` (f.eks. `shiguang-gateway setup-opencode`) der skal køres
på værten i stedet; intet skrives. `dryRun: true` fortsætter med at fungere i container
tilstand og returnerer det genererede indhold + målsti uden at røre disken, så
du kan forhåndsvise fra dashboardet og anvende på værten. Denne adfærd er
intentionel og regressionsbeskyttet af
`tests/unit/api/cli-tools/apply-container-guard.test.ts` — fjern aldrig "fix" en 422
ved at fjerne beskyttelsen.

---

## Sandkasse

Den samlede katalog findes i `src/shared/constants/cliTools.ts` som `CLI_TOOLS: Record<string, CliCatalogEntry>`.

Hver post har disse felter (defineret i `src/shared/schemas/cliCatalog.ts`):

| Felt                                            | Type                                                         | Beskrivelse                                                    |
| ----------------------------------------------- | ------------------------------------------------------------ | -------------------------------------------------------------- |
| `category`                                      | `"code" \| "agent"`                                          | Hvilken side værktøjet vises på                                |
| `vendor`                                        | `string`                                                     | Værktøjets oprindelse ("Anthropic", "OSS (P. Gauthier)")       |
| `acpSpawnable`                                  | `boolean`                                                    | Også brugbar som en ACP Agent (badge vist)                     |
| `baseUrlSupport`                                | `"full" \| "partial" \| "none"`                              | Niveau for tilpasset endpoint support. `"none"` = MITM backlog |
| `configType`                                    | `"env" \| "custom" \| "guide" \| "custom-builder" \| "mitm"` | Konfigurationsmekanisme                                        |
| `id`, `name`, `color`, `description`, `docsUrl` | standard                                                     | Kernevisningsfelter                                            |

Poster med `baseUrlSupport: "none"` vises **ikke** på dashboard-siderne — de er registreret i MITM-backloggen for plan 11 (se `_tasks/features-v3.8.6/refactorpages/_orchestration/_plan11-mitm-backlog.md`).

### Kapabilitet niveauer (katalogiseret × detekterbar × konfigurerbar × lancerbar)

Ikke hvert katalogiseret værktøj er detekterbart, konfigurerbart eller lancerbart. Hvert niveau har en
erklærende kilde, og en driftstest holder dem synkroniseret:

| Niveau            | Betydning                                                                         | Erklæret i                                                        |
| ----------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| **Katalogiseret** | Visas i dashboard-kataloget (navn, leverandør, dokumentation, konfigurationstype) | `src/shared/constants/cliTools.ts` (`CLI_TOOLS`)                  |
| **Detekterbar**   | Binær/konfigurationsdetektion, sundhedstjek, konfigurationsstier                  | `src/shared/services/cliRuntime.ts` (`CLI_TOOLS` runtime katalog) |
| **Konfigurerbar** | Understøttet af `shiguang-gateway configure <cli>` (opsætningsopskrift eksisterer)       | `bin/cli/cli-manifest.mjs` (`configure: true`)                    |
| **Lancerbar**     | Understøttet af `shiguang-gateway run <target>` (env/args injektion defineret)           | `bin/cli/cli-manifest.mjs` (`run: true`)                          |

`bin/cli/cli-manifest.mjs` er det kanoniske eksekverbare manifest for CLI-kommandoerne
overflader: `run`, `configure` og shell-completion generatorer afleder alle deres
mål lister, alias opløsning (for eksempel `kilocode`/`kilo-code`/`kilo_cli` → `kilo`)
og `--model` flag wiring fra det. Driftbeskyttelsen
`tests/unit/cli/cli-manifest-drift.test.ts` bekræfter, at manifestet, runtime
kataloget, UI kataloget og hver forbruger overflade forbliver synkroniseret — et mål tilføjet til
én overflade uden de andre fejler suite i stedet for at drive stille.

## 1. CLI Kodekatalog (26 værktøjer)

Alle værktøjer, der vises i `/dashboard/cli-code`. De med `baseUrlSupport: none` er tilsluttet gennem MITM eller en manuel vejledning i stedet for en tilpasset base URL:

| id           | navn                    | leverandør          | baseUrlSupport | configType     | acpSpawnable |
| ------------ | ----------------------- | ------------------- | -------------- | -------------- | ------------ |
| claude       | Claude Kode             | Anthropic           | fuld           | env            | true         |
| codex        | OpenAI Codex CLI        | OpenAI              | fuld           | custom         | true         |
| zcode        | ZCode (GLM Coding Plan) | Z.ai                | ingen          | custom         | false        |
| cline        | Cline                   | OSS (ex-Claude Dev) | fuld           | custom         | true         |
| kilo         | Kilo Kode               | Kilo-Org            | fuld           | custom         | false        |
| roo          | Roo Kode                | Roo (OSS)           | fuld           | guide          | false        |
| continue     | Continue                | continue.dev        | fuld           | guide          | false        |
| aider        | Aider                   | OSS (P. Gauthier)   | fuld           | guide          | true         |
| forge        | ForgeCode               | Antinomy HQ         | fuld           | custom         | true         |
| jcode        | jcode                   | 1jehuang (OSS)      | fuld           | custom         | false        |
| deepseek-tui | DeepSeek TUI            | Hunter Bown (OSS)   | fuld           | custom         | false        |
| codewhale    | CodeWhale               | Hmbown (OSS)        | fuld           | custom         | false        |
| opencode     | OpenCode                | Anomaly (ex-SST)    | fuld           | guide          | true         |
| droid        | Factory Droid           | Factory AI          | delvis         | guide          | false        |
| copilot      | GitHub Copilot CLI      | GitHub/MS           | fuld           | custom         | false        |
| cursor-cli   | Cursor CLI              | Anysphere           | delvis         | guide          | true         |
| smelt        | Smelt                   | leonardcser (OSS)   | fuld           | custom         | false        |
| pi           | Pi (pi-coding-agent)    | M. Zechner (OSS)    | fuld           | custom         | false        |
| grok-build   | Grok Build              | xAI                 | fuld           | custom         | false        |
| crush        | Crush                   | OSS (Charm)         | fuld           | custom         | false        |
| qwen         | Qwen Kode               | Alibaba             | fuld           | guide          | true         |
| cursor       | Cursor                  | Anysphere           | ingen          | guide          | false        |
| antigravity  | Antigravity             | Google              | ingen          | mitm           | false        |
| hermes       | Hermes                  | Nous Research       | ingen          | guide          | false        |
| kiro         | Kiro AI                 | Amazon              | ingen          | mitm           | false        |
| custom       | Custom CLI              | —                   | fuld           | custom-builder | false        |

Værktøjer med `baseUrlSupport: "partial"` viser et badge "⚠ Base URL parcial" i dashboardkortet.

## 2. CLI Agenter Katalog (8 værktøjer)

Autonome agenter, der vises i `/dashboard/cli-agents`:

| id           | navn             | leverandør               | baseUrlSupport | acpSpawnable |
| ------------ | ---------------- | ------------------------ | -------------- | ------------ |
| hermes-agent | Hermes Agent     | Nous Research            | fuld           | falsk        |
| openclaw     | OpenClaw         | OSS (P. Steinberger)     | fuld           | sand         |
| goose        | Goose            | Block / Linux Foundation | fuld           | sand         |
| interpreter  | Open Interpreter | OSS                      | fuld           | sand         |
| warp         | Warp AI          | Warp Inc.                | delvis         | sand         |
| agent-deck   | Agent Deck       | asheshgoplani (OSS)      | fuld           | falsk        |
| omp          | Oh My Pi         | OSS                      | fuld           | sand         |
| letta        | Letta CLI        | Letta                    | fuld           | falsk        |

---

## 3. ACP Agenter (/dashboard/acp-agents)

Denne side (omdøbt fra `/dashboard/agents`) viser CLIs, som ShiguangGateway kan **spawne** som backend eksekveringsmotorer via stdio/ACP protokol. Katalogen vedligeholdes separat i `src/lib/acp/registry.ts` og er **ikke** den samme som `CLI_TOOLS`.

---

## 4. MITM Backlog (ikke vist i dashboard)

Følgende CLIs understøtter ikke brugerdefineret base URL nativt og er **ikke listet** i CLI Code's eller CLI Agents sider. De er kandidater til MITM interception i plan 11:

| CLI                 | Årsag                                                                 |
| ------------------- | --------------------------------------------------------------------- |
| windsurf            | BYOK begrænset til udvalgte Claude modeller + virksomhedens URL/token |
| amp                 | Lukket økosystem (Sourcegraph)                                        |
| amazon-q / kiro-cli | AWS SSO autentificering, ingen brugerdefineret URL                    |
| cowork              | Anthropic Desktop, ingen konfigurerbar endpoint                       |

Se `_tasks/features-v3.8.6/refactorpages/_orchestration/_plan11-mitm-backlog.md` for den fulde krydsreference.

---

## 5. Batch Detection API

Alle værktøjsdetektioner er aggregeret via et enkelt endpoint:

**`GET /api/cli-tools/all-statuses`**

- Auth: `requireCliToolsAuth(request)` (samme som andre `/api/cli-tools/` ruter)
- Returnerer: `Record<toolId, ToolBatchStatus>` (type: `src/shared/types/cliBatchStatus.ts`)
- Strategi: `Promise.all` over alle værktøjer, 5s timeout pr. værktøj
- Cache: i-hukommelse LRU indekseret efter konfigurationsfil `mtime`. Cache ugyldiggjort når mtime ændres. Nulstil ved server genstart.

Responsform pr. værktøj:

```ts
interface ToolBatchStatus {
  detection: {
    installed: boolean;
    runnable: boolean;
    version?: string;
    command?: string;
    commandPath?: string;
    reason?: string;
  };
  config: {
    status: "configured" | "not_configured" | "not_installed" | "unknown" | "other";
    endpoint?: string | null;
    lastConfiguredAt?: string | null;
  };
  error?: string; // sanitiseret, ingen stack traces
}
```

## 6. Indstillinger Håndterere for Nye Værktøjer

Nye værktøjer med `configType: "custom"` har dedikerede indstillings-API-ruter:

| Rute                                        | Værktøj                                                         |
| ------------------------------------------- | --------------------------------------------------------------- |
| `POST /api/cli-tools/forge-settings`        | ForgeCode (.forge.toml)                                         |
| `POST /api/cli-tools/jcode-settings`        | jcode (--base-url flag)                                         |
| `POST /api/cli-tools/deepseek-tui-settings` | DeepSeek TUI (OPENAI_BASE_URL, legacy)                          |
| `POST /api/cli-tools/codewhale-settings`    | CodeWhale (OPENAI_BASE_URL, primær + legacy `~/.deepseek` synk) |
| `POST /api/cli-tools/smelt-settings`        | Smelt                                                           |
| `POST /api/cli-tools/pi-settings`           | Pi coding agent                                                 |
| `POST /api/cli-tools/grok-build-settings`   | Grok Build (~/.grok/config.toml, `[model.shiguang-gateway]`)           |
| `POST /api/cli-tools/qwen-settings`         | Qwen Code (`~/.qwen/settings.json` + dedikeret `.env` nøgle)    |

Alle ruter bruger `sanitizeErrorMessage()` til fejlrespons (Hard Rule #12).

---

## 7. Dashboard Sider Arkitektur

### CLI Kode (`/dashboard/cli-code`)

- `src/app/(dashboard)/dashboard/cli-code/page.tsx` — serverkomponent
- `src/app/(dashboard)/dashboard/cli-code/CliCodePageClient.tsx` — klientgitter
- `src/app/(dashboard)/dashboard/cli-code/[id]/page.tsx` — værktøjsdetaljeside
- `src/app/(dashboard)/dashboard/cli-code/components/` — 12 specialiserede værktøjskort + `ToolDetailClient.tsx`

### CLI Agenter (`/dashboard/cli-agents`)

- `src/app/(dashboard)/dashboard/cli-agents/page.tsx` — serverkomponent
- `src/app/(dashboard)/dashboard/cli-agents/CliAgentsPageClient.tsx` — klientgitter
- `src/app/(dashboard)/dashboard/cli-agents/[id]/page.tsx` — genbruger `ToolDetailClient`

### ACP Agenter (`/dashboard/acp-agents`)

- `src/app/(dashboard)/dashboard/acp-agents/page.tsx` — serverkomponent (flyttet fra `agents/`)

### Delte UI Komponenter (`src/shared/components/cli/`)

| Fil                     | Formål                                                  |
| ----------------------- | ------------------------------------------------------- |
| `CliToolCard.tsx`       | Smart statuskort (detektion + konfiguration + endpoint) |
| `CliConceptCard.tsx`    | Per-side konceptforklaringskort                         |
| `CliComparisonCard.tsx` | Tre-kolonne sammenligning på tværs af CLI-typer         |
| `BaseUrlSelect.tsx`     | Endpoint dropdown (Lokal/Cloud/Custom)                  |
| `ApiKeySelect.tsx`      | API-nøglevælger                                         |
| `ManualConfigModal.tsx` | Kopierbar konfigurationssnippet modal                   |

### Delte Hook (`src/shared/hooks/cli/`)

| Fil                       | Formål                                                                       |
| ------------------------- | ---------------------------------------------------------------------------- |
| `useToolBatchStatuses.ts` | Henter `/api/cli-tools/all-statuses`, håndterer indlæsning/opdateringsstatus |

## 8. i18n

Nye navnerum tilføjet i plan 14 F9:

| Navnerum    | Formål                                                                                |
| ----------- | ------------------------------------------------------------------------------------- |
| `cliCommon` | Delte strenge (kortetiketter, koncept/komparative tekster, detaljerede sideetiketter) |
| `cliCode`   | CLI Code's side-strenge                                                               |
| `cliAgents` | CLI Agents side-strenge                                                               |
| `acpAgents` | ACP Agents side-strenge                                                               |

Fuld PT-BR og EN oversættelser er tilgængelige. 39 andre lokaliteter falder automatisk tilbage til EN via navnerumsniveau-sammenlægning i `src/i18n/request.ts`.

---

## 9. Hurtig Start

### Trin 1 — Få en ShiguangGateway API-nøgle

1. Åbn `/dashboard/api-manager` → **Opret API-nøgle**
2. Giv den et navn (f.eks. `cli-tools`) og vælg alle tilladelser
3. Kopier nøgle — du får brug for den til hver CLI nedenfor

> Din nøgle ser sådan ud: `sk-xxxxxxxxxxxxxxxx-xxxxxxxxx`

---

### Trin 2 — Installer CLI-værktøjer

Alle npm-baserede værktøjer kræver Node.js 22.22.2+ eller 24.x:

```bash
# Claude Code (Anthropic)
npm install -g @anthropic-ai/claude-code

# OpenAI Codex
npm install -g @openai/codex

# OpenCode
npm install -g opencode-ai

# Cline
npm install -g cline

# KiloCode
npm install -g kilocode

# Qwen Code
npm install -g @qwen-code/qwen-code

# Google Gemini CLI (kan startes via `shiguang-gateway run gemini` → /v1beta surface)
npm install -g @google/gemini-cli

# Aider
pip install aider-chat

# Smelt
cargo install smelt  # Rust-baseret

# Pi coding agent
# se https://github.com/zechnerj/pi-coding-agent for installation

# jcode
# se https://github.com/1jehuang/jcode for installation
```

---

### Trin 3 — Konfigurer via Dashboard

1. Gå til `http://localhost:20128/dashboard/cli-code`
2. Find dit værktøj i gitteret
3. Klik på kortet for at åbne værktøjets detaljeside
4. Vælg din API-nøgle og base-URL
5. Klik på **Anvend konfiguration** eller kopier den manuelle konfigurationssnippet

---

### Trin 4 — Indstil globale miljøvariabler

```bash
# ShiguangGateway Universal Endpoint
export OPENAI_BASE_URL="http://localhost:20128/v1"
export OPENAI_API_KEY="sk-your-shiguang-gateway-key"
export ANTHROPIC_BASE_URL="http://localhost:20128"
export ANTHROPIC_AUTH_TOKEN="sk-your-shiguang-gateway-key"
# Gemini CLI læser GOOGLE_GEMINI_BASE_URL ved ROOT (dens SDK tilføjer /v1beta/... selv)
export GOOGLE_GEMINI_BASE_URL="http://localhost:20128"
export GEMINI_API_KEY="sk-your-shiguang-gateway-key"
```

> For en **fjernserver** erstat `localhost:20128` med serverens IP eller domæne,
> f.eks. `http://<your-server-ip>:20128`.

---

### Trin 4 — Konfigurer hvert værktøj

#### Claude Code

```bash
# Opret ~/.claude/settings.json:
mkdir -p ~/.claude && cat > ~/.claude/settings.json << EOF
{
  "env": {
    "ANTHROPIC_BASE_URL": "http://localhost:20128",
    "ANTHROPIC_AUTH_TOKEN": "sk-your-shiguang-gateway-key"
  }
}
EOF
```

Brug den samlede Anthropic gateway root til Claude Code. Tilføj ikke `/v1` her.

**Test:** `claude "say hello"`

---

#### OpenAI Codex

Moderne Codex (v0.137+) læser kun `~/.codex/config.toml` — den gamle
`config.yaml` tilhører den forældede npm CLI og ignoreres stille. API-nøglen
forbliver i miljøvariablen `SHIGUANG_GATEWAY_API_KEY` (`env_key`), aldrig
inde i filen:

```bash
mkdir -p ~/.codex && cat > ~/.codex/config.toml << EOF
model_provider = "shiguang-gateway"

[model_providers.shiguang-gateway]
name                 = "ShiguangGateway"
base_url             = "http://localhost:20128/v1"
env_key              = "SHIGUANG_GATEWAY_API_KEY"
requires_openai_auth = false
EOF
export SHIGUANG_GATEWAY_API_KEY="sk-your-shiguang-gateway-key"
```

Fuld reference (profiler, `wire_api`, kontekstvinduer): [CODEX-CLI-CONFIGURATION.md](../guides/CODEX-CLI-CONFIGURATION.md).

**Test:** `codex "what is 2+2?"`

---

#### OpenCode

```bash
mkdir -p ~/.config/opencode && cat > ~/.config/opencode/opencode.json << EOF
{
  "\$schema": "https://opencode.ai/config.json",
  "provider": {
    "shiguang-gateway": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "ShiguangGateway",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "sk-your-shiguang-gateway-key"
      },
      "models": {
        "claude-sonnet-4-5": { "name": "claude-sonnet-4-5" },
        "claude-sonnet-4-5-thinking": { "name": "claude-sonnet-4-5-thinking" },
        "gemini-3-flash": { "name": "gemini-3-flash" }
      }
    }
  }
}
EOF
```

**Test:** `opencode`

> Brug `opencode run "your prompt" --model shiguang-gateway/claude-sonnet-4-5-thinking --variant high`
> for at sende tænkevarianter.

---

#### Cline (CLI eller VS Code)

**CLI-tilstand:**

```bash
mkdir -p ~/.cline/data && cat > ~/.cline/data/globalState.json << EOF
{
  "apiProvider": "openai",
  "openAiBaseUrl": "http://localhost:20128/v1",
  "openAiApiKey": "sk-your-shiguang-gateway-key"
}
EOF
```

**VS Code-tilstand:**
Cline-udvidelsesindstillinger → API-udbyder: `OpenAI Compatible` → Base URL: `http://localhost:20128/v1`

Eller brug ShiguangGateway-dashboardet → **CLI Tools → Cline → Anvend konfiguration**.

---

#### KiloCode (CLI eller VS Code)

**CLI-tilstand:**

```bash
kilocode --api-base http://localhost:20128/v1 --api-key sk-your-shiguang-gateway-key
```

**VS Code-indstillinger:**

```json
{
  "kilo-code.openAiBaseUrl": "http://localhost:20128/v1",
  "kilo-code.apiKey": "sk-your-shiguang-gateway-key"
}
```

Eller brug ShiguangGateway-dashboardet → **CLI Tools → KiloCode → Anvend konfiguration**.

---

#### Continue (VS Code-udvidelse)

Rediger `~/.continue/config.yaml`:

```yaml
models:
  - name: ShiguangGateway
    provider: openai
    model: auto
    apiBase: http://localhost:20128/v1
    apiKey: sk-your-shiguang-gateway-key
    default: true
```

Genstart VS Code efter redigering.

---

#### VS Code Insiders (`chatLanguageModels.json`)

Brug dette, når VS Code Insiders er konfigureret til brugerdefinerede endpoint-modeller, og du ønsker, at ShiguangGateway skal fungere uden et brugerdefineret headerfelt.

**Anbefalet placering:**

- Linux: `~/.config/Code - Insiders/User/chatLanguageModels.json`
- Windows: `%APPDATA%/Code - Insiders/User/chatLanguageModels.json`

**Eksempel ved brug af den tokeniserede ShiguangGateway-alias:**

```json
[
  {
    "vendor": "customendpoint",
    "id": "auto",
    "name": "ShiguangGateway Auto",
    "family": "gpt-4",
    "version": "1.0.0",
    "url": "http://localhost:20128/api/v1/vscode/sk-your-shiguang-gateway-key/chat/completions",
    "modelsUrl": "http://localhost:20128/api/v1/vscode/sk-your-shiguang-gateway-key/models",
    "requestFormat": "openai-chat-completions",
    "contextWindow": 256000,
    "maxOutputTokens": 32768,
    "auth": {
      "type": "none"
    }
  }
]
```

**Bemærkninger:**

- Erstat `sk-your-shiguang-gateway-key` med en API-nøgle oprettet i ShiguangGateway.
- Feltet `url` skal pege på `/api/v1/vscode/{token}/chat/completions`.
- Feltet `modelsUrl` skal pege på `/api/v1/vscode/{token}/models`.
- Foretræk den normale `/v1` + Bearer header-flow, når klienten understøtter brugerdefinerede headers.
- URL-embedded tokens er en kompatibilitetsfald tilbage og kan vises i editorlogs eller proxyhistorik.

---

#### Kiro CLI (Amazon)

```bash
# Log ind på din AWS/Kiro-konto:
kiro-cli login

# CLI'en bruger sin egen autentificering — ShiguangGateway er ikke nødvendig som backend for Kiro CLI selv.
# Brug kiro-cli sammen med ShiguangGateway til andre værktøjer.
kiro-cli status
```

For **Kiro IDE** desktopapp, brug MITM-endpointet, der er eksponeret af ShiguangGateway
under `/dashboard/cli-tools → Kiro`.

---

## 10. Intern ShiguangGateway CLI

Den `shiguang-gateway` binære fil giver kommandoer til serverlivscyklus, opsætning, diagnostik og leverandørstyring. Indgangspunkt: `bin/shiguang-gateway.mjs`.

```bash
shiguang-gateway                              # Start server (standard port 20128)
shiguang-gateway setup                        # Interaktiv opsætningsguide
shiguang-gateway doctor                       # Tjek konfiguration, DB, porte, runtime
shiguang-gateway providers list               # Konfigurerede leverandørforbindelser
shiguang-gateway providers test-all           # Test hver aktiv forbindelse
shiguang-gateway reset-password               # Nulstil adminadgangskode
shiguang-gateway logs                         # Stream anmodningslogs
shiguang-gateway health                       # Detaljeret sundhed (afbrydere, cache, hukommelse)
shiguang-gateway --version                    # Udskriv version
shiguang-gateway --help                       # Vis alle kommandoer
```

### Opsætning & Initialisering

```bash
shiguang-gateway setup                        # Interaktiv opsætningsguide
shiguang-gateway setup --non-interactive      # CI/automatiseringsmode (læser miljøvariabler + flags)
shiguang-gateway setup --password '<value>'   # Indstil adminadgangskode direkte
shiguang-gateway setup --add-provider \
  --provider openai \
  --api-key '<value>' \
  --test-provider                      # Tilføj og test en leverandør i ét hug
```

Anerkendte miljøvariabler til ikke-interaktiv opsætning:

| Var                 | Formål                                                               |
| ------------------- | -------------------------------------------------------------------- |
| `SHIGUANG_GATEWAY_API_KEY` | Leverandør API-nøgle (bundet til `--api-key` via Commander `.env()`) |
| `DATA_DIR`          | Overskriv ShiguangGateway data katalog                                     |

Alle andre ikke-interaktive input gives som flags, ikke miljøvariabler:
`--password`, `--provider`, `--provider-name`, `--provider-base-url`, `--default-model`
(se `shiguang-gateway setup` mulighederne ovenfor).

### Diagnostik

```bash
shiguang-gateway doctor                       # Tjek konfiguration, DB, porte, runtime, hukommelse, livlighed
shiguang-gateway doctor --json                # Maskinlæsbart JSON
shiguang-gateway doctor --no-liveness         # Spring HTTP sundhedsprobe over
shiguang-gateway doctor --host 0.0.0.0        # Overskriv livlighedsvært
shiguang-gateway doctor --liveness-url <url>  # Fuldt sundhedsendepunkt URL-overskrivning
```

Doktoren kører disse tjek: `Konfiguration`, `Database`, `Lagring/kryptering`,
`Porttilgængelighed`, `Node runtime`, `Native binær` (better-sqlite3),
`Hukommelse`, og `Serverlivlighed`. Den afslutter ikke-nul, hvis nogen tjek er `fejl`.

### Leverandørstyring

```bash
shiguang-gateway providers available                       # ShiguangGateway leverandørkatalog
shiguang-gateway providers available --search openai       # Filtrer katalog efter id/navn/alias/kategori
shiguang-gateway providers available --category api-key    # Filtrer efter kategori (api-key, oauth, gratis, ...)
shiguang-gateway providers available --json                # Maskinlæsbart JSON

shiguang-gateway providers list                            # Konfigurerede leverandørforbindelser
shiguang-gateway providers list --json

shiguang-gateway providers test <id|name>                  # Test én konfigureret forbindelse
shiguang-gateway providers test-all                        # Test hver aktiv forbindelse
shiguang-gateway providers validate                        # Lokalt strukturel validering
shiguang-gateway providers add <provider> --credential-env PROVIDER_KEY
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth <provider>                 # Eksisterende OAuth-flow
shiguang-gateway providers edit <id|name> --default-model <model>
shiguang-gateway providers remove <id|name> --yes
```

`providers add/import/auth/edit/remove` er API-først og fungerer derfor mod
den aktive lokale eller fjerntliggende kontekst. Credential input bør bruge
`--credential-stdin` eller `--credential-env`; `--dry-run --json` rapporterer kun
redigeret tilstedeværelse/form. `providers available` læser ShiguangGateway kataloget;
`providers list/test/test-all/validate` bevarer deres lokale SQLite adfærd og
kræver ikke, at serveren kører.

### Gendannelse & Nulstilling

```bash
shiguang-gateway reset-password                # Nulstil adminadgangskode (også: shiguang-gateway-reset-password)
shiguang-gateway reset-encrypted-columns       # Vis advarsel + tørkørsel for nulstilling af krypterede legitimationsoplysninger
shiguang-gateway reset-encrypted-columns --force  # Faktisk nulstil krypterede legitimationsoplysninger i SQLite
```

### Eksport af legitimationsoplysninger (⚠ håndter med omhu)

```bash
shiguang-gateway auth export                                 # Vis advarsel + bekræftelsesport — ingen DB-adgang
shiguang-gateway auth export --force                          # Eksporter ALLE forbindelsers DEKRYPPERET legitimationsoplysninger til stdout som JSON
shiguang-gateway auth export --force --id <id>                 # Eksporter kun den matchende forbindelse
shiguang-gateway auth export --force --format env               # Udsend SHIGUANG_GATEWAY_<PROVIDER>_<FIELD>=<value> linjer
shiguang-gateway auth export --force --out creds.json           # Skriv til en fil (oprettet med 0600 tilladelser)
```

`auth export` er **lokal-only** (direkte SQLite læsning, ingen HTTP rute) og udskriver/skriver
**ukrypteret** `apiKey`/`accessToken`/`refreshToken`/`idToken` værdier — det er funktionen, ikke en
fejl. Intet læses fra databasen, og intet dekrypteres, uden `--force`. En stderr
advarselsbanner udskrives altid før nogen ukrypteret data udsendes. Kræver `STORAGE_ENCRYPTION_KEY` at
være indstillet. Et felt, der ikke kan dekrypteres (gammel nøgle, beskadiget ciphertext) rapporteres som
`<field>DecryptFailed: true` i stedet for at abortere hele eksporten eller lække den underliggende fejl.

### Andre underkommandoer

Disse antager en kørende ShiguangGateway server, medmindre andet er angivet:

```bash
shiguang-gateway status                       # Omfattende runtime status
shiguang-gateway logs                         # Stream anmodningslogs (--json, --search, --follow)
shiguang-gateway config show                  # Vis nuværende konfiguration

shiguang-gateway provider list                # Liste over tilgængelige leverandører (alias af providers list)
shiguang-gateway provider add                 # Registrer ShiguangGateway som en leverandør på et værktøj
shiguang-gateway keys add | list | remove     # Administrer API-nøgler
shiguang-gateway models [provider]            # Liste over modeller (--json, --search)
shiguang-gateway combo list | switch | create | delete

shiguang-gateway backup                       # Snapshot konfiguration + DB
shiguang-gateway restore                      # Gendan fra et tidligere snapshot

shiguang-gateway health                       # Detaljeret sundhed (afbrydere, cache, hukommelse)
shiguang-gateway quota                        # Leverandør kvote brug
shiguang-gateway cache                        # Cache status
shiguang-gateway cache clear                  # Ryd semantiske + signatur caches

shiguang-gateway mcp status | restart         # MCP server status / genstart
shiguang-gateway a2a status | card            # A2A server status / agentkort

shiguang-gateway tunnel list | create | stop  # Administrer tunneler (cloudflare/tailscale/ngrok)
shiguang-gateway env show | get <k> | set <k> <v>  # Inspicer / indstil miljøvariabler (midlertidige)

shiguang-gateway test                         # Leverandør tilslutning røgtest
shiguang-gateway update                       # Tjek for opdateringer
shiguang-gateway completion                   # Generer shell completion
```

### Almindelige flags

| Flag                | Beskrivelse                                         |
| ------------------- | --------------------------------------------------- |
| `--no-open`         | Åbn ikke automatisk browseren ved start             |
| `--port <n>`        | Overskriv API-porten (standard 20128)               |
| `--mcp`             | Kør som MCP-server over stdio (til IDE'er)          |
| `--non-interactive` | CI-mode (ingen prompts; læser fra env/flags)        |
| `--json`            | Maskinlæsbart JSON-output (doctor, providers, osv.) |
| `--help`, `-h`      | Vis kommando-specifik hjælp                         |
| `--version`, `-v`   | Udskriv den installerede version                    |

## Tilgængelige API Endpoints

| Endpoint                   | Beskrivelse                   | Brug til                             |
| -------------------------- | ----------------------------- | ------------------------------------ |
| `/v1/chat/completions`     | Standard chat (alle udbydere) | Alle moderne værktøjer               |
| `/v1/responses`            | Responses API (OpenAI format) | Codex, agentiske arbejdsgange        |
| `/v1/completions`          | Legacy tekstkompletteringer   | Ældre værktøjer der bruger `prompt:` |
| `/v1/embeddings`           | Tekst embeddings              | RAG, søgning                         |
| `/v1/images/generations`   | Billedgenerering              | GPT-Image, Flux, osv.                |
| `/v1/audio/speech`         | Tekst-til-tale                | ElevenLabs, OpenAI TTS               |
| `/v1/audio/transcriptions` | Tale-til-tekst                | Deepgram, AssemblyAI                 |

Klar-til-at-indsætte eksempler med en tokeniseret ShiguangGateway URL:

```txt
Token eksempel: sk-a3ab3c080beaee3a-69f4a4-070d71af

Standard OpenAI base: http://localhost:20128/v1
VS Code modeller: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/models
VS Code chat: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/chat/completions
VS Code responses: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/responses
Ollama tags: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/api/tags
Ollama chat: http://localhost:20128/api/v1/vscode/sk-a3ab3c080beaee3a-69f4a4-070d71af/api/chat
```

---

## Fejlfinding

| Fejl                                              | Årsag                     | Løsning                                            |
| ------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| `Connection refused`                              | ShiguangGateway kører ikke      | `shiguang-gateway serve`                                  |
| `401 Unauthorized`                                | Forkert API-nøgle         | Tjek i `/dashboard/api-manager`                    |
| `No combo configured`                             | Ingen aktiv routing combo | Opsæt i `/dashboard/combos`                        |
| CLI viser "not installed"                         | Binær ikke i PATH         | Tjek `which <command>`                             |
| Dashboard viser "not detected" efter installation | Cache forældet            | Klik "⟳ Opdater registrering" i dashboard          |
| Gamle link `/dashboard/cli-tools`                 | Pre-v3.8.6 bogmærke       | Auto-omdirigeret til `/dashboard/cli-code` (308)   |
| Gamle link `/dashboard/agents`                    | Pre-v3.8.6 bogmærke       | Auto-omdirigeret til `/dashboard/acp-agents` (308) |
