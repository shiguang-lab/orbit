# CLI-INTEGRATIONS (Polski)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "Integracje CLI — skieruj dowolne CLI kodujące na Orbit"
version: 3.8.50
lastUpdated: 2026-08-18
---

# Integracje CLI

Orbit dostarcza zestaw poleceń `setup-*`, które konfigurować CLI kodujące (Codex, Claude Code, OpenCode, Cline, …) do używania Orbit jako swojego backendu — dzięki czemu narzędzie komunikuje się z **jednym** punktem końcowym, a Orbit kieruje do odpowiedniego dostawcy z automatycznym przełączaniem. Każde polecenie odczytuje **na żywo** katalog modeli z działającego Orbit (lokalnego lub zdalnego) i zapisuje własny plik konfiguracyjny narzędzia na **twojej** maszynie. Klucz API jest odwoływany przez zmienną środowiskową wszędzie tam, gdzie narzędzie to wspiera. Polecenia, które utrwalają lokalny plik środowiskowy narzędzia, są wymienione poniżej.

Dostępny jest również ogólny launcher — `orbit run <target>` — który uruchamia `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` lub `gemini` z odpowiednim środowiskiem wstrzykniętym, bez zapisywania jakiejkolwiek konfiguracji. Cele i ich aliasy pochodzą z kanonicznego manifestu `bin/cli/cli-manifest.mjs`
(`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`,
`open-code`, `qwen-code`, `gemini-cli`), a `orbit completion` oferuje
te same słowa docelowe pochodzące z manifestu. Starsze launchery per-narzędzie —
`orbit launch` (Claude Code) i `orbit launch-codex` (Codex) — pozostają
dostępne.

Onboarding dostawcy jest dostępny z tego samego kontekstu lokalnego/zdalnego. Poniższe polecenia API-first utrzymują uwierzytelnianie zarządzania oddzielnie od poświadczeń dostawcy i nigdy nie drukują poświadczenia w ustrukturyzowanym wyjściu:

```bash
orbit providers add glm --credential-env GLM_API_KEY --name work
orbit providers import ./providers.json --dry-run --json
orbit providers auth openai
orbit providers edit <connection-id> --default-model glm/glm-5.2
orbit providers remove <connection-id> --yes
```

Dla skryptów, preferuj `--credential-stdin` lub `--credential-env`; `--credential`
jest zachowane do kontrolowanego użytku lokalnego. `providers remove` wymaga `--yes` na
terminalu bez interakcji, a wszystkie pięć poleceń honoruje aktywny kontekst lub globalne opcje `--base-url`/`--api-key`.

Dla jednorazowej, ręcznie napisanej podstawowej konfiguracji dwóch najbogatszych integracji, zobacz
dogłębne analizy per-narzędzie:

- [Konfiguracja Claude Code](./CLAUDE-CODE-CONFIGURATION.md)
- [Konfiguracja CLI Codex](./CODEX-CLI-CONFIGURATION.md)
- [Tryb zdalny](./REMOTE-MODE.md) — prowadź zdalne Orbit (VPS / Tailnet) z laptopa
- [Czat Copilot w VS Code](./VSCODE-COPILOT.md) — rozszerzenie OmniCopilot; może również uruchamiać te
  polecenia `setup-*` za Ciebie z wnętrza edytora

---

## Tabela główna

Każde polecenie honoruje **aktywny kontekst** (ustawiony za pomocą `orbit connect`, zobacz
[Tryb zdalny](./REMOTE-MODE.md)) lub explicite flagi `--remote <url> --api-key <key>`.
"Lokalne vs zdalne" poniżej oznacza: bez flag celuje w `http://localhost:20128`;
z `--remote` (lub aktywnym zdalnym kontekstem) pobiera katalog z tego
serwera i zapisuje konfigurację lokalnie.

