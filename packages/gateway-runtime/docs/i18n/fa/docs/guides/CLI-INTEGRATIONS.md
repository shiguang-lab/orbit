# CLI-INTEGRATIONS (فارسی)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "ادغام‌های CLI — هر CLI کدنویسی را به ShiguangGateway متصل کنید"
version: 3.8.50
lastUpdated: 2026-08-18
---

# ادغام‌های CLI

ShiguangGateway یک خانواده از دستورات `setup-*` را ارائه می‌دهد که یک CLI کدنویسی (Codex، Claude Code، OpenCode، Cline و ...) را برای استفاده از ShiguangGateway به عنوان بک‌اند خود پیکربندی می‌کند — بنابراین ابزار با **یک** نقطه پایانی ارتباط برقرار می‌کند و ShiguangGateway به ارائه‌دهنده مناسب با بازگشت خودکار هدایت می‌کند. هر دستور فهرست مدل **زنده** را از یک ShiguangGateway در حال اجرا (محلی یا از راه دور) می‌خواند و فایل پیکربندی خود ابزار را بر روی **ماشین شما** می‌نویسد. کلید API توسط یک متغیر محیطی در هر جایی که ابزار از آن پشتیبانی می‌کند، ارجاع داده می‌شود. دستورات که یک فایل محیط محلی ابزار را حفظ می‌کنند، در زیر ذکر شده‌اند.

همچنین یک راه‌انداز عمومی وجود دارد — `shiguang-gateway run <target>` — که `claude`، `codex`، `aider`، `goose`، `opencode`، `qwen` یا `gemini` را با محیط مناسب تزریق شده، بدون نوشتن هیچ پیکربندی، راه‌اندازی می‌کند. اهداف و نام‌های مستعار آن‌ها از فهرست رسمی `bin/cli/cli-manifest.mjs` می‌آیند (`claude-code|cc|anthropic`، `codex-cli|openai-codex|openai`، `goose-cli`، `open-code`، `qwen-code`، `gemini-cli`) و `shiguang-gateway completion` همان کلمات هدف مشتق شده از فهرست را ارائه می‌دهد. راه‌اندازهای قدیمی برای هر ابزار — `shiguang-gateway launch` (Claude Code) و `shiguang-gateway launch-codex` (Codex) — همچنان در دسترس هستند.

پذیرش ارائه‌دهنده از همان زمینه محلی/از راه دور در دسترس است. دستورات API-first زیر مدیریت احراز هویت را از اعتبارنامه‌های ارائه‌دهنده جدا نگه می‌دارند و هرگز اعتبارنامه‌ای را در خروجی ساختاری چاپ نمی‌کنند:

```bash
shiguang-gateway providers add glm --credential-env GLM_API_KEY --name work
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth openai
shiguang-gateway providers edit <connection-id> --default-model glm/glm-5.2
shiguang-gateway providers remove <connection-id> --yes
```

برای اسکریپت‌ها، `--credential-stdin` یا `--credential-env` را ترجیح دهید؛ `--credential` برای استفاده محلی کنترل شده حفظ شده است. `providers remove` نیاز به `--yes` در یک ترمینال غیرتعامل دارد و همه پنج دستور به زمینه فعال یا گزینه‌های جهانی `--base-url`/`--api-key` احترام می‌گذارند.

برای پیکربندی اولیه یک‌باره و دست‌نویس از دو ادغام غنی‌ترین، به بررسی‌های عمیق هر ابزار مراجعه کنید:

- [پیکربندی Claude Code](./CLAUDE-CODE-CONFIGURATION.md)
- [پیکربندی Codex CLI](./CODEX-CLI-CONFIGURATION.md)
- [حالت از راه دور](./REMOTE-MODE.md) — کنترل یک ShiguangGateway از راه دور (VPS / Tailnet) از لپ‌تاپ شما
- [چت VS Code Copilot](./VSCODE-COPILOT.md) — افزونه OmniCopilot؛ همچنین می‌تواند این دستورات `setup-*` را از داخل ویرایشگر برای شما اجرا کند

---

## جدول اصلی

