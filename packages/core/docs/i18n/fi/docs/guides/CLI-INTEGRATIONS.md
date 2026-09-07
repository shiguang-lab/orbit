# CLI-INTEGRATIONS (Suomi)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "CLI Integraatiot — osoita mikä tahansa koodaus CLI Orbiten"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI Integraatiot

Orbit toimittaa joukon `setup-*` komentoja, jotka konfiguroivat koodaus
CLI:n (Codex, Claude Code, OpenCode, Cline, …) käyttämään Orbita taustajärjestelmänään — joten
työkalu kommunikoi **yksi** päätepiste ja Orbit ohjaa oikealle palveluntarjoajalle automaattisella varajärjestelmällä. Jokainen komento lukee **live** malliluettelon toimivasta
Orbit:sta (paikallinen tai etä) ja kirjoittaa työkalun oman konfiguraatiotiedoston **sinun**
koneellesi. API-avain viitataan ympäristömuuttujaan, missä tahansa työkalussa
se tukee sitä. Komennot, jotka säilyttävät työkalukohtaisen ympäristötiedoston, on merkitty alla.

On myös yleinen käynnistin — `orbit run <target>` — joka käynnistää
`claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` tai `gemini` oikealla ympäristöllä ilman, että kirjoitetaan mitään konfiguraatiota. Kohteet ja niiden
aliasit tulevat kanonisesta manifestista `bin/cli/cli-manifest.mjs`
(`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`,
`open-code`, `qwen-code`, `gemini-cli`), ja `orbit completion` tarjoaa
saman manifestista johdetun kohdesanaston. Perinteiset työkalukohtaiset käynnistimet —
`orbit launch` (Claude Code) ja `orbit launch-codex` (Codex) — ovat edelleen
käytettävissä.

Palveluntarjoajan rekrytointi on saatavilla samasta paikallisesta/etäyhteydestä.
Alla olevat API-ensimmäiset komennot pitävät hallintotodistuksen erillään palveluntarjoajan
tunnistetiedoista eivätkä koskaan tulosta tunnistetietoa jäsennellyssä tulosteessa:

```bash
orbit providers add glm --credential-env GLM_API_KEY --name work
orbit providers import ./providers.json --dry-run --json
orbit providers auth openai
orbit providers edit <connection-id> --default-model glm/glm-5.2
orbit providers remove <connection-id> --yes
```

Skripteissä suositaan `--credential-stdin` tai `--credential-env`; `--credential`
säilytetään hallittua paikallista käyttöä varten. `providers remove` vaatii `--yes` ei-interaktiivisella terminaalilla, ja kaikki viisi komentoa kunnioittavat aktiivista kontekstia tai
globaaleja `--base-url`/`--api-key` vaihtoehtoja.

Kaksi rikkainta integraatiota varten kertakirjoitettu perusasetuksen osalta, katso
työkalukohtaiset syväsukellukset:

- [Claude Code konfigurointi](./CLAUDE-CODE-CONFIGURATION.md)
- [Codex CLI konfigurointi](./CODEX-CLI-CONFIGURATION.md)
- [Etätila](./REMOTE-MODE.md) — ohjaa etä Orbita (VPS / Tailnet) kannettavalta tietokoneeltasi
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — OmniCopilot-laajennus; se voi myös suorittaa nämä
  `setup-*` komennot puolestasi editorin sisällä

---

## Päätaulukko

Jokainen komento kunnioittaa **aktiivista kontekstia** (asetettu `orbit connect`, katso
[Etätila](./REMOTE-MODE.md)) tai eksplisiittisiä `--remote <url> --api-key <key>` lippuja.
"Paikallinen vs etä" alla tarkoittaa: ilman lippuja se kohdistaa `http://localhost:20128`;
`--remote` (tai aktiivinen etäyhteys) hakee luettelon kyseiseltä palvelimelta ja kirjoittaa konfiguraation paikallisesti.

