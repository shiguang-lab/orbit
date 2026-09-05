# CLI-INTEGRATIONS (Azərbaycan dili)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "CLI İnteqrasiyaları — hər hansı bir kodlama CLI-ni ShiguangGateway-a yönləndirin"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI İnteqrasiyaları

ShiguangGateway, bir kodlama CLI-nin (Codex, Claude Code, OpenCode, Cline, …) ShiguangGateway-u arxa planda istifadə etməsi üçün konfiqurasiya edən `setup-*` əmrləri ailəsini təqdim edir — beləliklə, alət **bir** uç nöqtə ilə danışır və ShiguangGateway doğru təminatçıya avtomatik geri dönmə ilə yönləndirir. Hər bir əmr, işləyən bir ShiguangGateway-dan **canlı** model kataloqunu oxuyur və alətin öz konfiqurasiya faylını **sizin** maşınınıza yazır. API açarı, alətin dəstəklədiyi hər yerdə bir mühit dəyişəni ilə istinad edilir. Alətə məxsus mühit faylını saxlayan əmrlər aşağıda qeyd olunmuşdur.

Eyni zamanda, `shiguang-gateway run <target>` adlı ümumi bir başlatıcı da var — bu, `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` və ya `gemini`-ni düzgün mühitlə başlatır, heç bir konfiqurasiya yazmadan. Hədəflər və onların təmsilçiləri, kanonik manifest `bin/cli/cli-manifest.mjs`-dən gəlir (`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`, `open-code`, `qwen-code`, `gemini-cli`), və `shiguang-gateway completion` eyni manifest-dən əldə edilən hədəf sözlərini təqdim edir. Köhnə alət başlatıcıları — `shiguang-gateway launch` (Claude Code) və `shiguang-gateway launch-codex` (Codex) — hələ də mövcuddur.

Təminatçı onboarding eyni yerli/uzaq kontekstdən mövcuddur. Aşağıdakı API-öncəli əmrlər, idarəetmə autentifikasiyasını təminatçı etimadnamələrindən ayrı saxlayır və heç vaxt strukturlu çıxışda etimadnaməni çap etmir:

```bash
shiguang-gateway providers add glm --credential-env GLM_API_KEY --name work
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth openai
shiguang-gateway providers edit <connection-id> --default-model glm/glm-5.2
shiguang-gateway providers remove <connection-id> --yes
```

Skriptlər üçün `--credential-stdin` və ya `--credential-env`-i üstün tutun; `--credential` isə nəzarət olunan yerli istifadə üçün saxlanılır. `providers remove` qeyri-interaktiv terminalda `--yes` tələb edir və beş əmrdən hamısı aktiv konteksti və ya qlobal `--base-url`/`--api-key` seçimlərini nəzərə alır.

İki ən zəngin inteqrasiyanın bir dəfəlik, əl ilə yazılmış əsas konfiqurasiyası üçün alətə xas dərin dalışlara baxın:

- [Claude Code konfiqurasiyası](./CLAUDE-CODE-CONFIGURATION.md)
- [Codex CLI konfiqurasiyası](./CODEX-CLI-CONFIGURATION.md)
- [Uzaq Rejim](./REMOTE-MODE.md) — laptopunuzdan uzaq ShiguangGateway (VPS / Tailnet) idarə edin
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — OmniCopilot genişləndirməsi; bu, eyni zamanda redaktordan içəridən bu `setup-*` əmrlərini sizin üçün icra edə bilər

---

## Master cədvəli

Hər bir əmr **aktiv konteksti** ( `shiguang-gateway connect` ilə təyin edilmişdir, bax [Uzaq Rejim](./REMOTE-MODE.md)) və ya açıq `--remote <url> --api-key <key>` flag-larını nəzərə alır. Aşağıdakı "Yerli vs uzaq" deməkdir: heç bir flag olmadan `http://localhost:20128`-i hədəfləyir; `--remote` (və ya aktiv uzaq kontekst) ilə o, kataloqu həmin serverdən alır və konfiqurasiyanı yerli yazır.

