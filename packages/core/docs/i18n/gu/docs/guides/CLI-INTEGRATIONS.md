# CLI-INTEGRATIONS (ગુજરાતી)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "CLI ઇન્ટિગ્રેશન્સ — કોઈપણ કોડિંગ CLI ને ShiguangGateway પર પોઈન્ટ કરો"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI ઇન્ટિગ્રેશન્સ

ShiguangGateway `setup-*` આદેશોની એક કુટુંબ સાથે આવે છે જે કોડિંગ
CLI (Codex, Claude Code, OpenCode, Cline, …) ને ShiguangGateway ને તેના બેકએન્ડ તરીકે ઉપયોગ કરવા માટે કન્ફિગર કરે છે — જેથી
આ સાધન **એક** એન્ડપોઈન્ટ સાથે વાત કરે છે અને ShiguangGateway યોગ્ય પ્રદાતા તરફ માર્ગદર્શન આપે છે
ઓટો-ફોલબેક સાથે. દરેક આદેશ એક ચાલતી
ShiguangGateway (સ્થાનિક અથવા દૂરસ્થ)માંથી **લાઇવ** મોડેલ કૅટલોગ વાંચે છે અને **તમારા**
યંત્ર પર સાધનનું પોતાનું કન્ફિગરેશન ફાઇલ લખે છે. API કી એ વાતાવરણના ચલ દ્વારા સંદર્ભિત છે જ્યાં પણ સાધન
તેને સપોર્ટ કરે છે. સાધનો જે સાધન-સ્થાનિક વાતાવરણ ફાઇલને જાળવે છે તે નીચે નોંધાયેલા છે.

એક સામાન્ય લોન્ચર પણ છે — `shiguang-gateway run <target>` — જે `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` અથવા `gemini` ને યોગ્ય એન્વાયર્નમેન્ટ ઇન્જેક્ટ કરીને શરૂ કરે છે, કોઈપણ કન્ફિગરેશન લખ્યા વિના. ટાર્ગેટ અને તેમના
ઉપનામો કૅનોનિકલ મેનિફેસ્ટ `bin/cli/cli-manifest.mjs`માંથી આવે છે
(`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`,
`open-code`, `qwen-code`, `gemini-cli`), અને `shiguang-gateway completion` એ
સમાન મેનિફેસ્ટ-ઉપજિત ટાર્ગેટ શબ્દો આપે છે. વારસાગત પ્રત્યેક સાધન લોન્ચર્સ —
`shiguang-gateway launch` (Claude Code) અને `shiguang-gateway launch-codex` (Codex) — ઉપલબ્ધ રહે છે.

પ્રદાતા ઓનબોર્ડિંગ સમાન સ્થાનિક/દૂરસ્થ સંદર્ભમાંથી ઉપલબ્ધ છે. નીચેના
API-પ્રથમ આદેશો વ્યવસ્થાપન પ્રમાણપત્રોને પ્રદાતા
પ્રમાણપત્રોથી અલગ રાખે છે અને ક્યારેય રચનાત્મક આઉટપુટમાં પ્રમાણપત્ર છાપતા નથી:

```bash
shiguang-gateway providers add glm --credential-env GLM_API_KEY --name work
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth openai
shiguang-gateway providers edit <connection-id> --default-model glm/glm-5.2
shiguang-gateway providers remove <connection-id> --yes
```

સ્ક્રિપ્ટો માટે, `--credential-stdin` અથવા `--credential-env` પસંદ કરો; `--credential`
નિયંત્રિત સ્થાનિક ઉપયોગ માટે જ રાખવામાં આવે છે. `providers remove` ને
નોન-ઇન્ટરેક્ટિવ ટર્મિનલ પર `--yes`ની જરૂર છે, અને તમામ પાંચ આદેશો સક્રિય સંદર્ભ અથવા
ગ્લોબલ `--base-url`/`--api-key` વિકલ્પોને માન્ય રાખે છે.

બે સૌથી ધનવાન ઇન્ટિગ્રેશન્સના એકવારના, હેન્ડ-લખેલા આધાર સેટઅપ માટે, જુઓ
પ્રત્યેક સાધનની ઊંડાણમાં:

- [Claude Code કન્ફિગરેશન](./CLAUDE-CODE-CONFIGURATION.md)
- [Codex CLI કન્ફિગરેશન](./CODEX-CLI-CONFIGURATION.md)
- [દૂરસ્થ મોડ](./REMOTE-MODE.md) — તમારા લેપટોપમાંથી દૂરસ્થ ShiguangGateway (VPS / Tailnet) ચલાવો
- [VS Code Copilot ચેટ](./VSCODE-COPILOT.md) — OmniCopilot એક્સટેંશન; તે તમારા માટે આ
  `setup-*` આદેશો સંપાદકની અંદર ચલાવી શકે છે

---

## માસ્ટર ટેબલ

દરેક આદેશ **સક્રિય સંદર્ભ**ને માન્ય રાખે છે (જેને `shiguang-gateway connect` સાથે સેટ કરવામાં આવે છે, જુઓ
[દૂરસ્થ મોડ](./REMOTE-MODE.md)) અથવા સ્પષ્ટ `--remote <url> --api-key <key>` ફ્લેગ્સ.
"સ્થાનિક વિરુદ્ધ દૂરસ્થ" નીચેનો અર્થ છે: કોઈ ફ્લેગ્સ વિના તે `http://localhost:20128`ને લક્ષ્ય બનાવે છે;
`--remote` (અથવા સક્રિય દૂરસ્થ સંદર્ભ) સાથે તે કૅટલોગને તે સર્વર પરથી મેળવે છે અને કન્ફિગરેશનને સ્થાનિક રીતે લખે છે.

| આદેશ                       | સાધન                         | તે શું લખે છે                                                                                                                                                                           | મુખ્ય ફ્લેગ્સ                                                                                                                              | સ્થાનિક વિરુદ્ધ દૂરસ્થ |
| -------------------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------- |
| `shiguang-gateway setup-codex`    | OpenAI Codex CLI             | `~/.codex/<name>.config.toml` — એક સુસંગત ટેક્સ્ટ મોડેલ માટે એક પ્રોફાઇલ (`codex --profile <name>`)                                                                                     | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | બંને                   |
| `shiguang-gateway setup-claude`   | Claude Code                  | `~/.claude/profiles/<name>/settings.json` — મેળવનાર મોડેલ માટે એક પ્રોફાઇલ (`CLAUDE_CONFIG_DIR`)                                                                                        | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | બંને                   |
| `shiguang-gateway setup-opencode` | OpenCode (openai-compatible) | `~/.config/opencode/opencode.json` — `shiguang-gateway` પ્રદાતા સાથે દરેક કૅટલોગ મોડેલ (`opencode -m shiguang-gateway/<model>`)                                                                       | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | બંને                   |
| `shiguang-gateway setup-cline`    | Cline                        | `~/.cline/data/{globalState,secrets}.json` (CLI મોડ) + VS Code એક્સટેંશન સેટિંગ્સ છાપે                                                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | બંને                   |
| `shiguang-gateway setup-kilo`     | Kilo Code                    | `~/.local/share/kilo/auth.json` (CLI) + જો હાજર હોય તો VS Code `settings.json` માં `kilocode.*` મર્જ કરે                                                                                | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | બંને                   |
| `shiguang-gateway setup-continue` | Continue / `cn` CLI          | `~/.continue/config.yaml` — `provider: openai` મોડેલ, કી `${{ secrets.SHIGUANG_GATEWAY_API_KEY }}` દ્વારા                                                                                      | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | બંને                   |
| `shiguang-gateway setup-cursor`   | Cursor                       | કશું નહીં — એપ્લિકેશનમાં પગલાં છાપે (Cursor કન્ફિગરેશન ઓપેક SQLite છે)                                                                                                                  | `--remote` `--api-key` `--only` `--port`                                                                                                   | બંને                   |
| `shiguang-gateway setup-roo`      | Roo Code                     | `~/.shiguang-gateway/roo-settings.json` (આયાત દસ્તાવેજ) + જો VS Code `settings.json` હાજર હોય તો `roo-cline.autoImportSettingsPath` સેટ કરે                                                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | બંને                   |
| `shiguang-gateway setup-crush`    | Crush                        | `~/.config/crush/crush.json` — `openai-compat` પ્રદાતા, કી `$SHIGUANG_GATEWAY_API_KEY` દ્વારા                                                                                                  | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | બંને                   |
| `shiguang-gateway setup-goose`    | Goose                        | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + એન્વાયર્નમેન્ટ રેસીપી છાપે                                                                               | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | બંને                   |
| `shiguang-gateway setup-aider`    | Aider                        | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + એન્વાયર્નમેન્ટ રેસીપી છાપે                                                                                             | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | બંને                   |
| `shiguang-gateway setup-qwen`     | Qwen Code                    | `~/.qwen/settings.json` — V4 `modelProviders.openai` એરે + `SHIGUANG_GATEWAY_API_KEY` `~/.qwen/.env` માં                                                                                       | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | બંને                   |
| `shiguang-gateway run <target>`   | રનટાઇમ લોન્ચ (સામાન્ય)       | કશું નહીં — `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` ને યોગ્ય એન્વાયર્નમેન્ટ અને આર્ગ્યુમેન્ટ્સ સાથે શરૂ કરે છે; Qwen અને Gemini એક તાત્કાલિક અલગ હોમનો ઉપયોગ કરે છે | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | બંને                   |
| `shiguang-gateway launch`         | Claude Code                  | કશું નહીં — `claude` ને `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` ઇન્જેક્ટ કરીને શરૂ કરે                                                                                              | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | બંને                   |
| `shiguang-gateway launch-codex`   | OpenAI Codex CLI             | કશું નહીં — `codex` ને `shiguang-gateway` પ્રદાતા ઇન્જેક્ટ કરીને શરૂ કરે છે `-c` ફ્લેગ્સ દ્વારા                                                                                                | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | બંને                   |