| Komento                    | Työkalu                        | Mitä se kirjoittaa                                                                                                                                                                | Avainliput                                                                                                                                 | Paikallinen vs etä |
| -------------------------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------ |
| `orbit setup-codex`    | OpenAI Codex CLI               | `~/.codex/<name>.config.toml` — yksi profiili per yhteensopiva tekstimalli (`codex --profile <name>`)                                                                             | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | Molemmat           |
| `orbit setup-claude`   | Claude Code                    | `~/.claude/profiles/<name>/settings.json` — yksi profiili per vastaava malli (`CLAUDE_CONFIG_DIR`)                                                                                | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | Molemmat           |
| `orbit setup-opencode` | OpenCode (openai-yhteensopiva) | `~/.config/opencode/opencode.json` — `orbit` palveluntarjoaja jokaiselle luettelomallille (`opencode -m orbit/<model>`)                                                   | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | Molemmat           |
| `orbit setup-cline`    | Cline                          | `~/.cline/data/{globalState,secrets}.json` (CLI-tila) + tulostaa VS Code laajennuksen asetukset                                                                                   | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | Molemmat           |
| `orbit setup-kilo`     | Kilo Code                      | `~/.local/share/kilo/auth.json` (CLI) + yhdistää `kilocode.*` VS Code `settings.json` tiedostoon, jos se on olemassa                                                              | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | Molemmat           |
| `orbit setup-continue` | Continue / `cn` CLI            | `~/.continue/config.yaml` — `provider: openai` mallit, avain kautta `${{ secrets.ORBIT_API_KEY }}`                                                                            | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Molemmat           |
| `orbit setup-cursor`   | Cursor                         | Ei mitään — tulostaa sovelluksen vaiheet (Cursorin konfiguraatio on läpinäkyvä SQLite)                                                                                            | `--remote` `--api-key` `--only` `--port`                                                                                                   | Molemmat           |
| `orbit setup-roo`      | Roo Code                       | `~/.orbit/roo-settings.json` (tuontidokumentti) + asettaa `roo-cline.autoImportSettingsPath`, jos VS Code `settings.json` tiedosto on olemassa                                | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | Molemmat           |
| `orbit setup-crush`    | Crush                          | `~/.config/crush/crush.json` — `openai-yhteensopiva` palveluntarjoaja, avain kautta `$ORBIT_API_KEY`                                                                          | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Molemmat           |
| `orbit setup-goose`    | Goose                          | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + tulostaa ympäristöreseptin                                                                         | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Molemmat           |
| `orbit setup-aider`    | Aider                          | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + tulostaa ympäristöreseptin                                                                                       | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Molemmat           |
| `orbit setup-qwen`     | Qwen Code                      | `~/.qwen/settings.json` — V4 `modelProviders.openai` taulukko + `ORBIT_API_KEY` tiedostossa `~/.qwen/.env`                                                                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | Molemmat           |
| `orbit run <target>`   | Ajanotto (yleinen)             | Ei mitään — käynnistää `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` oikealla ympäristöllä ja argumenteilla; Qwen ja Gemini käyttävät väliaikaista eristettyä kotia | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | Molemmat           |
| `orbit launch`         | Claude Code                    | Ei mitään — käynnistää `claude` `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` injektoituna                                                                                          | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | Molemmat           |
| `orbit launch-codex`   | OpenAI Codex CLI               | Ei mitään — käynnistää `codex` `orbit` palveluntarjoaja injektoituna `-c` lippujen kautta                                                                                     | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | Molemmat           |

Huomautuksia lipuista (vahvistettu komennon lähteessä):

- `--remote <url>` — hakee luettelon etä Orbit:sta (ylittää `--port`
  ja aktiivisen kontekstin). `--api-key <key>` toimittaa tunnistetiedon kyseiselle
  palvelimelle (oletuksena `ORBIT_API_KEY` ympäristömuuttuja tai aktiivisen kontekstin token).
- `--only <patterns>` — pilkuilla erotellut alimerkit; säilyttää vain malli-ID:t, jotka vastaavat
  (esim. `--only glm,kimi`). Saatavilla `setup-codex`, `setup-claude`,
  `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`.
- `--dry-run` — tulostaa tarkalleen mitä kirjoitettaisiin ilman, että kosketaan
  tiedostojärjestelmään. Saatavilla jokaisessa `setup-*` komennossa **paitsi** `setup-cursor`
  (joka ei koskaan kirjoita tiedostoa).
