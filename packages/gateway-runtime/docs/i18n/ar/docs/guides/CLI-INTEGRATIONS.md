# CLI-INTEGRATIONS (العربية)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "تكاملات CLI — توجيه أي CLI برمجي إلى ShiguangGateway"
version: 3.8.50
lastUpdated: 2026-08-18
---

# تكاملات CLI

تقدم ShiguangGateway مجموعة من أوامر `setup-*` التي تقوم بتكوين CLI برمجي (Codex، Claude Code، OpenCode، Cline، …) لاستخدام ShiguangGateway كخلفية لها — بحيث يتواصل الأداة مع **نقطة نهاية واحدة** وShiguangGateway تقوم بتوجيه الطلب إلى المزود الصحيح مع التراجع التلقائي. كل أمر يقرأ كتالوج النموذج **الحالي** من ShiguangGateway قيد التشغيل (محلي أو بعيد) ويكتب ملف التكوين الخاص بالأداة على **جهازك**. يتم الإشارة إلى مفتاح API بواسطة متغير بيئي حيثما تدعمه الأداة. يتم ملاحظة الأوامر التي تحتفظ بملف بيئة محلي للأداة أدناه.

هناك أيضًا مشغل عام — `shiguang-gateway run <target>` — الذي يقوم بتشغيل `claude`، `codex`، `aider`، `goose`، `opencode`، `qwen` أو `gemini` مع البيئة الصحيحة المدخلة، دون كتابة أي تكوين على الإطلاق. تأتي الأهداف وألقابها من البيان القياسي `bin/cli/cli-manifest.mjs`
(`claude-code|cc|anthropic`، `codex-cli|openai-codex|openai`، `goose-cli`،
`open-code`، `qwen-code`، `gemini-cli`)، و`shiguang-gateway completion` تقدم نفس الكلمات المستمدة من البيان. لا تزال المشغلات القديمة لكل أداة —
`shiguang-gateway launch` (Claude Code) و`shiguang-gateway launch-codex` (Codex) — متاحة.

تتوفر عملية الانضمام للمزود من نفس السياق المحلي/البعيد. تحافظ الأوامر التي تركز على API أدناه على مصادقة الإدارة منفصلة عن بيانات اعتماد المزود ولا تطبع أبدًا بيانات اعتماد في الإخراج المنظم:

```bash
shiguang-gateway providers add glm --credential-env GLM_API_KEY --name work
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth openai
shiguang-gateway providers edit <connection-id> --default-model glm/glm-5.2
shiguang-gateway providers remove <connection-id> --yes
```

للسكربتات، يفضل استخدام `--credential-stdin` أو `--credential-env`؛ يتم الاحتفاظ بـ `--credential` للاستخدام المحلي المنضبط. يتطلب `providers remove` `--yes` على محطة غير تفاعلية، وتكرم جميع الأوامر الخمسة السياق النشط أو الخيارات العالمية `--base-url`/`--api-key`.

لإعداد القاعدة المكتوب يدويًا لمرة واحدة لأغنى تكاملين، انظر إلى الغوص العميق لكل أداة:

- [تكوين Claude Code](./CLAUDE-CODE-CONFIGURATION.md)
- [تكوين Codex CLI](./CODEX-CLI-CONFIGURATION.md)
- [الوضع البعيد](./REMOTE-MODE.md) — تشغيل ShiguangGateway بعيد (VPS / Tailnet) من جهاز الكمبيوتر المحمول الخاص بك
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — ملحق OmniCopilot؛ يمكنه أيضًا تشغيل هذه الأوامر `setup-*` لك من داخل المحرر

---

## جدول رئيسي