ફ્લેગ્સ પર નોંધો (આદેશના સ્ત્રોતમાં ચકાસવામાં આવ્યું):

- `--remote <url>` — દૂરસ્થ ShiguangGatewayમાંથી કૅટલોગ મેળવો (જે `--port` ને ઓવરરાઈડ કરે છે
  અને સક્રિય સંદર્ભ). `--api-key <key>` તે સર્વર માટે પ્રમાણપત્ર પૂરૂં પાડે છે (ડિફોલ્ટ `SHIGUANG_GATEWAY_API_KEY` એન્વાયર્નમેન્ટ ચલ અથવા સક્રિય સંદર્ભના ટોકન પર).
- `--only <patterns>` — કોમાના-separated substrings; માત્ર મોડેલ ID જ રાખો જે મેળવે છે
  (ઉદાહરણ તરીકે, `--only glm,kimi`). ઉપલબ્ધ છે `setup-codex`, `setup-claude`,
  `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`.
- `--dry-run` — ફાઇલ સિસ્ટમને સ્પર્શ કર્યા વિના લખાશે તે ચોક્કસપણે છાપે. દરેક `setup-*` આદેશ પર ઉપલબ્ધ છે **છતાં** `setup-cursor`
  (જે ક્યારેય ફાઇલ લખતું નથી).
- `--model <id>` — જરૂરી (અથવા ઇન્ટરેક્ટિવ રીતે પસંદ કરવામાં આવે છે) તે સાધનો માટે જેમણે કોઈ નથી
  મોડેલ ઓટો-ડિસ્કવરી: Cline, Kilo, Roo, Goose, Qwen, Aider. તે સાધનો
  પણ `--yes` માટે નોન-ઇન્ટરેક્ટિવ ચલણો સ્વીકાર કરે છે (જે પછી `--model`ની જરૂર છે).
  `setup-opencode` ડિફોલ્ટ ટોપ-લેવલ મોડેલ સેટ કરવા માટે `--model` લે છે.
- `--model <id>` પર `shiguang-gateway run` મેનિફેસ્ટના પ્રતિ-લક્ષ્ય વાયરિંગને અનુસરે છે
  (`bin/cli/cli-manifest.mjs`): **aider**ને `--model openai/<id>` મળે છે અને
  **opencode**ને `--model shiguang-gateway/<id>` (પ્રિફિક્સ માત્ર ત્યારે જ ઉમેરવામાં આવે છે જ્યારે ID
  પહેલેથી જ તેને ધરાવતું નથી); **qwen** અને **gemini**ને ID વર્બેટિમ મળે છે;
  **claude**ને `ANTHROPIC_MODEL` દ્વારા મળે છે, **goose**ને `GOOSE_MODEL` દ્વારા, અને
  **codex**ને `-c model_providers.shiguang-gateway.*` આર્ગ્યુમેન્ટ્સ દ્વારા. **Qwen એ એકમાત્ર રન છે
  લક્ષ્ય જે કડક રીતે `--model`ની જરૂર છે** — `shiguang-gateway run qwen` વિના તે બહાર જાય છે
  `2` સાથે સ્પષ્ટ ભૂલ.