- `--model <id>` — vaaditaan (tai valitaan interaktiivisesti) työkaluissa, joilla ei ole
  mallin automaattista löytämistä: Cline, Kilo, Roo, Goose, Qwen, Aider. Nämä työkalut
  hyväksyvät myös `--yes` ei-interaktiivisiin suorituksiin (jotka sitten vaativat `--model`).
  `setup-opencode` ottaa `--model` asettaakseen oletustason mallin.
- `--model <id>` komennossa `orbit run` seuraa manifestin per-kohde kytkentää
  (`bin/cli/cli-manifest.mjs`): **aider** saa `--model openai/<id>` ja
  **opencode** `--model orbit/<id>` (etuliite lisätään vain, kun id
  ei jo sisällä sitä); **qwen** ja **gemini** saavat id:n sellaisenaan;
  **claude** saa sen `ANTHROPIC_MODEL` kautta, **goose** `GOOSE_MODEL` kautta, ja
  **codex** `-c model_providers.orbit.*` argumenttien kautta. **Qwen on ainoa suorituskohde, joka vaatii ehdottomasti `--model`** — `orbit run qwen` ilman sitä poistuu
  `2` virheellä.
- `--port <port>` — paikallinen Orbit portti (oletus `20128`, ohitetaan kun `--remote`
  on asetettu). Läsnä kaikissa `setup-*` ja molemmissa käynnistimissä.
- `orbit run` poistumiskoodit: lapsi CLI:n oma poistumiskoodi siirretään
  sellaisenaan; `2` = virheelliset argumentit (tuettu kohde puuttuu, vaadittu
  `--model` puuttuu, säilön suoja); `127` = kohdebinaaria ei ole `PATH`:issa;
  `130`/`143`/`129` kun käynnistys päättyy `SIGINT`/`SIGTERM`/`SIGHUP`;
  `1` = muu ajonaikainen käynnistysvirhe.
- Kaksi käynnistintä (`launch`, `launch-codex`) hyväksyvät `--profile <name>` valitsemaan
  profiilin, joka on kirjoitettu `setup-claude` / `setup-codex`, sekä läpivientiarvot
  taustalla olevalle `claude` / `codex` binäärille.

Interaktiivinen valitsin on myös jaettu asetusreseptien kanssa:

```bash
# Valitse aktiivisesta paikallisesta tai etä malliluettelosta ja konfiguroi kohde.
orbit configure claude
orbit configure opencode --provider glm
orbit configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` tällä hetkellä delegoi testattuihin resepteihin `codex`, `claude`,
`opencode`, `qwen`, `aider`, `goose`, `cline`, `continue`, ja `kilo`. IDE:lle vain,
MITM, ja opas vain luettelon merkinnät pysyvät eksplisiittisinä `setup-*`/manuaalisina prosesseina
eivätkä esitetä käynnistettävinä kohteina.

> `setup-opencode` on **kevyt openai-yhteensopiva** OpenCode integraatio.
> On myös rikkaampi liitännäintegraatio — `orbit setup opencode` — joka
> asentaa `@orbit/opencode-plugin`. Ne ovat eri komentoja; taulukko
> yllä dokumentoi `setup-opencode`.

---

## Paikallinen käyttö

Kun Orbit toimii `localhost:20128`, suorita vain asetuskäsky työkalullesi. Luettelo haetaan paikalliselta palvelimelta.

```bash
# Codex: kirjoita profiili jokaiselle vastaavalle mallille ~/.codex/
orbit setup-codex
codex --profile glm52            # käytä luotua profiilia

# Claude Code: kirjoita mallikohtaiset profiilit, sitten käynnistä yksi
orbit setup-claude
orbit launch --profile glm52

# OpenCode: kirjoita openai-yhteensopiva tarjoaja kaikilla luettelomalleilla
orbit setup-opencode
export ORBIT_API_KEY=sk-...  # viitattu {env:ORBIT_API_KEY} kautta, ei koskaan levyllä
opencode -m orbit/glm/glm-5.2 "..."

# Työkalut, joissa ei ole automaattista löytämistä, tarvitsevat erillisen mallin:
orbit setup-aider --model glm/glm-5.2
orbit setup-qwen --model qwen/qwen3.8-max-preview

# Esikatselu ilman mitään kirjoittamista:
orbit setup-continue --dry-run
```

Käynnistä ilman mitään konfiguraation kirjoittamista (vain ympäristöinjektio):