هر دستور به **زمینه فعال** (تنظیم شده با `shiguang-gateway connect`، به [حالت از راه دور](./REMOTE-MODE.md) مراجعه کنید) یا پرچم‌های صریح `--remote <url> --api-key <key>` احترام می‌گذارد. "محلی در مقابل از راه دور" در زیر به این معناست: بدون پرچم‌ها به `http://localhost:20128` هدف‌گذاری می‌کند؛ با `--remote` (یا یک زمینه از راه دور فعال) فهرست را از آن سرور دریافت کرده و پیکربندی را به صورت محلی می‌نویسد.

| دستور                      | ابزار                        | آنچه می‌نویسد                                                                                                                                                       | پرچم‌های کلیدی                                                                                                                             | محلی در مقابل از راه دور |
| -------------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ |
| `shiguang-gateway setup-codex`    | OpenAI Codex CLI             | `~/.codex/<name>.config.toml` — یک پروفایل برای هر مدل متنی سازگار (`codex --profile <name>`)                                                                       | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | هر دو                    |
| `shiguang-gateway setup-claude`   | Claude Code                  | `~/.claude/profiles/<name>/settings.json` — یک پروفایل برای هر مدل مطابقت یافته (`CLAUDE_CONFIG_DIR`)                                                               | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | هر دو                    |
| `shiguang-gateway setup-opencode` | OpenCode (سازگار با openai)  | `~/.config/opencode/opencode.json` — ارائه‌دهنده `shiguang-gateway` با هر مدل فهرست (`opencode -m shiguang-gateway/<model>`)                                                      | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | هر دو                    |
| `shiguang-gateway setup-cline`    | Cline                        | `~/.cline/data/{globalState,secrets}.json` (حالت CLI) + چاپ تنظیمات افزونه VS Code                                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | هر دو                    |
| `shiguang-gateway setup-kilo`     | Kilo Code                    | `~/.local/share/kilo/auth.json` (CLI) + ادغام `kilocode.*` به `settings.json` VS Code در صورت وجود                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | هر دو                    |
| `shiguang-gateway setup-continue` | Continue / `cn` CLI          | `~/.continue/config.yaml` — مدل‌های `provider: openai`، کلید از طریق `${{ secrets.SHIGUANG_GATEWAY_API_KEY }}`                                                             | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | هر دو                    |
| `shiguang-gateway setup-cursor`   | Cursor                       | هیچ چیز — چاپ مراحل درون‌برنامه (پیکربندی Cursor غیرشفاف SQLite)                                                                                                    | `--remote` `--api-key` `--only` `--port`                                                                                                   | هر دو                    |
| `shiguang-gateway setup-roo`      | Roo Code                     | `~/.shiguang-gateway/roo-settings.json` (مدرک وارد شده) + تنظیم `roo-cline.autoImportSettingsPath` اگر یک `settings.json` VS Code وجود داشته باشد                          | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | هر دو                    |
| `shiguang-gateway setup-crush`    | Crush                        | `~/.config/crush/crush.json` — ارائه‌دهنده سازگار با `openai`، کلید از طریق `$SHIGUANG_GATEWAY_API_KEY`                                                                    | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | هر دو                    |
| `shiguang-gateway setup-goose`    | Goose                        | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + چاپ دستورالعمل محیط                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | هر دو                    |
| `shiguang-gateway setup-aider`    | Aider                        | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + چاپ دستورالعمل محیط                                                                                | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | هر دو                    |
| `shiguang-gateway setup-qwen`     | Qwen Code                    | `~/.qwen/settings.json` — آرایه `V4 modelProviders.openai` + `SHIGUANG_GATEWAY_API_KEY` در `~/.qwen/.env`                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | هر دو                    |
| `shiguang-gateway run <target>`   | راه‌اندازی زمان اجرا (عمومی) | هیچ چیز — راه‌اندازی `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` با محیط و آرگومان‌های مناسب؛ Qwen و Gemini از یک خانه موقتی ایزوله استفاده می‌کنند | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | هر دو                    |
| `shiguang-gateway launch`         | Claude Code                  | هیچ چیز — `claude` را با `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` تزریق شده راه‌اندازی می‌کند                                                                    | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | هر دو                    |
| `shiguang-gateway launch-codex`   | OpenAI Codex CLI             | هیچ چیز — `codex` را با ارائه‌دهنده `shiguang-gateway` تزریق شده از طریق پرچم‌های `-c` راه‌اندازی می‌کند                                                                   | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | هر دو                    |