| Polecenie                  | Narzędzie                                   | Co zapisuje                                                                                                                                                                   | Kluczowe flagi                                                                                                                             | Lokalne vs zdalne |
| -------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ----------------- |
| `orbit setup-codex`    | OpenAI Codex CLI                            | `~/.codex/<name>.config.toml` — jeden profil na każdy kompatybilny model tekstowy (`codex --profile <name>`)                                                                  | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | Oba               |
| `orbit setup-claude`   | Claude Code                                 | `~/.claude/profiles/<name>/settings.json` — jeden profil na każdy dopasowany model (`CLAUDE_CONFIG_DIR`)                                                                      | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | Oba               |
| `orbit setup-opencode` | OpenCode (kompatybilny z openai)            | `~/.config/opencode/opencode.json` — dostawca `orbit` z każdym modelem katalogu (`opencode -m orbit/<model>`)                                                         | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | Oba               |
| `orbit setup-cline`    | Cline                                       | `~/.cline/data/{globalState,secrets}.json` (tryb CLI) + drukuje ustawienia rozszerzenia VS Code                                                                               | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | Oba               |
| `orbit setup-kilo`     | Kilo Code                                   | `~/.local/share/kilo/auth.json` (CLI) + łączy `kilocode.*` z `settings.json` VS Code, jeśli jest obecny                                                                       | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | Oba               |
| `orbit setup-continue` | Continue / `cn` CLI                         | `~/.continue/config.yaml` — modele `provider: openai`, klucz przez `${{ secrets.ORBIT_API_KEY }}`                                                                         | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Oba               |
| `orbit setup-cursor`   | Cursor                                      | Nic — drukuje kroki w aplikacji (konfiguracja Cursor jest nieprzezroczysta SQLite)                                                                                            | `--remote` `--api-key` `--only` `--port`                                                                                                   | Oba               |
| `orbit setup-roo`      | Roo Code                                    | `~/.orbit/roo-settings.json` (import doc) + ustawia `roo-cline.autoImportSettingsPath`, jeśli istnieje `settings.json` w VS Code                                          | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | Oba               |
| `orbit setup-crush`    | Crush                                       | `~/.config/crush/crush.json` — dostawca `openai-compat`, klucz przez `$ORBIT_API_KEY`                                                                                     | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Oba               |
| `orbit setup-goose`    | Goose                                       | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + drukuje przepis środowiskowy                                                                   | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Oba               |
| `orbit setup-aider`    | Aider                                       | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + drukuje przepis środowiskowy                                                                                 | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Oba               |
| `orbit setup-qwen`     | Qwen Code                                   | `~/.qwen/settings.json` — tablica `V4 modelProviders.openai` + `ORBIT_API_KEY` w `~/.qwen/.env`                                                                           | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | Oba               |
| `orbit run <target>`   | Uruchomienie w czasie rzeczywistym (ogólne) | Nic — uruchamia `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` z odpowiednim środowiskiem i argumentami; Qwen i Gemini używają tymczasowego izolowanego katalogu | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | Oba               |
| `orbit launch`         | Claude Code                                 | Nic — uruchamia `claude` z wstrzykniętymi `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN`                                                                                         | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | Oba               |
| `orbit launch-codex`   | OpenAI Codex CLI                            | Nic — uruchamia `codex` z wstrzykniętym dostawcą `orbit` przez flagi `-c`                                                                                                 | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | Oba               |

Uwagi dotyczące flag (zweryfikowane w źródle polecenia):

- `--remote <url>` — pobiera katalog z zdalnego Orbit (nadpisuje `--port`
  i aktywny kontekst). `--api-key <key>` dostarcza poświadczenie dla tego
  serwera (domyślnie do zmiennej środowiskowej `ORBIT_API_KEY`, lub tokenu aktywnego kontekstu).
- `--only <patterns>` — ciągi oddzielone przecinkami; zachowuje tylko identyfikatory modeli, które pasują
  (np. `--only glm,kimi`). Dostępne w `setup-codex`, `setup-claude`,
  `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`.
- `--dry-run` — drukuje dokładnie to, co byłoby zapisane, bez dotykania
  systemu plików. Dostępne w każdym poleceniu `setup-*` **oprócz** `setup-cursor`
  (które nigdy nie zapisuje pliku).
- `--model <id>` — wymagane (lub wybierane interaktywnie) dla narzędzi, które nie mają
  automatycznego odkrywania modeli: Cline, Kilo, Roo, Goose, Qwen, Aider. Te narzędzia
  akceptują również `--yes` dla uruchomień bez interakcji (co wtedy wymaga `--model`).
  `setup-opencode` przyjmuje `--model`, aby ustawić domyślny model na najwyższym poziomie.