- `--port <port>` — સ્થાનિક ShiguangGateway પોર્ટ (ડિફોલ્ટ `20128`, જ્યારે `--remote`
  સેટ કરવામાં આવે છે ત્યારે અવગણવામાં આવે છે). તમામ `setup-*` અને બંને લોન્ચર્સ પર હાજર છે.
- `shiguang-gateway run` ની બહાર નીકળવાની કોડ: બાળક CLI ની પોતાની બહાર નીકળવાની કોડ જાળવવામાં આવે છે
  વર્બેટિમ; `2` = અમાન્ય દલીલ (અસમર્થિત લક્ષ્ય, જરૂરી ખોટું `--model`, કન્ટેનર ગાર્ડ); `127` = લક્ષ્ય બાયનરી `PATH`માં નથી;
  `130`/`143`/`129` જ્યારે લોન્ચ `SIGINT`/`SIGTERM`/`SIGHUP` દ્વારા સમાપ્ત થાય છે;
  `1` = અન્ય રનટાઇમ લોન્ચ નિષ્ફળતા.
- બે લોન્ચર્સ (`launch`, `launch-codex`) `--profile <name>`ને સ્વીકારે છે
  `setup-claude` / `setup-codex` દ્વારા લખાયેલ પ્રોફાઇલ પસંદ કરવા માટે, ઉપરાંત
  નીચેના `claude` / `codex` બાયનરી માટે પાસ-થ્રૂ આર્ગ્યુમેન્ટ્સ.

ઇન્ટરેક્ટિવ પિકર પણ સેટઅપ રેસીપી દ્વારા શેર કરવામાં આવે છે:

```bash
# સક્રિય સ્થાનિક અથવા દૂરસ્થ મોડેલ કૅટલોગમાંથી પસંદ કરો અને લક્ષ્યને કન્ફિગર કરો.
shiguang-gateway configure claude
shiguang-gateway configure opencode --provider glm
shiguang-gateway configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` હાલમાં `codex`, `claude`,
`opencode`, `qwen`, `aider`, `goose`, `cline`, `continue`, અને `kilo` માટે પરીક્ષણ કરેલી રેસીપીને સોંપે છે. IDE-માત્ર,
MITM, અને માર્ગદર્શિકા-માત્ર કૅટલોગ એન્ટ્રીઓ સ્પષ્ટ `setup-*`/હાથથી પ્રવાહો તરીકે રહે છે અને
લોંચેબલ ટાર્ગેટ તરીકે રજૂ કરવામાં આવતી નથી.

> `setup-opencode` એ **હલકો openai-compatible** OpenCode ઇન્ટિગ્રેશન છે.
> વધુ ધનવાન પ્લગઇન ઇન્ટિગ્રેશન પણ છે — `shiguang-gateway setup opencode` — જે
> `@orbit/opencode-plugin` ઇન્સ્ટોલ કરે છે. તે અલગ આદેશો છે; ટેબલ
> ઉપર `setup-opencode`ને દસ્તાવેજ કરે છે.

---

## સ્થાનિક ઉપયોગ

`localhost:20128` પર ShiguangGateway ચલાવતા, તમારા સાધન માટે સેટઅપ કમાન્ડ ચલાવો. કેટલોગ સ્થાનિક સર્વર પરથી મેળવવામાં આવે છે.