| Əmr                        | Alət                    | Yazdığı şey                                                                                                                                                                | Əsas flag-lar                                                                                                                              | Yerli vs uzaq |
| -------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------- |
| `shiguang-gateway setup-codex`    | OpenAI Codex CLI        | `~/.codex/<name>.config.toml` — uyğun mətn modeli üçün bir profil (`codex --profile <name>`)                                                                               | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | Hər ikisi     |
| `shiguang-gateway setup-claude`   | Claude Code             | `~/.claude/profiles/<name>/settings.json` — uyğun model üçün bir profil (`CLAUDE_CONFIG_DIR`)                                                                              | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | Hər ikisi     |
| `shiguang-gateway setup-opencode` | OpenCode (openai-uyğun) | `~/.config/opencode/opencode.json` — hər bir kataloq modeli ilə `shiguang-gateway` təminatçısı (`opencode -m shiguang-gateway/<model>`)                                                  | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | Hər ikisi     |
| `shiguang-gateway setup-cline`    | Cline                   | `~/.cline/data/{globalState,secrets}.json` (CLI rejimi) + VS Code genişləndirmə parametrlərini çap edir                                                                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | Hər ikisi     |
| `shiguang-gateway setup-kilo`     | Kilo Code               | `~/.local/share/kilo/auth.json` (CLI) + varsa `kilocode.*`-ni VS Code `settings.json`-a birləşdirir                                                                        | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | Hər ikisi     |
| `shiguang-gateway setup-continue` | Continue / `cn` CLI     | `~/.continue/config.yaml` — `provider: openai` modelləri, açar `${{ secrets.SHIGUANG_GATEWAY_API_KEY }}` vasitəsilə                                                               | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Hər ikisi     |
| `shiguang-gateway setup-cursor`   | Cursor                  | Heç nə — tətbiq içindəki addımları çap edir (Cursor konfiqurasiyası qeyri-şəffaf SQLite-dir)                                                                               | `--remote` `--api-key` `--only` `--port`                                                                                                   | Hər ikisi     |
| `shiguang-gateway setup-roo`      | Roo Code                | `~/.shiguang-gateway/roo-settings.json` (idxal sənədi) + varsa VS Code `settings.json`-da `roo-cline.autoImportSettingsPath`-ı təyin edir                                         | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | Hər ikisi     |
| `shiguang-gateway setup-crush`    | Crush                   | `~/.config/crush/crush.json` — `openai-uyğun` təminatçı, açar `$SHIGUANG_GATEWAY_API_KEY` vasitəsilə                                                                              | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Hər ikisi     |
| `shiguang-gateway setup-goose`    | Goose                   | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + mühit reseptini çap edir                                                                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Hər ikisi     |
| `shiguang-gateway setup-aider`    | Aider                   | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + mühit reseptini çap edir                                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Hər ikisi     |
| `shiguang-gateway setup-qwen`     | Qwen Code               | `~/.qwen/settings.json` — V4 `modelProviders.openai` massivi + `SHIGUANG_GATEWAY_API_KEY` `~/.qwen/.env`-də                                                                       | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | Hər ikisi     |
| `shiguang-gateway run <target>`   | İcra başlatma (ümumi)   | Heç nə — `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini`-ni düzgün mühit və arqumentlərlə başlat; Qwen və Gemini müvəqqəti izolyasiya olunmuş ev istifadə edir | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | Hər ikisi     |
| `shiguang-gateway launch`         | Claude Code             | Heç nə — `claude`-ni `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` ilə başlatır                                                                                              | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | Hər ikisi     |
| `shiguang-gateway launch-codex`   | OpenAI Codex CLI        | Heç nə — `codex`-i `shiguang-gateway` təminatçısı ilə `-c` flag-ları vasitəsilə başlatır                                                                                          | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | Hər ikisi     |

Flag-lar haqqında qeydlər (əmr mənbəsində təsdiqlənmişdir):