نکات مربوط به پرچم‌ها (تأیید شده در منبع دستور):

- `--remote <url>` — فهرست را از یک ShiguangGateway از راه دور دریافت کنید (پرچم‌های `--port` و زمینه فعال را نادیده می‌گیرد). `--api-key <key>` اعتبارنامه را برای آن سرور تأمین می‌کند (به طور پیش‌فرض به متغیر محیطی `SHIGUANG_GATEWAY_API_KEY` یا توکن زمینه فعال اشاره می‌کند).
- `--only <patterns>` — زیررشته‌های جداشده با کاما؛ فقط شناسه‌های مدل‌هایی که مطابقت دارند را نگه‌دارید (به عنوان مثال `--only glm,kimi`). در `setup-codex`، `setup-claude`، `setup-opencode`، `setup-continue`، `setup-cursor`، `setup-crush` در دسترس است.
- `--dry-run` — دقیقاً آنچه که نوشته می‌شود را بدون لمس سیستم فایل چاپ کنید. در هر دستور `setup-*` **به جز** `setup-cursor` در دسترس است (که هرگز فایلی نمی‌نویسد).
- `--model <id>` — برای ابزارهایی که کشف خودکار مدل ندارند، الزامی است (یا به صورت تعاملی انتخاب می‌شود): Cline، Kilo، Roo، Goose، Qwen، Aider. این ابزارها همچنین `--yes` را برای اجراهای غیرتعامل می‌پذیرند (که سپس نیاز به `--model` دارد). `setup-opencode` `--model` را برای تنظیم مدل پیش‌فرض سطح بالا می‌پذیرد.
- `--model <id>` در `shiguang-gateway run` از اتصالات مشخص شده در فهرست استفاده می‌کند (`bin/cli/cli-manifest.mjs`): **aider** `--model openai/<id>` و **opencode** `--model shiguang-gateway/<id>` (پیشوند فقط زمانی اضافه می‌شود که شناسه قبلاً آن را نداشته باشد)؛ **qwen** و **gemini** شناسه را به صورت عینی دریافت می‌کنند؛ **claude** آن را از طریق `ANTHROPIC_MODEL`، **goose** از طریق `GOOSE_MODEL` و **codex** از طریق آرگومان‌های `-c model_providers.shiguang-gateway.*` دریافت می‌کند. **Qwen تنها هدف اجرایی است که به شدت نیاز به `--model` دارد** — `shiguang-gateway run qwen` بدون آن با خطای صریح `2` خارج می‌شود.
- `--port <port>` — پورت محلی ShiguangGateway (پیش‌فرض `20128`، در صورت تنظیم `--remote` نادیده گرفته می‌شود). در تمام `setup-*` و هر دو راه‌انداز موجود است.
- کدهای خروجی `shiguang-gateway run`: کد خروجی خود CLI فرزند به صورت عینی منتقل می‌شود؛ `2` = آرگومان‌های نامعتبر (هدف پشتیبانی نشده، `--model` مورد نیاز گم شده، نگهبان کانتینر)؛ `127` = باینری هدف در `PATH` نیست؛ `130`/`143`/`129` زمانی که راه‌اندازی با `SIGINT`/`SIGTERM`/`SIGHUP` پایان می‌یابد؛ `1` = سایر خطاهای راه‌اندازی زمان اجرا.
- دو راه‌انداز (`launch`، `launch-codex`) `--profile <name>` را برای انتخاب یک پروفایل نوشته شده توسط `setup-claude` / `setup-codex` می‌پذیرند، به علاوه آرگومان‌های عبوری برای باینری‌های زیرین `claude` / `codex`.

انتخابگر تعاملی همچنین توسط دستورالعمل‌های پیکربندی به اشتراک گذاشته می‌شود:

```bash
# از فهرست مدل محلی یا از راه دور فعال انتخاب کنید و هدف را پیکربندی کنید.
shiguang-gateway configure claude
shiguang-gateway configure opencode --provider glm
shiguang-gateway configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` در حال حاضر به دستورالعمل‌های آزمایش شده برای `codex`، `claude`، `opencode`، `qwen`، `aider`، `goose`، `cline`، `continue` و `kilo` واگذار می‌شود. ورودی‌های فهرست فقط IDE، MITM و راهنما به صورت صریح `setup-*`/جریان‌های دستی باقی می‌مانند و به عنوان اهداف قابل راه‌اندازی ارائه نمی‌شوند.

> `setup-opencode` ادغام **سبک سازگار با openai** OpenCode است.
> همچنین یک ادغام پلاگین غنی‌تر وجود دارد — `shiguang-gateway setup opencode` — که `@shiguang-gateway/opencode-plugin` را نصب می‌کند. این‌ها دستورات متفاوتی هستند؛ جدول بالا `setup-opencode` را مستند می‌کند.

---

## استفاده محلی

با اجرای ShiguangGateway بر روی `localhost:20128`، فقط دستور راه‌اندازی را برای ابزار خود اجرا کنید. کاتالوگ از سرور محلی دریافت می‌شود.

```bash
# Codex: نوشتن یک پروفایل برای هر مدل مطابقت یافته در ~/.codex/
shiguang-gateway setup-codex
codex --profile glm52            # استفاده از پروفایل تولید شده

# Claude Code: نوشتن پروفایل‌های هر مدل، سپس راه‌اندازی یکی
shiguang-gateway setup-claude
shiguang-gateway launch --profile glm52

# OpenCode: نوشتن ارائه‌دهنده سازگار با openai با تمام مدل‌های کاتالوگ
shiguang-gateway setup-opencode
export SHIGUANG_GATEWAY_API_KEY=sk-...  # ارجاع داده شده از طریق {env:SHIGUANG_GATEWAY_API_KEY}، هرگز بر روی دیسک
opencode -m shiguang-gateway/glm/glm-5.2 "..."

# ابزارهایی که به کشف خودکار نیاز ندارند به یک مدل صریح نیاز دارند:
shiguang-gateway setup-aider --model glm/glm-5.2
shiguang-gateway setup-qwen --model qwen/qwen3.8-max-preview

# پیش‌نمایش بدون نوشتن هیچ چیزی:
shiguang-gateway setup-continue --dry-run
```

بدون نوشتن هیچ پیکربندی (فقط تزریق متغیر محیطی) راه‌اندازی کنید:

```bash
shiguang-gateway launch                 # Claude Code → ShiguangGateway محلی
shiguang-gateway launch-codex           # Codex CLI → ShiguangGateway محلی
shiguang-gateway launch-codex --profile glm52
shiguang-gateway run claude --model openai/gpt-5.4
shiguang-gateway run codex --model openai/gpt-5.4 --dry-run --json
shiguang-gateway run aider --model glm/glm-5.2 -- --message "reply OK"
shiguang-gateway run goose --model glm/glm-5.2
shiguang-gateway run opencode --model glm/glm-5.2 -- run "reply OK"
shiguang-gateway run qwen --model glm/glm-5.2 -- -p "reply OK"
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# مسیر دستور صریح: هر چیزی که بعد از -- بیاید را عبور دهید
shiguang-gateway run claude -- --print-system-prompt "این تفاوت را بررسی کنید"
```

---

## استفاده از راه دور

هر دستور راه‌اندازی را به یک ShiguangGateway از راه دور با `--remote` + `--api-key` اشاره کنید. کاتالوگ از راه دور دریافت می‌شود؛ پیکربندی بر روی ماشین محلی شما نوشته می‌شود.