- `--model <id>` w `orbit run` podąża za okablowaniem per-target manifestu
  (`bin/cli/cli-manifest.mjs`): **aider** otrzymuje `--model openai/<id>` i
  **opencode** `--model orbit/<id>` (prefiks jest dodawany tylko wtedy, gdy id
  go nie zawiera); **qwen** i **gemini** otrzymują id dosłownie;
  **claude** otrzymuje go przez `ANTHROPIC_MODEL`, **goose** przez `GOOSE_MODEL`, a
  **codex** przez argumenty `-c model_providers.orbit.*`. **Qwen jest jedynym celem uruchomienia, który wymaga `--model`** — `orbit run qwen` bez niego kończy się
  `2` z wyraźnym błędem.
- `--port <port>` — lokalny port Orbit (domyślnie `20128`, ignorowany, gdy ustawione `--remote`).
  Obecne we wszystkich `setup-*` i obu launcherach.
- Kody wyjścia `orbit run`: kod wyjścia własnego CLI potomnego jest propagowany
  dosłownie; `2` = nieprawidłowe argumenty (nieobsługiwany cel, brak wymaganych
  `--model`, ochrona kontenera); `127` = docelowy binarny plik nie znajduje się w `PATH`;
  `130`/`143`/`129` gdy uruchomienie kończy się przez `SIGINT`/`SIGTERM`/`SIGHUP`;
  `1` = inny błąd uruchomienia.
- Dwa launchery (`launch`, `launch-codex`) akceptują `--profile <name>` do wyboru
  profilu zapisanego przez `setup-claude` / `setup-codex`, plus argumenty przekazywane do
  podstawowego binarnego pliku `claude` / `codex`.

Interaktywny wybieracz jest również współdzielony przez przepisy konfiguracyjne:

```bash
# Wybierz z aktywnego lokalnego lub zdalnego katalogu modeli i skonfiguruj cel.
orbit configure claude
orbit configure opencode --provider glm
orbit configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` obecnie deleguje do przetestowanych przepisów dla `codex`, `claude`,
`opencode`, `qwen`, `aider`, `goose`, `cline`, `continue` i `kilo`. Wpisy katalogu tylko dla IDE,
MITM i tylko przewodniki pozostają explicite `setup-*`/ręcznymi przepływami i
nie są prezentowane jako cele do uruchomienia.

> `setup-opencode` to **lekkie, kompatybilne z openai** zintegrowanie OpenCode.
> Istnieje również bogatsza integracja wtyczki — `orbit setup opencode` — która
> instaluje `@orbit/opencode-plugin`. To różne polecenia; powyższa tabela
> dokumentuje `setup-opencode`.

---

## Użycie lokalne

Z Orbit działającym na `localhost:20128`, wystarczy uruchomić polecenie konfiguracji dla swojego narzędzia. Katalog jest pobierany z lokalnego serwera.

```bash
# Codex: zapisz profil dla dopasowanego modelu w ~/.codex/
orbit setup-codex
codex --profile glm52            # użyj wygenerowanego profilu

# Claude Code: zapisz profile dla każdego modelu, a następnie uruchom jeden
orbit setup-claude
orbit launch --profile glm52

# OpenCode: zapisz dostawcę zgodnego z openai ze wszystkimi modelami katalogu
orbit setup-opencode
export ORBIT_API_KEY=sk-...  # odniesienie przez {env:ORBIT_API_KEY}, nigdy na dysku
opencode -m orbit/glm/glm-5.2 "..."

# Narzędzia bez automatycznego wykrywania potrzebują wyraźnego modelu:
orbit setup-aider --model glm/glm-5.2
orbit setup-qwen --model qwen/qwen3.8-max-preview

# Podgląd bez zapisywania czegokolwiek:
orbit setup-continue --dry-run
```

Uruchom bez zapisywania jakiejkolwiek konfiguracji (tylko wstrzykiwanie zmiennych środowiskowych):