- `--remote <url>` — uzaq ShiguangGateway-dan kataloqu alır ( `--port` və aktiv konteksti üstələyir). `--api-key <key>` həmin server üçün etimadnaməni təmin edir (varsayılan olaraq `SHIGUANG_GATEWAY_API_KEY` mühit dəyişəni və ya aktiv kontekstin tokeni).
- `--only <patterns>` — vergüllə ayrılmış alt stringlər; yalnız uyğun model ID-lərini saxlayır (məsələn, `--only glm,kimi`). `setup-codex`, `setup-claude`, `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`-da mövcuddur.
- `--dry-run` — fayl sisteminə toxunmadan yazılacaq şeyləri dəqiq çap edir. Hər bir `setup-*` əmrdə **istisna olmaqla** `setup-cursor` (heç vaxt fayl yazmır).
- `--model <id>` — avtomatik model aşkar etməyən alətlər üçün tələb olunur (və ya interaktiv olaraq seçilir): Cline, Kilo, Roo, Goose, Qwen, Aider. Bu alətlər həmçinin qeyri-interaktiv icra üçün `--yes` qəbul edir (bu zaman `--model` tələb olunur). `setup-opencode` varsayılan üst səviyyə modelini təyin etmək üçün `--model` qəbul edir.
- `--model <id>` `shiguang-gateway run`-da manifestin hədəf wiring-ini izləyir (`bin/cli/cli-manifest.mjs`): **aider** `--model openai/<id>` alır və **opencode** `--model shiguang-gateway/<id>` (prefix yalnız id artıq onu daşımadığı zaman əlavə olunur); **qwen** və **gemini** id-ni olduğu kimi alır; **claude** bunu `ANTHROPIC_MODEL` vasitəsilə alır, **goose** `GOOSE_MODEL` vasitəsilə, və **codex** `-c model_providers.shiguang-gateway.*` arqumentləri vasitəsilə. **Qwen, yalnız `--model` tələb edən yeganə icra hədəfidir** — `shiguang-gateway run qwen` olmadan `2` ilə açıq bir xəta ilə çıxır.
- `--port <port>` — yerli ShiguangGateway portu (varsayılan `20128`, `--remote` təyin edildikdə nəzərə alınmır). Bütün `setup-*` və hər iki başlatıcıda mövcuddur.
- `shiguang-gateway run` çıxış kodları: uşaq CLI-nin öz çıxış kodu olduğu kimi ötürülür; `2` = etibarsız arqumentlər (dəstəklənməyən hədəf, tələb olunan `--model`-in olmaması, konteyner qoruyucusu); `127` = hədəf ikili `PATH`-da yoxdur; `130`/`143`/`129` başlatma `SIGINT`/`SIGTERM`/`SIGHUP` ilə bitdikdə; `1` = digər icra başlatma xətası.
- İki başlatıcı (`launch`, `launch-codex`) `setup-claude` / `setup-codex` tərəfindən yazılmış profili seçmək üçün `--profile <name>` qəbul edir, həmçinin əsas `claude` / `codex` ikilisi üçün pass-through arqumentləri.

İnteraktiv seçici, eyni zamanda konfiqurasiya reseptləri ilə də paylaşılır:

```bash
# Aktiv yerli və ya uzaq model kataloqundan seçin və hədəfi konfiqurasiya edin.
shiguang-gateway configure claude
shiguang-gateway configure opencode --provider glm
shiguang-gateway configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` hazırda `codex`, `claude`, `opencode`, `qwen`, `aider`, `goose`, `cline`, `continue` və `kilo` üçün test edilmiş reseptlərə yönləndirilir. IDE-yə xas, MITM və yalnız bələdçi kataloq girişləri açıq `setup-*`/əl ilə axınlar olaraq qalır və başlatma hədəfləri kimi təqdim edilmir.

> `setup-opencode` **yüngül openai-uyğun** OpenCode inteqrasiyasıdır.
> Həmçinin daha zəngin bir plugin inteqrasiyası var — `shiguang-gateway setup opencode` — bu, `@shiguang-gateway/opencode-plugin`-i quraşdırır. Onlar fərqli əmrlərdir; yuxarıdakı cədvəl `setup-opencode`-i sənədləşdirir.

---

## Yerli istifadə

`localhost:20128` ünvanında ShiguangGateway işləyərkən, sadəcə alətiniz üçün qurma əmrini icra edin. Kataloq yerli serverdən alınır.

```bash
# Codex: uyğun model üçün ~/.codex/ içində profil yaz
shiguang-gateway setup-codex
codex --profile glm52            # yaradılmış profili istifadə et

# Claude Code: model başına profilləri yaz, sonra birini işə sal
shiguang-gateway setup-claude
shiguang-gateway launch --profile glm52

# OpenCode: bütün kataloq modelləri ilə openai-uyğun provayderi yaz
shiguang-gateway setup-opencode
export SHIGUANG_GATEWAY_API_KEY=sk-...  # {env:SHIGUANG_GATEWAY_API_KEY} vasitəsilə istinad edilir, heç vaxt diskdə deyil
opencode -m shiguang-gateway/glm/glm-5.2 "..."

# Avtomatik aşkar etməyi tələb etməyən alətlər üçün açıq model lazımdır:
shiguang-gateway setup-aider --model glm/glm-5.2
shiguang-gateway setup-qwen --model qwen/qwen3.8-max-preview

# Heç nə yazmadan önizləmə:
shiguang-gateway setup-continue --dry-run
```

Heç bir konfiqurasiya yazmadan işə salın (yalnız env-injection):