```bash
# Codex: મેળવનારા મોડલ માટે ~/.codex/ માં એક પ્રોફાઇલ લખો
shiguang-gateway setup-codex
codex --profile glm52            # જનરેટ કરેલી પ્રોફાઇલનો ઉપયોગ કરો

# Claude Code: મોડલ મુજબ પ્રોફાઇલ લખો, પછી એક લોન્ચ કરો
shiguang-gateway setup-claude
shiguang-gateway launch --profile glm52

# OpenCode: તમામ કેટલોગ મોડલ સાથે openai-સંગત પ્રદાતા લખો
shiguang-gateway setup-opencode
export SHIGUANG_GATEWAY_API_KEY=sk-...  # {env:SHIGUANG_GATEWAY_API_KEY} દ્વારા સંદર્ભિત, ક્યારેય ડિસ્ક પર નહીં
opencode -m shiguang-gateway/glm/glm-5.2 "..."

# ઓટો-ડિસ્કવરી વગરના સાધનોને સ્પષ્ટ મોડલની જરૂર છે:
shiguang-gateway setup-aider --model glm/glm-5.2
shiguang-gateway setup-qwen --model qwen/qwen3.8-max-preview

# કંઈપણ લખ્યા વિના પૂર્વદર્શન:
shiguang-gateway setup-continue --dry-run
```

કોઈપણ કન્ફિગ લખ્યા વિના લોન્ચ કરો (ફક્ત env-injection):

```bash
shiguang-gateway launch                 # Claude Code → સ્થાનિક ShiguangGateway
shiguang-gateway launch-codex           # Codex CLI → સ્થાનિક ShiguangGateway
shiguang-gateway launch-codex --profile glm52
shiguang-gateway run claude --model openai/gpt-5.4
shiguang-gateway run codex --model openai/gpt-5.4 --dry-run --json
shiguang-gateway run aider --model glm/glm-5.2 -- --message "reply OK"
shiguang-gateway run goose --model glm/glm-5.2
shiguang-gateway run opencode --model glm/glm-5.2 -- run "reply OK"
shiguang-gateway run qwen --model glm/glm-5.2 -- -p "reply OK"
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# સ્પષ્ટ કમાન્ડ પાથ: -- પછી જે પણ આવે છે તે પસાર કરો
shiguang-gateway run claude -- --print-system-prompt "review this diff"
```

---

## દૂરસ્થ ઉપયોગ

કોઈપણ સેટઅપ કમાન્ડને `--remote` + `--api-key` સાથે દૂરસ્થ ShiguangGateway પર નિશાન બનાવો. કેટલોગ દૂરસ્થમાંથી મેળવવામાં આવે છે; કન્ફિગ તમારા સ્થાનિક મશીન પર લખવામાં આવે છે.

```bash
# દૂરસ્થ VPS સામે OpenCode, ફક્ત glm/kimi મોડલ જ રાખો
shiguang-gateway setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m shiguang-gateway/glm/glm-5.2 "..."   # પહેલા SHIGUANG_GATEWAY_API_KEY નિકાસ કરો

# દૂરસ્થ કેટલોગમાંથી Codex પ્રોફાઇલ
shiguang-gateway setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# દૂરસ્થ સામે સીધા CLI લોન્ચ કરો
shiguang-gateway launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
shiguang-gateway launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

દરેક વખતે `--remote`/`--api-key` પસાર કરવા બદલે, એકવાર લોગિન કરો અને **સક્રિય સંદર્ભ** તેમને આપોઆપ પૂરા પાડવા દો:

```bash
shiguang-gateway connect 192.168.0.15        # એક સ્કોપ્ડ ટોકન બનાવે છે, સંદર્ભ સંગ્રહિત કરે છે
shiguang-gateway setup-codex                 # ← હવે દૂરસ્થ કેટલોગનો ઉપયોગ કરે છે
shiguang-gateway setup-opencode              # ← સમાન
shiguang-gateway launch                      # ← Claude Code દૂરસ્થ સામે
```

સંદર્ભો, સ્કોપ્સ અને ટોકન વ્યવસ્થાપન માટે [દૂરસ્થ મોડ](./REMOTE-MODE.md) જુઓ.

---

## બેઝ URL પરંપરાઓ (જે સાધનો `/v1` માંગે છે)

ShiguangGateway OpenAI સપાટી `/v1` પર, Anthropic સપાટી મૂળ પર, અને એક નેટિવ Gemini સપાટી `/v1beta` પર પ્રદર્શિત કરે છે. દરેક ઇન્ટિગ્રેશન તેના સાધન દ્વારા અપેક્ષિત સ્વરૂપમાં જોડાયેલ છે (કમાન્ડ સ્ત્રોતમાં ચકાસવામાં આવ્યું):

| ઇન્ટિગ્રેશન                                                                | બેઝ URL લખાયેલ | `/v1`?                                         |
| -------------------------------------------------------------------------- | -------------- | ---------------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | મૂળ            | નહીં — Cline `/v1/chat/completions` ઉમેરે છે   |
| `setup-goose` (`OPENAI_HOST`)                                              | મૂળ            | નહીં — Goose પાથ ઉમેરે છે                      |
| `setup-aider` (`OPENAI_API_BASE`)                                          | મૂળ            | નહીં — LiteLLM `/v1/chat/completions` ઉમેરે છે |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | `/v1` સાથે     | હા                                             |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | મૂળ            | નહીં — Claude Code `/v1/messages` ઉમેરે છે     |
| `setup-codex`, `launch-codex` (`model_providers.shiguang-gateway.base_url`)       | `/v1` સાથે     | હા                                             |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | `/v1` સાથે     | હા                                             |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | મૂળ            | નહીં — SDK `/v1beta/models/…` ઉમેરે છે         |

---

## નેટિવ ડિપેન્ડન્સી અપડેટ રાખવું: `--include=optional`

જ્યારે તમે `shiguang-gateway update` સાથે અપડેટ કરો છો (પુષ્ટિ કર્યા પછી, અથવા `--apply` સાથે),
ShiguangGateway `--include=optional` સાથે ઇન્સ્ટોલ ચલાવે છે:

```bash
npm install -g shiguang-gateway@latest --include=optional
```

આ **નહીં** એક ફ્લેગ છે જે તમે `shiguang-gateway update` ને આપો છો — તે હંમેશા અપડેટર દ્વારા લાગુ કરવામાં આવે છે. તે ખાતરી આપે છે કે `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, LLMLingua SLM સ્ટેક) અપડેટ દરમિયાન જીવંત રહે છે, ભલે તમારા npm કન્ફિગમાં
`omit=optional` સેટ હોય, જે અન્યથા નેટિવ SQLite ડ્રાઇવર અને OS-keyring બાઇન્ડિંગને મૌન રીતે દૂર કરશે. ચોક્કસ કમાન્ડને પૂર્વાવલોકન કરવા માટે, લાગુ કર્યા વિના:

```bash
shiguang-gateway update --dry-run
# [DRY RUN] Would run: npm install -g shiguang-gateway@latest --include=optional
```

અન્ય `shiguang-gateway update` ફ્લેગ્સ (સોર્સમાં ચકાસવામાં આવ્યા): `--check` (અપડેટેડ ન હોય તો 1 ની બહાર નીકળે), `--apply` (પ્રોમ્પ્ટ કર્યા વિના ઇન્સ્ટોલ કરે), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI દ્વારા `shiguang-gateway run gemini`

`@google/gemini-cli` 0.50.0 સામે કરાર ચકાસવામાં આવ્યો: CLI
`GOOGLE_GEMINI_BASE_URL` નો માન રાખે છે અને `POST /v1beta/models/<model>:generateContent`
(અને `:streamGenerateContent?alt=sse`) સામે જારી કરે છે — ચોક્કસ રીતે ShiguangGatewayનું નેટિવ
Gemini સપાટી (`/v1beta`). `shiguang-gateway run gemini` તે આપોઆપ જોડે છે:

- `GOOGLE_GEMINI_BASE_URL` → સક્રિય ShiguangGateway આધાર URL (રૂટ, કોઈ `/v1` નથી);
- `GEMINI_API_KEY` → ઉકેલાયેલ ShiguangGateway ક્રેડેન્શિયલ (વિકલ્પ/env/સંદર્ભ);
- એક **અસ્થાયી અલગ `GEMINI_CLI_HOME`** જેનું `.gemini/settings.json`
  `gemini-api-key` ઓથને પસંદ કરે છે, જેથી સંગ્રહિત Google OAuth સત્ર (Code Assist)
  ક્યારેય ShiguangGateway-દિશાનિર્દેશિત લોન્ચને ઓવરરાઈડ ન કરે — બહાર નીકળ્યા પછી દૂર કરવામાં આવે છે;
- **env સ્વચ્છતા**: બાળક env માંથી `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` અને `GOOGLE_GENAI_USE_GCA` દૂર કરવામાં આવે છે (જે
  ઓથને Vertex/Code Assist તરફ ફરી મોકલશે), અને `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key`
  બેલ્ટ-અને-સસ્પેન્ડર્સ બેકઅપ તરીકે સેટ કરવામાં આવે છે — અન્ય `run` લક્ષ્યોને તેમના પોતાના
  વિરુદ્ધતા વેરિયેબલ્સ માટે સમાન સારવાર મળે છે;