```bash
orbit launch                 # Claude Code → paikallinen Orbit
orbit launch-codex           # Codex CLI → paikallinen Orbit
orbit launch-codex --profile glm52
orbit run claude --model openai/gpt-5.4
orbit run codex --model openai/gpt-5.4 --dry-run --json
orbit run aider --model glm/glm-5.2 -- --message "reply OK"
orbit run goose --model glm/glm-5.2
orbit run opencode --model glm/glm-5.2 -- run "reply OK"
orbit run qwen --model glm/glm-5.2 -- -p "reply OK"
orbit run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# Erityinen komento polku: siirrä kaikki, mikä tulee jälkeen --
orbit run claude -- --print-system-prompt "review this diff"
```

---

## Etäkäyttö

Suunnittele mikä tahansa asetuskäsky etäiseen Orbiten `--remote` + `--api-key`. Luettelo haetaan etäyhteydestä; konfiguraatio kirjoitetaan paikalliselle koneellesi.

```bash
# OpenCode etä-VPS:lle, pidä vain glm/kimi mallit
orbit setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m orbit/glm/glm-5.2 "..."   # vie ORBIT_API_KEY ensin

# Codex-profiilit etäluettelosta
orbit setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# Käynnistä CLI suoraan etäyhteyteen
orbit launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
orbit launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

Sen sijaan, että siirtäisit `--remote`/`--api-key` joka kerta, kirjaudu sisään kerran ja anna **aktiivisen kontekstin** toimittaa ne automaattisesti:

```bash
orbit connect 192.168.0.15        # luo rajatun tokenin, tallentaa kontekstin
orbit setup-codex                 # ← nyt käyttää etäluetteloa
orbit setup-opencode              # ← sama
orbit launch                      # ← Claude Code etäyhteyteen
```

Katso [Etätila](./REMOTE-MODE.md) konteksteista, alueista ja tokenin hallinnasta.

---

## Perus-URL-säännöt (mitkä työkalut haluavat `/v1`)

Orbit altistaa OpenAI-pinnan `/v1`-osoitteessa, Anthropic-pinnan juuriosoitteessa ja natiivin Gemini-pinnan `/v1beta`-osoitteessa. Jokainen integraatio on kytketty muotoon, jota työkalu odottaa (vahvistettu komennon lähteessä):

| Integraatio                                                                | Perus-URL kirjoitettu | `/v1`?                                      |
| -------------------------------------------------------------------------- | --------------------- | ------------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | juuriosoitteessa      | Ei — Cline liittää `/v1/chat/completions`   |
| `setup-goose` (`OPENAI_HOST`)                                              | juuriosoitteessa      | Ei — Goose liittää polun                    |
| `setup-aider` (`OPENAI_API_BASE`)                                          | juuriosoitteessa      | Ei — LiteLLM liittää `/v1/chat/completions` |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | `/v1`-osoitteella     | Kyllä                                       |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | juuriosoitteessa      | Ei — Claude Code liittää `/v1/messages`     |
| `setup-codex`, `launch-codex` (`model_providers.orbit.base_url`)       | `/v1`-osoitteella     | Kyllä                                       |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | `/v1`-osoitteella     | Kyllä                                       |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | juuriosoitteessa      | Ei — SDK liittää `/v1beta/models/…`         |

---

## Säilytä natiiviriippuvuudet päivityksessä: `--include=optional`

Kun päivität komennolla `orbit update` (vahvistamisen jälkeen tai `--apply`-lipulla),
Orbit suorittaa asennuksen `--include=optional` mukana:

```bash
npm install -g orbit@latest --include=optional
```

Tämä **ei** ole lippu, jonka annat `orbit update` -komennolle — se on aina
sovellettuna päivityksessä. Se takaa, että `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, LLMLingua SLM -pino) säilyvät päivityksen aikana, vaikka npm-konfiguraatiossasi
olisi asetettu `omit=optional`, mikä muuten hiljaisesti poistaisi natiivin SQLite
ohjaimen ja OS-avainrenkaan sidoksen. Jos haluat ennakoida tarkan komennon ilman
soveltamista:

```bash
orbit update --dry-run
# [DRY RUN] Suorittaisi: npm install -g orbit@latest --include=optional
```