```bash
shiguang-gateway launch                 # Claude Code → yerli ShiguangGateway
shiguang-gateway launch-codex           # Codex CLI → yerli ShiguangGateway
shiguang-gateway launch-codex --profile glm52
shiguang-gateway run claude --model openai/gpt-5.4
shiguang-gateway run codex --model openai/gpt-5.4 --dry-run --json
shiguang-gateway run aider --model glm/glm-5.2 -- --message "reply OK"
shiguang-gateway run goose --model glm/glm-5.2
shiguang-gateway run opencode --model glm/glm-5.2 -- run "reply OK"
shiguang-gateway run qwen --model glm/glm-5.2 -- -p "reply OK"
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# Açıq əmr yolu: --dan sonra gələn hər şeyi keçirin
shiguang-gateway run claude -- --print-system-prompt "bu fərqi nəzərdən keçirin"
```

---

## Uzaqdan istifadə

Hər hansı bir qurma əmrini `--remote` + `--api-key` ilə uzaq ShiguangGateway-a yönləndirin. Kataloq uzaqdan alınır; konfiqurasiya yerli maşınınıza yazılır.

```bash
# Uzaq VPS-yə qarşı OpenCode, yalnız glm/kimi modelləri saxla
shiguang-gateway setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m shiguang-gateway/glm/glm-5.2 "..."   # əvvəlcə SHIGUANG_GATEWAY_API_KEY-i ixrac et

# Uzaq kataloqdan Codex profilləri
shiguang-gateway setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# Uzaqdan bir CLI işə sal
shiguang-gateway launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
shiguang-gateway launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

Hər dəfə `--remote`/`--api-key` keçirmək əvəzinə, bir dəfə daxil olun və **aktiv kontekst** onların avtomatik təmin edilməsinə icazə verin:

```bash
shiguang-gateway connect 192.168.0.15        # məhdudlaşdırılmış token yaradır, konteksti saxlayır
shiguang-gateway setup-codex                 # ← indi uzaq kataloqdan istifadə edir
shiguang-gateway setup-opencode              # ← eyni
shiguang-gateway launch                      # ← Claude Code uzaqda
```

Kontekstlər, sahələr və token idarəçiliyi üçün [Uzaq Rejim](./REMOTE-MODE.md) səhifəsinə baxın.

---

## Əsas URL konvensiyaları (hansı alətlər `/v1` istəyir)

ShiguangGateway OpenAI səthini `/v1`-də, Anthropic səthini kökdə, və yerli Gemini səthini `/v1beta`-da təqdim edir. Hər bir inteqrasiya alətinin gözlədiyi forma bağlıdır (əmr mənbəsində təsdiqlənmişdir):

| İnteqrasiya                                                                | Yazılan Əsas URL | `/v1`?                                           |
| -------------------------------------------------------------------------- | ---------------- | ------------------------------------------------ |
| `setup-cline` (`openAiBaseUrl`)                                            | kök              | Xeyr — Cline `/v1/chat/completions` əlavə edir   |
| `setup-goose` (`OPENAI_HOST`)                                              | kök              | Xeyr — Goose yolu əlavə edir                     |
| `setup-aider` (`OPENAI_API_BASE`)                                          | kök              | Xeyr — LiteLLM `/v1/chat/completions` əlavə edir |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | `/v1` ilə        | Bəli                                             |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | kök              | Xeyr — Claude Code `/v1/messages` əlavə edir     |
| `setup-codex`, `launch-codex` (`model_providers.shiguang-gateway.base_url`)       | `/v1` ilə        | Bəli                                             |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | `/v1` ilə        | Bəli                                             |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | kök              | Xeyr — SDK `/v1beta/models/…` əlavə edir         |

---

## Yerli asılılıqları yeniləmək: `--include=optional`

`shiguang-gateway update` ilə yenilədikdə (təsdiqlədikdən sonra, ya da `--apply` ilə),
ShiguangGateway quraşdırmanı `--include=optional` ilə icra edir:

```bash
npm install -g shiguang-gateway@latest --include=optional
```

Bu, `shiguang-gateway update`-ə ötürdüyünüz bir bayraq **deyil** — bu, həmişə
yeniləyici tərəfindən tətbiq olunur. Bu, `optionalDependencies`-in (`better-sqlite3`, `keytar`,
`tls-client`, LLMLingua SLM yığını) yeniləmədən sağ qalmasını təmin edir, əgər
npm konfiqurasiyanızda `omit=optional` təyin edilibsə, bu, yerli SQLite
sürücüsünü və OS-keyring bağlanmasını səssizcə silərdi. Dəqiq əmri tətbiq etmədən
öncə baxmaq üçün:

```bash
shiguang-gateway update --dry-run
# [DRY RUN] İcra ediləcək: npm install -g shiguang-gateway@latest --include=optional
```

Digər `shiguang-gateway update` bayraqları (mənbədə təsdiqlənmişdir): `--check` (köhnədirsə 1 ilə çıxır), `--apply` (sorğu olmadan quraşdırır), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI `shiguang-gateway run gemini` vasitəsilə

`@google/gemini-cli` 0.50.0 ilə müqavilə təsdiqlənmişdir: CLI
`GOOGLE_GEMINI_BASE_URL`-i tanıyır və `POST /v1beta/models/<model>:generateContent`
(və `:streamGenerateContent?alt=sse`) göndərir — tam olaraq ShiguangGateway-un yerli
Gemini interfeysi (`/v1beta`). `shiguang-gateway run gemini` bunu avtomatik olaraq
bağlayır:

- `GOOGLE_GEMINI_BASE_URL` → aktiv ShiguangGateway əsas URL (kök, `/v1` yoxdur);
- `GEMINI_API_KEY` → həll edilmiş ShiguangGateway kredensialı (seçim/env/kontekst);
- **müvəqqəti izolyasiya olunmuş `GEMINI_CLI_HOME`** hansı ki, `.gemini/settings.json`
  `gemini-api-key` autentifikasiyasını seçir, beləliklə saxlanılan Google OAuth sessiyası
  (Kod Dəstəyi) heç vaxt ShiguangGateway yönləndirilmiş başlatmanı üstələməz — çıxışdan sonra silinir;
- **env gigiyenası**: uşaq mühiti `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` və `GOOGLE_GENAI_USE_GCA`-dan təmizlənir (bu, autentifikasiyanı
  Vertex/Kod Dəstəyi ilə yönləndirərdi), və `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key`
  ehtiyat olaraq təyin edilir — digər `run` hədəfləri öz münaqişəli dəyişənləri üçün eyni
  müalicəni alır;
- `--model <id>` `--provider`/`--model`-dan inyeksiya.

```bash
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