```bash
# OpenCode در برابر یک VPS از راه دور، فقط مدل‌های glm/kimi را نگه دارید
shiguang-gateway setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m shiguang-gateway/glm/glm-5.2 "..."   # ابتدا SHIGUANG_GATEWAY_API_KEY را صادر کنید

# پروفایل‌های Codex از یک کاتالوگ از راه دور
shiguang-gateway setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# راه‌اندازی یک CLI به طور مستقیم در برابر راه دور
shiguang-gateway launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
shiguang-gateway launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

به جای اینکه هر بار `--remote`/`--api-key` را عبور دهید، یک بار وارد شوید و اجازه دهید **زمینه فعال** به طور خودکار آنها را تأمین کند:

```bash
shiguang-gateway connect 192.168.0.15        # یک توکن محدوده‌ای ایجاد می‌کند، زمینه را ذخیره می‌کند
shiguang-gateway setup-codex                 # ← حالا از کاتالوگ از راه دور استفاده می‌کند
shiguang-gateway setup-opencode              # ← مشابه
shiguang-gateway launch                      # ← Claude Code در برابر راه دور
```

برای زمینه‌ها، دامنه‌ها و مدیریت توکن به [حالت راه دور](./REMOTE-MODE.md) مراجعه کنید.

---

## کنوانسیون‌های URL پایه (کدام ابزارها به `/v1` نیاز دارند)

ShiguangGateway سطح OpenAI را در `/v1`، سطح Anthropic را در ریشه و یک سطح بومی Gemini را در `/v1beta` ارائه می‌دهد. هر یکپارچگی به شکلی که ابزارش انتظار دارد متصل شده است (در منبع دستور تأیید شده):

| یکپارچگی                                                                   | URL پایه نوشته شده | `/v1`؟                                               |
| -------------------------------------------------------------------------- | ------------------ | ---------------------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | ریشه               | خیر — Cline `/v1/chat/completions` را اضافه می‌کند   |
| `setup-goose` (`OPENAI_HOST`)                                              | ریشه               | خیر — Goose مسیر را اضافه می‌کند                     |
| `setup-aider` (`OPENAI_API_BASE`)                                          | ریشه               | خیر — LiteLLM `/v1/chat/completions` را اضافه می‌کند |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | با `/v1`           | بله                                                  |
| `setup-claude` (`ANTHROPIC_BASE_URL`)، `launch`                            | ریشه               | خیر — Claude Code `/v1/messages` را اضافه می‌کند     |
| `setup-codex`, `launch-codex` (`model_providers.shiguang-gateway.base_url`)       | با `/v1`           | بله                                                  |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | با `/v1`           | بله                                                  |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | ریشه               | خیر — SDK `/v1beta/models/…` را اضافه می‌کند         |

---

## نگهداری وابستگی‌های بومی در بروزرسانی: `--include=optional`

زمانی که با `shiguang-gateway update` بروزرسانی می‌کنید (پس از تأیید یا با `--apply`)،
ShiguangGateway نصب را با `--include=optional` انجام می‌دهد:

```bash
npm install -g shiguang-gateway@latest --include=optional
```

این **یک** پرچم نیست که به `shiguang-gateway update` بدهید — همیشه توسط بروزرسان
اعمال می‌شود. این اطمینان می‌دهد که `optionalDependencies` (`better-sqlite3`، `keytar`،
`tls-client`، پشته LLMLingua SLM) در طول بروزرسانی باقی بمانند حتی اگر پیکربندی npm شما
دارای `omit=optional` باشد، که در غیر این صورت به طور خاموش درایور SQLite بومی و
بایندینگ OS-keyring را حذف می‌کند. برای پیش‌نمایش فرمان دقیق بدون اعمال:

```bash
shiguang-gateway update --dry-run
# [DRY RUN] Would run: npm install -g shiguang-gateway@latest --include=optional
```

سایر پرچم‌های `shiguang-gateway update` (تأیید شده در منبع): `--check` (خروج 1 اگر
قدیمی باشد)، `--apply` (نصب بدون درخواست)، `--changelog`، `--no-backup`،
`--yes`.

---

## Google Gemini CLI از طریق `shiguang-gateway run gemini`

قرارداد تأیید شده در برابر `@google/gemini-cli` 0.50.0: CLI به
`GOOGLE_GEMINI_BASE_URL` احترام می‌گذارد و `POST /v1beta/models/<model>:generateContent`
(و `:streamGenerateContent?alt=sse`) را به آن ارسال می‌کند — دقیقاً سطح بومی
Gemini ShiguangGateway (`/v1beta`). `shiguang-gateway run gemini` این را به طور خودکار متصل می‌کند:

- `GOOGLE_GEMINI_BASE_URL` → URL پایه فعال ShiguangGateway (ریشه، بدون `/v1`)؛
- `GEMINI_API_KEY` → اعتبارنامه حل شده ShiguangGateway (گزینه/محیط/زمینه)؛
- یک **`GEMINI_CLI_HOME` موقت و ایزوله** که `.gemini/settings.json` آن
  احراز هویت `gemini-api-key` را انتخاب می‌کند، بنابراین یک جلسه OAuth
  ذخیره شده Google (Code Assist) هرگز راه‌اندازی هدایت شده ShiguangGateway را
  نادیده نمی‌گیرد — پس از خروج حذف می‌شود؛
- **بهداشت محیط**: محیط فرزند از `GOOGLE_API_KEY`،
  `GOOGLE_GENAI_USE_VERTEXAI` و `GOOGLE_GENAI_USE_GCA` پاک می‌شود (که
  احراز هویت را به Vertex/Code Assist هدایت می‌کند)، و `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key`
  به عنوان یک پشتیبان اضافی تنظیم می‌شود — سایر اهداف `run` همین
  درمان را برای متغیرهای متضاد خود دریافت می‌کنند؛
- تزریق `--model <id>` از `--provider`/`--model`.

```bash
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