```bash
orbit launch                 # Claude Code → lokalny Orbit
orbit launch-codex           # Codex CLI → lokalny Orbit
orbit launch-codex --profile glm52
orbit run claude --model openai/gpt-5.4
orbit run codex --model openai/gpt-5.4 --dry-run --json
orbit run aider --model glm/glm-5.2 -- --message "reply OK"
orbit run goose --model glm/glm-5.2
orbit run opencode --model glm/glm-5.2 -- run "reply OK"
orbit run qwen --model glm/glm-5.2 -- -p "reply OK"
orbit run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# Wyraźna ścieżka polecenia: przekaż wszystko, co przychodzi po --
orbit run claude -- --print-system-prompt "review this diff"
```

---

## Użycie zdalne

Wskaź dowolne polecenie konfiguracji na zdalny Orbit z `--remote` + `--api-key`. Katalog jest pobierany zdalnie; konfiguracja jest zapisywana na twoim lokalnym komputerze.

```bash
# OpenCode przeciwko zdalnemu VPS, zachowaj tylko modele glm/kimi
orbit setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m orbit/glm/glm-5.2 "..."   # najpierw wyeksportuj ORBIT_API_KEY

# Profile Codex z zdalnego katalogu
orbit setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# Uruchom CLI bezpośrednio przeciwko zdalnemu
orbit launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
orbit launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

Zamiast przekazywać `--remote`/`--api-key` za każdym razem, zaloguj się raz i pozwól, aby **aktywny kontekst** dostarczył je automatycznie:

```bash
orbit connect 192.168.0.15        # generuje token o ograniczonym zakresie, przechowuje kontekst
orbit setup-codex                 # ← teraz używa zdalnego katalogu
orbit setup-opencode              # ← to samo
orbit launch                      # ← Claude Code przeciwko zdalnemu
```

Zobacz [Tryb zdalny](./REMOTE-MODE.md) dla kontekstów, zakresów i zarządzania tokenami.

---

## Konwencje dotyczące podstawowego URL (które narzędzia chcą `/v1`)

Orbit udostępnia interfejs OpenAI pod `/v1`, interfejs Anthropic w katalogu głównym, a natywny interfejs Gemini pod `/v1beta`. Każda integracja jest podłączona do formy, której oczekuje jej narzędzie (zweryfikowane w źródle polecenia):

| Integracja                                                                 | Podstawowy URL zapisany | `/v1`?                                      |
| -------------------------------------------------------------------------- | ----------------------- | ------------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | katalog główny          | Nie — Cline dodaje `/v1/chat/completions`   |
| `setup-goose` (`OPENAI_HOST`)                                              | katalog główny          | Nie — Goose dodaje ścieżkę                  |
| `setup-aider` (`OPENAI_API_BASE`)                                          | katalog główny          | Nie — LiteLLM dodaje `/v1/chat/completions` |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | z `/v1`                 | Tak                                         |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | katalog główny          | Nie — Claude Code dodaje `/v1/messages`     |
| `setup-codex`, `launch-codex` (`model_providers.orbit.base_url`)       | z `/v1`                 | Tak                                         |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | z `/v1`                 | Tak                                         |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | katalog główny          | Nie — SDK dodaje `/v1beta/models/…`         |

---

## Utrzymywanie natywnych zależności podczas aktualizacji: `--include=optional`

Kiedy aktualizujesz za pomocą `orbit update` (po potwierdzeniu lub z `--apply`),
Orbit uruchamia instalację z `--include=optional` wbudowanym:

```bash
npm install -g orbit@latest --include=optional
```

To **nie** jest flaga, którą przekazujesz do `orbit update` — jest zawsze stosowana przez
aktualizator. Gwarantuje, że `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, stos LLMLingua SLM) przetrwają aktualizację, nawet jeśli Twoja konfiguracja npm
ma ustawione `omit=optional`, co w przeciwnym razie cicho usunęłoby natywny
sterownik SQLite i powiązanie z OS-keyring. Aby zobaczyć dokładne polecenie bez zastosowania:

```bash
orbit update --dry-run
# [DRY RUN] Wykonałoby: npm install -g orbit@latest --include=optional
```

Inne flagi `orbit update` (zweryfikowane w źródle): `--check` (wyjdź 1, jeśli
nieaktualne), `--apply` (zainstaluj bez pytania), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI za pomocą `orbit run gemini`