كل أمر يكرم **السياق النشط** (المحدد بواسطة `shiguang-gateway connect`، انظر
[الوضع البعيد](./REMOTE-MODE.md)) أو العلامات الصريحة `--remote <url> --api-key <key>`.
"محلي مقابل بعيد" أدناه يعني: بدون علامات، يستهدف `http://localhost:20128`؛ مع `--remote` (أو سياق بعيد نشط) يقوم بجلب الكتالوج من ذلك
الخادم ويكتب التكوين محليًا.

| الأمر                      | الأداة                      | ما يكتبه                                                                                                                                          | العلامات الرئيسية                                                                                                                          | محلي مقابل بعيد |
| -------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `shiguang-gateway setup-codex`    | OpenAI Codex CLI            | `~/.codex/<name>.config.toml` — ملف تعريف واحد لكل نموذج نص متوافق (`codex --profile <name>`)                                                     | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | كلاهما          |
| `shiguang-gateway setup-claude`   | Claude Code                 | `~/.claude/profiles/<name>/settings.json` — ملف تعريف واحد لكل نموذج متطابق (`CLAUDE_CONFIG_DIR`)                                                 | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | كلاهما          |
| `shiguang-gateway setup-opencode` | OpenCode (متوافق مع openai) | `~/.config/opencode/opencode.json` — مزود `shiguang-gateway` مع كل نموذج كتالوج (`opencode -m shiguang-gateway/<model>`)                                        | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | كلاهما          |
| `shiguang-gateway setup-cline`    | Cline                       | `~/.cline/data/{globalState,secrets}.json` (وضع CLI) + يطبع إعدادات ملحق VS Code                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | كلاهما          |
| `shiguang-gateway setup-kilo`     | Kilo Code                   | `~/.local/share/kilo/auth.json` (CLI) + يدمج `kilocode.*` في `settings.json` لـ VS Code إذا كان موجودًا                                           | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | كلاهما          |
| `shiguang-gateway setup-continue` | Continue / `cn` CLI         | `~/.continue/config.yaml` — نماذج `provider: openai`، المفتاح عبر `${{ secrets.SHIGUANG_GATEWAY_API_KEY }}`                                              | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | كلاهما          |
| `shiguang-gateway setup-cursor`   | Cursor                      | لا شيء — يطبع الخطوات داخل التطبيق (تكوين Cursor غير شفاف SQLite)                                                                                 | `--remote` `--api-key` `--only` `--port`                                                                                                   | كلاهما          |
| `shiguang-gateway setup-roo`      | Roo Code                    | `~/.shiguang-gateway/roo-settings.json` (مستند الاستيراد) + يحدد `roo-cline.autoImportSettingsPath` إذا كان هناك `settings.json` لـ VS Code              | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | كلاهما          |
| `shiguang-gateway setup-crush`    | Crush                       | `~/.config/crush/crush.json` — مزود `openai-compat`، المفتاح عبر `$SHIGUANG_GATEWAY_API_KEY`                                                             | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | كلاهما          |
| `shiguang-gateway setup-goose`    | Goose                       | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + يطبع وصفة البيئة                                                   | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | كلاهما          |
| `shiguang-gateway setup-aider`    | Aider                       | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + يطبع وصفة البيئة                                                                 | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | كلاهما          |
| `shiguang-gateway setup-qwen`     | Qwen Code                   | `~/.qwen/settings.json` — مصفوفة V4 `modelProviders.openai` + `SHIGUANG_GATEWAY_API_KEY` في `~/.qwen/.env`                                               | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | كلاهما          |
| `shiguang-gateway run <target>`   | تشغيل وقت التشغيل (عام)     | لا شيء — تشغيل `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` مع البيئة الصحيحة والمعلمات؛ تستخدم Qwen وGemini منزلًا معزولًا مؤقتًا | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | كلاهما          |
| `shiguang-gateway launch`         | Claude Code                 | لا شيء — يقوم بتشغيل `claude` مع `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` المدخلة                                                              | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | كلاهما          |
| `shiguang-gateway launch-codex`   | OpenAI Codex CLI            | لا شيء — يقوم بتشغيل `codex` مع مزود `shiguang-gateway` المدخل عبر علامات `-c`                                                                           | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | كلاهما          |