- `--model <id>` ઇન્જેક્શન `--provider`/`--model` માંથી.

```bash
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

Geminiનું વર્કસ્પેસ-ટ્રસ્ટ ગાર્ડ હેડલેસ મોડમાં હજી પણ લાગુ પડે છે — `--skip-trust` પસાર કરો
(અથવા ડિરેક્ટરીને ઇન્ટરેક્ટિવ રીતે વિશ્વાસ કરો); લોન્ચર જાનબૂઝીને તેને બાયપાસ નથી કરતું. આ લોન્ચર **ACP
રજીસ્ટ્રેશન** (`src/lib/acp/registry.ts`, `gemini --acp`) થી અલગ છે, જે `/dashboard/acp-agents` માટે એજન્ટ-પ્રોટોકોલ ઇન્ટિગ્રેશન રહે છે.

---

## વાસ્તવિક ધૂમ્રપાન સ્વીપ (ઓપ્ટ-ઇન)

CI માં નિશ્ચિત લોંચ-યોજન પુનરાવર્તન ચલાવે છે (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). વાસ્તવિક બાઇનરીઓને વાસ્તવિક
ShiguangGateway સર્વર સામે માન્ય કરવા માટે, એક ઓપ્ટ-ઇન હાર્નેસ છે
`tests/integration/upstream-cli-smoke.int.test.ts`. તે ક્યારેય આપોઆપ ચલાવવામાં નથી આવતું
(દરેક ઉપ-ટેસ્ટ છોડી દે છે જો `RUN_CLI_SMOKE=1` ન હોય), ક્રેડેન્શિયલને env-var
NAME દ્વારા પસાર કરે છે (ક્યારેય મૂલ્ય દ્વારા નહીં), કોઈપણ નોંધાયેલા આઉટપુટમાંથી કી-આકારના સ્ટ્રિંગ્સને છુપાવે છે, તે લક્ષ્યોને છોડી દે છે જેમની બાઇનરી ઇન્સ્ટોલ નથી, અને નિષ્ફળતાઓને
ઓથ / અપસ્ટ્રીમ / કન્ફિગ તરીકે વર્ગીકૃત કરે છે, ન કે માત્ર બેર બુલિયન:

```bash
RUN_CLI_SMOKE=1 \
SHIGUANG_GATEWAY_SMOKE_BASE_URL="http://localhost:20128" \
SHIGUANG_GATEWAY_SMOKE_MODEL="<provider/model>" \
SHIGUANG_GATEWAY_SMOKE_API_KEY_ENV="SHIGUANG_GATEWAY_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

વિકલ્પિક: `SHIGUANG_GATEWAY_SMOKE_TARGETS="codex,opencode,qwen"` સ્વીપને મર્યાદિત કરે છે;
`SHIGUANG_GATEWAY_SMOKE_TIMEOUT_MS` 120સેકન્ડ પ્રતિ-લક્ષ્ય ટાઈમઆઉટને ઓવરરાઈડ કરે છે.

---

## વધુ જુઓ

- [Claude Code રૂપરેખાંકન](./CLAUDE-CODE-CONFIGURATION.md) — ઊંડા Claude Code માર્ગદર્શિકા
- [Codex CLI રૂપરેખાંકન](./CODEX-CLI-CONFIGURATION.md) — એકવારનો `[model_providers.shiguang-gateway]` આધારભૂત સેટઅપ
- [દૂરનું મોડ](./REMOTE-MODE.md) — સંદર્ભ, સ્કોપ કરેલા ઍક્સેસ ટોકન, એક દૂરના સર્વર ચલાવવું
- [CLI ટૂલ્સ સંદર્ભ](../reference/CLI-TOOLS.md) — સમર્થિત ટૂલ્સ + ડેશબોર્ડ પૃષ્ઠોનો સંપૂર્ણ કૅટલોગ
- [સેટઅપ માર્ગદર્શિકા](./SETUP_GUIDE.md) — ઇન્સ્ટોલ પદ્ધતિઓ અને પ્રથમ વખત શરૂ થવા માટેની માર્ગદર્શિકા