Kontrakt zweryfikowany w stosunku do `@google/gemini-cli` 0.50.0: CLI respektuje
`GOOGLE_GEMINI_BASE_URL` i wydaje `POST /v1beta/models/<model>:generateContent`
(i `:streamGenerateContent?alt=sse`) przeciwko temu — dokładnie jak natywna
powierzchnia Gemini Orbit (`/v1beta`). `orbit run gemini` automatycznie to
podłącza:

- `GOOGLE_GEMINI_BASE_URL` → aktywne URL bazowe Orbit (root, bez `/v1`);
- `GEMINI_API_KEY` → rozwiązany kredencja Orbit (opcjonalne/środowisko/kontekst);
- **tymczasowy izolowany `GEMINI_CLI_HOME`**, którego `.gemini/settings.json`
  wybiera autoryzację `gemini-api-key`, więc przechowywana sesja Google OAuth (Code Assist)
  nigdy nie nadpisuje uruchomienia kierowanego przez Orbit — usunięte po wyjściu;
- **higiena środowiska**: środowisko potomne jest oczyszczane z `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` i `GOOGLE_GENAI_USE_GCA` (które przekierowywałyby
  autoryzację do Vertex/Code Assist), a `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key` jest
  ustawione jako dodatkowe zabezpieczenie — inne cele `run` otrzymują to samo
  traktowanie dla swoich własnych konfliktujących zmiennych;
- wstrzyknięcie `--model <id>` z `--provider`/`--model`.

```bash
orbit run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

Ochrona przed zaufaniem w przestrzeni roboczej Gemini nadal obowiązuje w trybie headless — przekaż
`--skip-trust` (lub zaufaj katalogowi interaktywnie) sam; launcher
celowo tego nie omija. Ten launcher jest odrębny od **rejestracji ACP**
(`src/lib/acp/registry.ts`, `gemini --acp`), która pozostaje integracją protokołu agenta dla
`/dashboard/acp-agents`.

---

## Prawdziwe testy dymne (opcja)

Deterministyczne uruchomienia planu regresji w CI (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). Aby zweryfikować PRAWIDŁOWE binaria przeciwko PRAWIDŁOWEMU
serwerowi Orbit, istnieje opcjonalny zestaw testów w
`tests/integration/upstream-cli-smoke.int.test.ts`. Nigdy nie uruchamia się automatycznie
(każdy podtest pomija, chyba że `RUN_CLI_SMOKE=1`), przekazuje kredencję przez zmienną środowiskową
NAME (nigdy przez wartość), redaguje ciągi w kształcie klucza z jakiegokolwiek zarejestrowanego
wyjścia, pomija cele, których binaria nie są zainstalowane, i klasyfikuje błędy jako
autoryzacja / upstream / konfiguracja zamiast prostego boolean:

```bash
RUN_CLI_SMOKE=1 \
ORBIT_SMOKE_BASE_URL="http://localhost:20128" \
ORBIT_SMOKE_MODEL="<provider/model>" \
ORBIT_SMOKE_API_KEY_ENV="ORBIT_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

Opcjonalnie: `ORBIT_SMOKE_TARGETS="codex,opencode,qwen"` ogranicza zakres;
`ORBIT_SMOKE_TIMEOUT_MS` nadpisuje limit czasu 120s na cel.

## Zobacz także

- [Konfiguracja Claude Code](./CLAUDE-CODE-CONFIGURATION.md) — głębszy przewodnik po Claude Code
- [Konfiguracja Codex CLI](./CODEX-CLI-CONFIGURATION.md) — jednorazowa konfiguracja podstawowa `[model_providers.orbit]`
- [Tryb zdalny](./REMOTE-MODE.md) — konteksty, tokeny dostępu o ograniczonym zakresie, sterowanie zdalnym serwerem
- [Referencje narzędzi CLI](../reference/CLI-TOOLS.md) — pełny katalog obsługiwanych narzędzi + strony pulpitu
- [Przewodnik instalacji](./SETUP_GUIDE.md) — metody instalacji i wprowadzenie przy pierwszym uruchomieniu