ملاحظات حول العلامات (تم التحقق منها في مصدر الأمر):

- `--remote <url>` — جلب الكتالوج من ShiguangGateway بعيد (يتجاوز `--port`
  والسياق النشط). `--api-key <key>` يوفر بيانات الاعتماد لذلك
  الخادم (يكون الافتراضي هو متغير البيئة `SHIGUANG_GATEWAY_API_KEY`، أو رمز السياق النشط).
- `--only <patterns>` — أجزاء فرعية مفصولة بفواصل؛ احتفظ فقط بمعرفات النماذج التي تتطابق
  (على سبيل المثال `--only glm,kimi`). متاحة على `setup-codex`، `setup-claude`,
  `setup-opencode`، `setup-continue`، `setup-cursor`، `setup-crush`.
- `--dry-run` — طباعة بالضبط ما سيتم كتابته دون لمس
  نظام الملفات. متاحة على كل أمر `setup-*` **باستثناء** `setup-cursor`
  (الذي لا يكتب ملفًا أبدًا).
- `--model <id>` — مطلوب (أو يتم اختياره تفاعليًا) للأدوات التي لا تمتلك
  اكتشاف نموذج تلقائي: Cline، Kilo، Roo، Goose، Qwen، Aider. تقبل تلك الأدوات أيضًا `--yes` للتشغيلات غير التفاعلية (التي تتطلب بعد ذلك `--model`).
  يأخذ `setup-opencode` `--model` لتعيين النموذج الافتراضي على المستوى الأعلى.
- `--model <id>` على `shiguang-gateway run` يتبع توصيل البيان لكل هدف
  (`bin/cli/cli-manifest.mjs`): **aider** يتلقى `--model openai/<id>` و
  **opencode** `--model shiguang-gateway/<id>` (يتم إضافة البادئة فقط عندما لا يحمل المعرف
  ذلك بالفعل)؛ **qwen** و **gemini** يتلقيان المعرف كما هو؛
  **claude** يحصل عليه عبر `ANTHROPIC_MODEL`، **goose** عبر `GOOSE_MODEL`، و
  **codex** عبر `-c model_providers.shiguang-gateway.*` args. **Qwen هو الهدف الوحيد الذي يتطلب بشدة `--model`** — `shiguang-gateway run qwen` بدونه يخرج
  `2` مع خطأ صريح.
- `--port <port>` — منفذ ShiguangGateway المحلي (الافتراضي `20128`، يتم تجاهله عند تعيين `--remote`).
  موجود على جميع `setup-*` وكلا المشغلين.
- رموز الخروج لـ `shiguang-gateway run`: يتم تمرير رمز الخروج الخاص بـ CLI الفرعي
  كما هو؛ `2` = معلمات غير صالحة (هدف غير مدعوم، نموذج مطلوب مفقود، حارس حاوية)؛ `127` = الثنائي المستهدف ليس في `PATH`؛
  `130`/`143`/`129` عندما يتم إنهاء التشغيل بواسطة `SIGINT`/`SIGTERM`/`SIGHUP`؛
  `1` = فشل آخر في تشغيل الوقت.
- تقبل المشغلان (`launch`، `launch-codex`) `--profile <name>` لاختيار
  ملف تعريف مكتوب بواسطة `setup-claude` / `setup-codex`، بالإضافة إلى تمرير المعلمات للأمر
  الثانوي `claude` / `codex` الثنائي.

المحدد التفاعلي مشترك أيضًا بواسطة وصفات الإعداد:

```bash
# اختر من كتالوج النموذج المحلي أو البعيد النشط وقم بتكوين الهدف.
shiguang-gateway configure claude
shiguang-gateway configure opencode --provider glm
shiguang-gateway configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` حاليًا يفوض إلى الوصفات المختبرة لـ `codex`، `claude`,
`opencode`، `qwen`، `aider`، `goose`، `cline`، `continue`، و `kilo`. تبقى إدخالات الكتالوج الخاصة بـ IDE فقط،
MITM، والدليل فقط تدفقات `setup-*`/يدوية واضحة وليست مقدمة كأهداف قابلة للتشغيل.

> `setup-opencode` هو تكامل OpenCode **متوافق مع openai** خفيف الوزن.
> هناك أيضًا تكامل ملحق أغنى — `shiguang-gateway setup opencode` — الذي
> يقوم بتثبيت `@shiguang-gateway/opencode-plugin`. إنهما أمران مختلفان؛ الجدول
> أعلاه يوثق `setup-opencode`.

---

## الاستخدام المحلي

مع تشغيل ShiguangGateway على `localhost:20128`، فقط قم بتشغيل أمر الإعداد لأداتك. يتم جلب الكتالوج من الخادم المحلي.

```bash
# Codex: كتابة ملف تعريف لكل نموذج متطابق في ~/.codex/
shiguang-gateway setup-codex
codex --profile glm52            # استخدم ملف تعريف تم إنشاؤه

# Claude Code: كتابة ملفات تعريف لكل نموذج، ثم إطلاق واحد
shiguang-gateway setup-claude
shiguang-gateway launch --profile glm52

# OpenCode: كتابة مزود متوافق مع openai مع جميع نماذج الكتالوج
shiguang-gateway setup-opencode
export SHIGUANG_GATEWAY_API_KEY=sk-...  # يتم الإشارة إليه عبر {env:SHIGUANG_GATEWAY_API_KEY}، أبداً على القرص
opencode -m shiguang-gateway/glm/glm-5.2 "..."

# الأدوات التي لا تحتوي على اكتشاف تلقائي تحتاج إلى نموذج صريح:
shiguang-gateway setup-aider --model glm/glm-5.2
shiguang-gateway setup-qwen --model qwen/qwen3.8-max-preview

# معاينة دون كتابة أي شيء:
shiguang-gateway setup-continue --dry-run
```

إطلاق دون كتابة أي تكوين على الإطلاق (حقن البيئة فقط):

```bash
shiguang-gateway launch                 # Claude Code → ShiguangGateway المحلي
shiguang-gateway launch-codex           # Codex CLI → ShiguangGateway المحلي
shiguang-gateway launch-codex --profile glm52
shiguang-gateway run claude --model openai/gpt-5.4
shiguang-gateway run codex --model openai/gpt-5.4 --dry-run --json
shiguang-gateway run aider --model glm/glm-5.2 -- --message "reply OK"
shiguang-gateway run goose --model glm/glm-5.2
shiguang-gateway run opencode --model glm/glm-5.2 -- run "reply OK"
shiguang-gateway run qwen --model glm/glm-5.2 -- -p "reply OK"
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# مسار الأمر الصريح: تمرير أي شيء يأتي بعد --
shiguang-gateway run claude -- --print-system-prompt "راجع هذا الفرق"
```

---

## الاستخدام عن بُعد

وجه أي أمر إعداد إلى ShiguangGateway عن بُعد مع `--remote` + `--api-key`. يتم جلب الكتالوج من البعيد؛ يتم كتابة التكوين على جهازك المحلي.