Muut `orbit update` -liput (vahvistettu lähdekoodissa): `--check` (poistu 1, jos
vanhentunut), `--apply` (asentaa ilman kehotusta), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI komennolla `orbit run gemini`

Sopimus vahvistettu `@google/gemini-cli` 0.50.0: CLI kunnioittaa
`GOOGLE_GEMINI_BASE_URL` ja lähettää `POST /v1beta/models/<model>:generateContent`
(ja `:streamGenerateContent?alt=sse`) sitä vastaan — tarkalleen Orbit:n natiivin
Gemini-pinnan (`/v1beta`). `orbit run gemini` yhdistää tämän automaattisesti:

- `GOOGLE_GEMINI_BASE_URL` → aktiivinen Orbit perus-URL (juuri, ei `/v1`);
- `GEMINI_API_KEY` → ratkaistu Orbit-todistus (vaihtoehto/env/konteksti);
- **väliaikainen eristetty `GEMINI_CLI_HOME`**, jonka `.gemini/settings.json`
  valitsee `gemini-api-key`-todistuksen, joten tallennettu Google OAuth -istunto (Code Assist)
  ei koskaan ohita Orbit-ohjattua käynnistystä — poistetaan uloskirjautumisen jälkeen;
- **ympäristöhygienia**: lapsiympäristö puhdistetaan `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` ja `GOOGLE_GENAI_USE_GCA` (jotka ohjaisivat
  todistusta Vertex/Code Assist:lle), ja `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key` on
  asetettu varmistukseksi — muut `run`-kohteet saavat saman käsittelyn omille
  ristiriitaisille muuttujilleen;
- `--model <id>` injektointi `--provider`/`--model`-lipuista.

```bash
orbit run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

Geminin työtilan luottamussuoja on edelleen voimassa headless-tilassa — käytä
`--skip-trust` (tai luota hakemistoon interaktiivisesti) itse; käynnistin
ei tarkoituksellisesti ohita sitä. Tämä käynnistin on erillinen **ACP
rekisteröinnistä** (`src/lib/acp/registry.ts`, `gemini --acp`), joka pysyy
agenttiprotokollan integraationa `/dashboard/acp-agents`.

---

## Todellinen savupyynti (valinnainen)

Deterministinen käynnistys-suunnitelman regressiotestit CI:ssä (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). Vahvistaaksesi REAALIT binäärit REAALIN
Orbit-palvelimen kanssa, on olemassa valinnainen kehys osoitteessa
`tests/integration/upstream-cli-smoke.int.test.ts`. Se ei koskaan käynnisty automaattisesti
(koska jokainen alakoe ohittaa, ellei `RUN_CLI_SMOKE=1`), välittää todistuksen ympäristömuuttujan
NIMEN kautta (ei koskaan arvon kautta), peittää avainmuotoiset merkkijonot kaikesta tallennetusta
tulosteesta, ohittaa kohteet, joiden binääriä ei ole asennettu, ja luokittelee epäonnistumiset
todistukseksi / upstreamiksi / konfiguraatioksi sen sijaan, että se olisi pelkkä boolean:

```bash
RUN_CLI_SMOKE=1 \
ORBIT_SMOKE_BASE_URL="http://localhost:20128" \
ORBIT_SMOKE_MODEL="<provider/model>" \
ORBIT_SMOKE_API_KEY_ENV="ORBIT_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

Valinnainen: `ORBIT_SMOKE_TARGETS="codex,opencode,qwen"` rajoittaa pyyntiä;
`ORBIT_SMOKE_TIMEOUT_MS` ohittaa 120s kohdekohtaista aikarajaa.

---

## Katso myös

- [Claude Code -konfiguraatio](./CLAUDE-CODE-CONFIGURATION.md) — syvällisempi Claude Code -opas
- [Codex CLI -konfiguraatio](./CODEX-CLI-CONFIGURATION.md) — kertaluonteinen `[model_providers.orbit]` perusasetukset
- [Etätila](./REMOTE-MODE.md) — kontekstit, rajatut pääsytunnukset, etäpalvelimen ohjaaminen
- [CLI Työkalujen viite](../reference/CLI-TOOLS.md) — täydellinen luettelo tuetuista työkaluista + hallintapaneelin sivut
- [Asennusopas](./SETUP_GUIDE.md) — asennusmenetelmät ja ensimmäisen käytön perehdytys