Gemini-nin iş sahəsi etimad qoruyucusu hələ də başsız rejimdə tətbiq olunur —
`--skip-trust` (ya da interaktiv olaraq qovluğu etimad edin) özünüz keçirin; başlatıcı
qəsdən bunu atlamır. Bu başlatıcı **ACP qeydiyyatından** (`src/lib/acp/registry.ts`, `gemini --acp`) fərqlidir, bu, `/dashboard/acp-agents` üçün agent-protokol inteqrasiyasıdır.

---

## Real tüstü süzgəci (seçimlə)

Deterministik başlatma-planı geriyə dönmə testləri CI-də (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). REAL ikili faylları REAL
ShiguangGateway serveri ilə təsdiqləmək üçün seçimlə bir harness mövcuddur
`tests/integration/upstream-cli-smoke.int.test.ts`. Bu, avtomatik olaraq
işləmir (hər bir alt-test `RUN_CLI_SMOKE=1` olmadıqca atlanır), kredensialı env-dəki
AD ilə ötürür (dəyər ilə deyil), qeydə alınmış çıxışdan açar formasında olan
sözləri gizlədir, quraşdırılmamış hədəfləri atlayır və uğursuzluqları
autentifikasiya / upstream / konfiqurasiya kimi təsnif edir, sadəcə boolean
yerinə:

```bash
RUN_CLI_SMOKE=1 \
SHIGUANG_GATEWAY_SMOKE_BASE_URL="http://localhost:20128" \
SHIGUANG_GATEWAY_SMOKE_MODEL="<provider/model>" \
SHIGUANG_GATEWAY_SMOKE_API_KEY_ENV="SHIGUANG_GATEWAY_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

İstəyə bağlı: `SHIGUANG_GATEWAY_SMOKE_TARGETS="codex,opencode,qwen"` süzgəci məhdudlaşdırır;
`SHIGUANG_GATEWAY_SMOKE_TIMEOUT_MS` 120s-lik hər hədəf üçün vaxt aşımını üstələyir.

---

## Baxın həmçinin

- [Claude Code konfiqurasiyası](./CLAUDE-CODE-CONFIGURATION.md) — daha dərin Claude Code bələdçisi
- [Codex CLI konfiqurasiyası](./CODEX-CLI-CONFIGURATION.md) — bir dəfəlik `[model_providers.shiguang-gateway]` əsas qurulması
- [Uzaq Mod](./REMOTE-MODE.md) — kontekstlər, məhdudlaşdırılmış giriş tokenləri, uzaq serveri idarə etmək
- [CLI Alətləri istinad](../reference/CLI-TOOLS.md) — dəstəklənən alətlərin tam kataloqu + idarəetmə səhifələri
- [Quraşdırma Bələdçisi](./SETUP_GUIDE.md) — quraşdırma metodları və ilk dəfə işə salma təlimatı