```bash
# OpenCode ضد VPS عن بُعد، احتفظ فقط بنماذج glm/kimi
shiguang-gateway setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m shiguang-gateway/glm/glm-5.2 "..."   # قم بتصدير SHIGUANG_GATEWAY_API_KEY أولاً

# ملفات تعريف Codex من كتالوج بعيد
shiguang-gateway setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# إطلاق CLI مباشرة ضد البعيد
shiguang-gateway launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
shiguang-gateway launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

بدلاً من تمرير `--remote`/`--api-key` في كل مرة، قم بتسجيل الدخول مرة واحدة ودع **السياق النشط** يزودهم تلقائيًا:

```bash
shiguang-gateway connect 192.168.0.15        # يصدر رمزًا محدد النطاق، يخزن السياق
shiguang-gateway setup-codex                 # ← الآن يستخدم الكتالوج البعيد
shiguang-gateway setup-opencode              # ← نفس الشيء
shiguang-gateway launch                      # ← Claude Code ضد البعيد
```

راجع [وضع البعد](./REMOTE-MODE.md) للسياقات، النطاقات، وإدارة الرموز.

---

## اتفاقيات عنوان URL الأساسي (التي تريد الأدوات `/v1`)

يكشف ShiguangGateway عن واجهة OpenAI عند `/v1`، وواجهة Anthropic عند الجذر، وواجهة Gemini الأصلية عند `/v1beta`. كل تكامل موصول بالشكل الذي تتوقعه أداته (تم التحقق منه في مصدر الأمر):

| التكامل                                                                    | عنوان URL الأساسي المكتوب | `/v1`؟                                   |
| -------------------------------------------------------------------------- | ------------------------- | ---------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | الجذر                     | لا — Cline يضيف `/v1/chat/completions`   |
| `setup-goose` (`OPENAI_HOST`)                                              | الجذر                     | لا — Goose يضيف المسار                   |
| `setup-aider` (`OPENAI_API_BASE`)                                          | الجذر                     | لا — LiteLLM يضيف `/v1/chat/completions` |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | مع `/v1`                  | نعم                                      |
| `setup-claude` (`ANTHROPIC_BASE_URL`)، `launch`                            | الجذر                     | لا — Claude Code يضيف `/v1/messages`     |
| `setup-codex`, `launch-codex` (`model_providers.shiguang-gateway.base_url`)       | مع `/v1`                  | نعم                                      |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | مع `/v1`                  | نعم                                      |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | الجذر                     | لا — SDK يضيف `/v1beta/models/…`         |

---

## الحفاظ على التبعيات الأصلية عند التحديث: `--include=optional`

عند التحديث باستخدام `shiguang-gateway update` (بعد التأكيد، أو مع `--apply`)، يقوم ShiguangGateway بتشغيل التثبيت مع `--include=optional` مضمن:

```bash
npm install -g shiguang-gateway@latest --include=optional
```

هذا **ليس** علمًا تمرره إلى `shiguang-gateway update` — يتم تطبيقه دائمًا بواسطة
المحدث. يضمن أن `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, مجموعة LLMLingua SLM) تبقى بعد التحديث حتى لو كانت إعدادات npm لديك
تحتوي على `omit=optional`، مما قد يؤدي إلى إسقاط برنامج تشغيل SQLite الأصلي
وربط نظام التشغيل بشكل صامت. لمعاينة الأمر الدقيق دون تطبيقه:

```bash
shiguang-gateway update --dry-run
# [DRY RUN] Would run: npm install -g shiguang-gateway@latest --include=optional
```

أعلام أخرى لـ `shiguang-gateway update` (تم التحقق منها في المصدر): `--check` (خروج 1 إذا كانت
قديمة)، `--apply` (تثبيت دون مطالبة)، `--changelog`، `--no-backup`،
`--yes`.

---

## Google Gemini CLI عبر `shiguang-gateway run gemini`

تم التحقق من العقد مقابل `@google/gemini-cli` 0.50.0: تلتزم واجهة سطر الأوامر
`GOOGLE_GEMINI_BASE_URL` وتصدر `POST /v1beta/models/<model>:generateContent`
(و `:streamGenerateContent?alt=sse`) ضدها — بالضبط واجهة ShiguangGateway الأصلية
Gemini (`/v1beta`). يقوم `shiguang-gateway run gemini` بتوصيل ذلك تلقائيًا:

- `GOOGLE_GEMINI_BASE_URL` → عنوان URL الأساسي النشط لـ ShiguangGateway (الجذر، بدون `/v1`)؛
- `GEMINI_API_KEY` → بيانات اعتماد ShiguangGateway المحلولة (خيار/بيئة/سياق)؛
- **مؤقت معزول `GEMINI_CLI_HOME`** الذي يختار `gemini-api-key` في ملف `.gemini/settings.json`
  بحيث لا تتجاوز جلسة Google OAuth المخزنة (Code Assist)
  إطلاق ShiguangGateway الموجه — يتم إزالته بعد الخروج؛
- **نظافة البيئة**: يتم تنظيف البيئة الفرعية من `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` و `GOOGLE_GENAI_USE_GCA` (التي قد تعيد توجيه
  المصادقة إلى Vertex/Code Assist)، ويتم تعيين `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key`
  كاحتياطي — تتلقى الأهداف الأخرى لـ `run` نفس المعاملة لمتغيراتها المتضاربة؛
- حقن `--model <id>` من `--provider`/`--model`.

```bash
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

لا يزال تطبيق حارس ثقة مساحة العمل في وضع الرأس الخالي — مرر
`--skip-trust` (أو ثق بالدليل تفاعليًا) بنفسك؛ لا يتجاوز المشغل ذلك عمدًا. هذا المشغل
متميز عن **تسجيل ACP** (`src/lib/acp/registry.ts`, `gemini --acp`)، الذي يبقى
تكامل بروتوكول الوكيل لـ `/dashboard/acp-agents`.

---

## تنظيف الدخان الحقيقي (اختياري)

تجري اختبارات الانحدار لخطة الإطلاق الحتمية في CI (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). للتحقق من الثنائيات الحقيقية ضد خادم
ShiguangGateway حقيقي، يوجد هيكل اختياري في
`tests/integration/upstream-cli-smoke.int.test.ts`. لا يتم تشغيله تلقائيًا
(كل اختبار فرعي يتخطى ما لم يكن `RUN_CLI_SMOKE=1`)، يمرر بيانات الاعتماد عبر متغير البيئة
NAME (وليس بالقيمة)، يحجب السلاسل على شكل مفتاح من أي مخرجات مسجلة، يتخطى
الأهداف التي لم يتم تثبيت ثنائياتها، ويصنف الفشل كـ
مصادقة / مصدر / تكوين بدلاً من قيمة منطقية بسيطة:

```bash
RUN_CLI_SMOKE=1 \
SHIGUANG_GATEWAY_SMOKE_BASE_URL="http://localhost:20128" \
SHIGUANG_GATEWAY_SMOKE_MODEL="<provider/model>" \
SHIGUANG_GATEWAY_SMOKE_API_KEY_ENV="SHIGUANG_GATEWAY_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

اختياري: `SHIGUANG_GATEWAY_SMOKE_TARGETS="codex,opencode,qwen"` يقيّد التنظيف؛
`SHIGUANG_GATEWAY_SMOKE_TIMEOUT_MS` يتجاوز مهلة 120 ثانية لكل هدف.

---

## انظر أيضًا

- [تكوين كود كلود](./CLAUDE-CODE-CONFIGURATION.md) — الدليل الأعمق لكود كلود
- [تكوين واجهة سطر الأوامر لكودكس](./CODEX-CLI-CONFIGURATION.md) — الإعداد الأساسي لمرة واحدة `[model_providers.shiguang-gateway]`
- [الوضع البعيد](./REMOTE-MODE.md) — السياقات، رموز الوصول المحدودة، تشغيل خادم بعيد
- [مرجع أدوات سطر الأوامر](../reference/CLI-TOOLS.md) — الكتالوج الكامل للأدوات المدعومة + صفحات لوحة التحكم
- [دليل الإعداد](./SETUP_GUIDE.md) — طرق التثبيت والتوجيه عند التشغيل الأول