نگهبان اعتماد workspace Gemini هنوز در حالت بدون سر اعمال می‌شود —
`--skip-trust` را عبور دهید (یا به صورت تعاملی به دایرکتوری اعتماد کنید)؛
راه‌انداز عمداً از آن عبور نمی‌کند. این راه‌انداز از **ثبت ACP**
(`src/lib/acp/registry.ts`، `gemini --acp`) متمایز است، که
ادغام پروتکل عامل برای `/dashboard/acp-agents` باقی می‌ماند.

---

## پاکسازی واقعی دود (اختیاری)

اجرای برنامه راه‌اندازی قطعی در CI (`tests/unit/cli/run-command.test.ts`،
`tests/unit/cli/run-execution.test.ts`). برای اعتبارسنجی باینری‌های واقعی
در برابر یک سرور واقعی ShiguangGateway، یک ابزار اختیاری در
`tests/integration/upstream-cli-smoke.int.test.ts` وجود دارد. این ابزار هرگز به
طور خودکار اجرا نمی‌شود (هر زیرآزمایش رد می‌شود مگر اینکه `RUN_CLI_SMOKE=1`)،
اعتبارنامه را از طریق متغیر محیطی NAME (هرگز از طریق مقدار) منتقل می‌کند،
رشته‌های کلید شکل را از هر خروجی ثبت شده حذف می‌کند، اهدافی که باینری آن‌ها
نصب نشده است را رد می‌کند و شکست‌ها را به عنوان auth / upstream / config
به جای یک بولین خالص طبقه‌بندی می‌کند:

```bash
RUN_CLI_SMOKE=1 \
SHIGUANG_GATEWAY_SMOKE_BASE_URL="http://localhost:20128" \
SHIGUANG_GATEWAY_SMOKE_MODEL="<provider/model>" \
SHIGUANG_GATEWAY_SMOKE_API_KEY_ENV="SHIGUANG_GATEWAY_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

اختیاری: `SHIGUANG_GATEWAY_SMOKE_TARGETS="codex,opencode,qwen"` پاکسازی را محدود می‌کند؛
`SHIGUANG_GATEWAY_SMOKE_TIMEOUT_MS` زمان‌سنج 120 ثانیه‌ای برای هر هدف را نادیده می‌گیرد.

---

## همچنین ببینید

- [پیکربندی کلاود کد](./CLAUDE-CODE-CONFIGURATION.md) — راهنمای عمیق‌تر کلاود کد
- [پیکربندی CLI کدکس](./CODEX-CLI-CONFIGURATION.md) — تنظیمات پایه یک‌باره `[model_providers.shiguang-gateway]`
- [حالت از راه دور](./REMOTE-MODE.md) — زمینه‌ها، توکن‌های دسترسی محدود، راه‌اندازی یک سرور از راه دور
- [مرجع ابزارهای CLI](../reference/CLI-TOOLS.md) — کاتالوگ کامل ابزارهای پشتیبانی‌شده + صفحات داشبورد
- [راهنمای راه‌اندازی](./SETUP_GUIDE.md) — روش‌های نصب و آموزش اولیه در اولین اجرا
