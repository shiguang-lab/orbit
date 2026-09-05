# CLI-INTEGRATIONS (עברית)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇭 [th](../../../th/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "אינטגרציות CLI — הפנה כל CLI קוד ל-ShiguangGateway"
version: 3.8.50
lastUpdated: 2026-08-18
---

# אינטגרציות CLI

ShiguangGateway מספקת משפחה של פקודות `setup-*` שמגדירות CLI קוד (Codex, Claude Code, OpenCode, Cline, …) להשתמש ב-ShiguangGateway כ-backend שלה — כך שהכלי מדבר עם **נקודת קצה אחת** ו-ShiguangGateway מנתבת לספק הנכון עם חזרה אוטומטית. כל פקודה קוראת את הקטלוג של המודל **החי** מ-ShiguangGateway פועל (מקומי או מרוחק) וכותבת את קובץ הקונפיגורציה של הכלי על **המחשב שלך**. מפתח ה-API מתייחס על ידי משתנה סביבה בכל מקום שהכלי תומך בו. פקודות ששומרות קובץ סביבה מקומי של הכלי מצוינות למטה.

יש גם מפעיל כללי — `shiguang-gateway run <target>` — שמפעיל `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` או `gemini` עם הסביבה הנכונה מוזרקת, מבלי לכתוב שום קונפיגורציה בכלל. היעדים והכינויים שלהם מגיעים מהמניפסט הקנוני `bin/cli/cli-manifest.mjs`
(`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`,
`open-code`, `qwen-code`, `gemini-cli`), ו-`shiguang-gateway completion` מציע את
אותן מילים נגזרות מהמניפסט. המפעילים הישנים לכל כלי —
`shiguang-gateway launch` (Claude Code) ו-`shiguang-gateway launch-codex` (Codex) — נשארים
זמינים.

הכנסת ספקים זמינה מאותו הקשר מקומי/מרוחק. הפקודות API-first למטה שומרות על אימות ניהול בנפרד מהאישורים של הספקים ואינן מדפיסות אישור בפלט מובנה:

```bash
shiguang-gateway providers add glm --credential-env GLM_API_KEY --name work
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth openai
shiguang-gateway providers edit <connection-id> --default-model glm/glm-5.2
shiguang-gateway providers remove <connection-id> --yes
```

לסקריפטים, העדיף `--credential-stdin` או `--credential-env`; `--credential`
נשמר לשימוש מקומי מבוקר. `providers remove` דורש `--yes` בטרמינל שאינו אינטראקטיבי, וכל חמש הפקודות מכבדות את ההקשר הפעיל או את האפשרויות הגלובליות `--base-url`/`--api-key`.

להגדרה חד פעמית, כתובה ביד של שתי האינטגרציות העשירות ביותר, ראה את
העומק של כל כלי:

- [הגדרת Claude Code](./CLAUDE-CODE-CONFIGURATION.md)
- [הגדרת Codex CLI](./CODEX-CLI-CONFIGURATION.md)
- [מצב מרוחק](./REMOTE-MODE.md) — הפעל ShiguangGateway מרוחק (VPS / Tailnet) מהמחשב הנייד שלך
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — תוסף OmniCopilot; הוא יכול גם להריץ את הפקודות
  `setup-*` עבורך מתוך העורך

---

## טבלת מאסטר

כל פקודה מכבדת את **ההקשר הפעיל** (מוגדר עם `shiguang-gateway connect`, ראה
[מצב מרוחק](./REMOTE-MODE.md)) או את הדגלים המפורשים `--remote <url> --api-key <key>`.
"מקומי מול מרוחק" למטה פירושו: ללא דגלים זה מכוון ל-`http://localhost:20128`;
עם `--remote` (או הקשר מרוחק פעיל) זה שולף את הקטלוג מהשרת ההוא וכותב את הקונפיגורציה מקומית.

| פקודה                      | כלי                      | מה היא כותבת                                                                                                                                  | דגלים מרכזיים                                                                                                                              | מקומי מול מרוחק |
| -------------------------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `shiguang-gateway setup-codex`    | OpenAI Codex CLI         | `~/.codex/<name>.config.toml` — פרופיל אחד לכל מודל טקסט תואם (`codex --profile <name>`)                                                      | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | שניהם           |
| `shiguang-gateway setup-claude`   | Claude Code              | `~/.claude/profiles/<name>/settings.json` — פרופיל אחד לכל מודל תואם (`CLAUDE_CONFIG_DIR`)                                                    | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | שניהם           |
| `shiguang-gateway setup-opencode` | OpenCode (תואם ל-openai) | `~/.config/opencode/opencode.json` — ספק `shiguang-gateway` עם כל מודל בקטלוג (`opencode -m shiguang-gateway/<model>`)                                      | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | שניהם           |
| `shiguang-gateway setup-cline`    | Cline                    | `~/.cline/data/{globalState,secrets}.json` (מצב CLI) + מדפיס הגדרות תוסף VS Code                                                              | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | שניהם           |
| `shiguang-gateway setup-kilo`     | Kilo Code                | `~/.local/share/kilo/auth.json` (CLI) + ממזג `kilocode.*` לתוך `settings.json` של VS Code אם קיים                                             | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | שניהם           |
| `shiguang-gateway setup-continue` | Continue / `cn` CLI      | `~/.continue/config.yaml` — מודלים `provider: openai`, מפתח דרך `${{ secrets.SHIGUANG_GATEWAY_API_KEY }}`                                            | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | שניהם           |
| `shiguang-gateway setup-cursor`   | Cursor                   | כלום — מדפיס את הצעדים באפליקציה (הגדרת Cursor היא SQLite אטומה)                                                                              | `--remote` `--api-key` `--only` `--port`                                                                                                   | שניהם           |
| `shiguang-gateway setup-roo`      | Roo Code                 | `~/.shiguang-gateway/roo-settings.json` (מסמך ייבוא) + קובע `roo-cline.autoImportSettingsPath` אם קיים `settings.json` של VS Code                    | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | שניהם           |
| `shiguang-gateway setup-crush`    | Crush                    | `~/.config/crush/crush.json` — ספק תואם ל-openai, מפתח דרך `$SHIGUANG_GATEWAY_API_KEY`                                                               | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | שניהם           |
| `shiguang-gateway setup-goose`    | Goose                    | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + מדפיס מתכון סביבה                                              | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | שניהם           |
| `shiguang-gateway setup-aider`    | Aider                    | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + מדפיס מתכון סביבה                                                            | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | שניהם           |
| `shiguang-gateway setup-qwen`     | Qwen Code                | `~/.qwen/settings.json` — מערך `modelProviders.openai` V4 + `SHIGUANG_GATEWAY_API_KEY` ב-`~/.qwen/.env`                                              | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | שניהם           |
| `shiguang-gateway run <target>`   | הפעלת זמן ריצה (כללית)   | כלום — מפעיל `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` עם הסביבה והארגומנטים הנכונים; Qwen ו-Gemini משתמשים בבית מבודד זמני | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | שניהם           |
| `shiguang-gateway launch`         | Claude Code              | כלום — מפעיל `claude` עם `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` מוזרקים                                                                  | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | שניהם           |
| `shiguang-gateway launch-codex`   | OpenAI Codex CLI         | כלום — מפעיל `codex` עם ספק `shiguang-gateway` מוזרק דרך דגלי `-c`                                                                                   | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | שניהם           |

הערות על דגלים (מאומתים במקור הפקודה):

- `--remote <url>` — שולף את הקטלוג מ-ShiguangGateway מרוחק (מחליף את `--port`
  ואת ההקשר הפעיל). `--api-key <key>` מספק את האישור עבור השרת
  (ברירת מחדל היא משתנה הסביבה `SHIGUANG_GATEWAY_API_KEY`, או הטוקן של ההקשר הפעיל).
- `--only <patterns>` — תתי מחרוזות מופרדות בפסיקים; שומר רק על מזהי המודלים שמתאימים
  (למשל `--only glm,kimi`). זמינה על `setup-codex`, `setup-claude`,
  `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`.
- `--dry-run` — מדפיס בדיוק מה ייכתב מבלי לגעת ב
  מערכת הקבצים. זמינה על כל פקודות `setup-*` **מלבד** `setup-cursor`
  (שלעולם אינה כותבת קובץ).
- `--model <id>` — דרוש (או נבחר אינטראקטיבית) עבור הכלים שאין להם
  גילוי אוטומטי של מודלים: Cline, Kilo, Roo, Goose, Qwen, Aider. כלים אלה
  גם מקבלים `--yes` עבור ריצות לא אינטראקטיביות (שאז דורשות `--model`).
  `setup-opencode` לוקחת `--model` כדי לקבוע את המודל העליון ברירת המחדל.
- `--model <id>` על `shiguang-gateway run` עוקבת אחרי החיווט לפי המניפסט
  (`bin/cli/cli-manifest.mjs`): **aider** מקבלת `--model openai/<id>` ו
  **opencode** `--model shiguang-gateway/<id>` (הקידומת מתווספת רק כאשר ה-id
  אינו נושא אותה כבר); **qwen** ו**gemini** מקבלות את ה-id כפי שהוא;
  **claude** מקבלת אותו דרך `ANTHROPIC_MODEL`, **goose** דרך `GOOSE_MODEL`, ו
  **codex** דרך `-c model_providers.shiguang-gateway.*` args. **Qwen הוא היעד היחיד
  שדורש באופן מוחלט `--model`** — `shiguang-gateway run qwen` בלעדיו יוצא
  `2` עם שגיאה מפורשת.
- `--port <port>` — פורט ShiguangGateway מקומי (ברירת מחדל `20128`, מתעלם כאשר `--remote`
  מוגדר). נוכח על כל `setup-*` ועל שני המפעילים.
- קודי יציאה של `shiguang-gateway run`: קוד היציאה של ה-CLI הילד מועבר
  כפי שהוא; `2` = ארגומנטים לא חוקיים (יעד לא נתמך, חסר `--model` נדרש,
  שמירה על מיכל); `127` = הבינארי של היעד אינו ב-`PATH`;
  `130`/`143`/`129` כאשר ההפעלה מסתיימת על ידי `SIGINT`/`SIGTERM`/`SIGHUP`;
  `1` = כישלון אחר בהפעלה.
- שני המפעילים (`launch`, `launch-codex`) מקבלים `--profile <name>` כדי לבחור
  פרופיל שנכתב על ידי `setup-claude` / `setup-codex`, בנוסף לארגומנטים להעברה עבור
  הבינארי הבסיסי `claude` / `codex`.

הבוחר האינטראקטיבי משותף גם למתכוני ההגדרה:

```bash
# בחר מתוך הקטלוג המקומי או המרוחק הפעיל והגדר את היעד.
shiguang-gateway configure claude
shiguang-gateway configure opencode --provider glm
shiguang-gateway configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` כרגע מפנה למתכונים שנבדקו עבור `codex`, `claude`,
`opencode`, `qwen`, `aider`, `goose`, `cline`, `continue`, ו`kilo`. רשומות קטלוג
שמיועדות רק ל-IDE, MITM, ומדריך נשארות זרימות `setup-*`/ידניות מפורשות ואינן מוצגות
כיעדים שניתן להפעיל.

> `setup-opencode` היא האינטגרציה **הקלה התואמת ל-openai** של OpenCode.
> יש גם אינטגרציה עשירה יותר של תוסף — `shiguang-gateway setup opencode` — שמתקינה
> `@shiguang-gateway/opencode-plugin`. אלו פקודות שונות; הטבלה
> למעלה מתעדת את `setup-opencode`.

---

## שימוש מקומי

עם ShiguangGateway פועל על `localhost:20128`, פשוט הרץ את פקודת ההגדרה עבור הכלי שלך. הקטלוג נמשך מהשרת המקומי.

```bash
# Codex: כתוב פרופיל עבור מודל תואם לתוך ~/.codex/
shiguang-gateway setup-codex
codex --profile glm52            # השתמש בפרופיל שנוצר

# Claude Code: כתוב פרופילים לפי מודל, ואז השק את אחד
shiguang-gateway setup-claude
shiguang-gateway launch --profile glm52

# OpenCode: כתוב את הספק התואם ל-openai עם כל מודלי הקטלוג
shiguang-gateway setup-opencode
export SHIGUANG_GATEWAY_API_KEY=sk-...  # מתייחס דרך {env:SHIGUANG_GATEWAY_API_KEY}, אף פעם לא על דיסק
opencode -m shiguang-gateway/glm/glm-5.2 "..."

# כלים ללא גילוי אוטומטי זקוקים למודל מפורש:
shiguang-gateway setup-aider --model glm/glm-5.2
shiguang-gateway setup-qwen --model qwen/qwen3.8-max-preview

# תצוגה מקדימה ללא כתיבה של שום דבר:
shiguang-gateway setup-continue --dry-run
```

השק ללא כתיבה של שום קונפיגורציה בכלל (הזרקת env בלבד):

```bash
shiguang-gateway launch                 # Claude Code → ShiguangGateway המקומי
shiguang-gateway launch-codex           # Codex CLI → ShiguangGateway המקומי
shiguang-gateway launch-codex --profile glm52
shiguang-gateway run claude --model openai/gpt-5.4
shiguang-gateway run codex --model openai/gpt-5.4 --dry-run --json
shiguang-gateway run aider --model glm/glm-5.2 -- --message "reply OK"
shiguang-gateway run goose --model glm/glm-5.2
shiguang-gateway run opencode --model glm/glm-5.2 -- run "reply OK"
shiguang-gateway run qwen --model glm/glm-5.2 -- -p "reply OK"
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# נתיב פקודה מפורש: העבר כל מה שבא אחרי --
shiguang-gateway run claude -- --print-system-prompt "review this diff"
```

---

## שימוש מרחוק

כוון כל פקודת הגדרה ל-ShiguangGateway מרחוק עם `--remote` + `--api-key`. הקטלוג נמשך מהמרחוק; הקונפיגורציה נכתבת במחשב המקומי שלך.

```bash
# OpenCode נגד VPS מרחוק, שמור רק מודלים glm/kimi
shiguang-gateway setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m shiguang-gateway/glm/glm-5.2 "..."   # ייצא קודם את SHIGUANG_GATEWAY_API_KEY

# פרופילי Codex מקטלוג מרחוק
shiguang-gateway setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# השקת CLI ישירות נגד המרחק
shiguang-gateway launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
shiguang-gateway launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

במקום להעביר `--remote`/`--api-key` בכל פעם, התחבר פעם אחת ותן ל
**הקשר הפעיל** לספק אותם אוטומטית:

```bash
shiguang-gateway connect 192.168.0.15        # מייצר טוקן עם טווח, שומר את ההקשר
shiguang-gateway setup-codex                 # ← עכשיו משתמש בקטלוג המרוחק
shiguang-gateway setup-opencode              # ← אותו דבר
shiguang-gateway launch                      # ← Claude Code נגד המרוחק
```

ראה [מצב מרוחק](./REMOTE-MODE.md) עבור הקשרים, טווחים, וניהול טוקנים.

---

## מסורות URL בסיסיות (אילו כלים רוצים `/v1`)

ShiguangGateway מציע את הממשק של OpenAI ב-`/v1`, את הממשק של Anthropic בשורש,
ואת הממשק של Gemini ב-`/v1beta`. כל אינטגרציה מחוברת לצורתה
שהכלי מצפה (מאומת במקור הפקודה):

| אינטגרציה                                                                  | URL בסיסי שנכתב | `/v1`?                                    |
| -------------------------------------------------------------------------- | --------------- | ----------------------------------------- |
| `setup-cline` (`openAiBaseUrl`)                                            | שורש            | לא — Cline מוסיף `/v1/chat/completions`   |
| `setup-goose` (`OPENAI_HOST`)                                              | שורש            | לא — Goose מוסיף את הנתיב                 |
| `setup-aider` (`OPENAI_API_BASE`)                                          | שורש            | לא — LiteLLM מוסיף `/v1/chat/completions` |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | עם `/v1`        | כן                                        |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | שורש            | לא — Claude Code מוסיף `/v1/messages`     |
| `setup-codex`, `launch-codex` (`model_providers.shiguang-gateway.base_url`)       | עם `/v1`        | כן                                        |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | עם `/v1`        | כן                                        |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | שורש            | לא — ה-SDK מוסיף `/v1beta/models/…`       |

---

## שמירה על תלותים מקומיים בעדכון: `--include=optional`

כאשר אתה מעדכן עם `shiguang-gateway update` (לאחר אישור, או עם `--apply`),
ShiguangGateway מריץ את ההתקנה עם `--include=optional` כלול:

```bash
npm install -g shiguang-gateway@latest --include=optional
```

זה **לא** דגל שאתה מעביר ל`shiguang-gateway update` — הוא תמיד מוחל על ידי
המעדכן. זה מבטיח שה`optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, ערכת LLMLingua SLM) שורדות את העדכון גם אם הגדרות ה-npm שלך
מכילות `omit=optional`, מה שהיה אחרת משאיר בשקט את מנהל ההתקנה SQLite
המקומי ואת חיבור ה-OS-keyring. כדי להציג את הפקודה המדויקת מבלי להחיל:

```bash
shiguang-gateway update --dry-run
# [DRY RUN] Would run: npm install -g shiguang-gateway@latest --include=optional
```

דגלים אחרים של `shiguang-gateway update` (מאומתים במקור): `--check` (יוצא 1 אם
מעודכן), `--apply` (מתקין מבלי לבקש אישור), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI דרך `shiguang-gateway run gemini`

החוזה מאומת מול `@google/gemini-cli` 0.50.0: ה-CLI מכבד את
`GOOGLE_GEMINI_BASE_URL` ומנפיק `POST /v1beta/models/<model>:generateContent`
(וגם `:streamGenerateContent?alt=sse`) נגדו — בדיוק כמו הממשק המקומי של ShiguangGateway
(`/v1beta`). `shiguang-gateway run gemini` מחבר את זה אוטומטית:

- `GOOGLE_GEMINI_BASE_URL` → ה-URL הבסיסי הפעיל של ShiguangGateway (שורש, ללא `/v1`);
- `GEMINI_API_KEY` → האישור שנפתר של ShiguangGateway (אפשרות/סביבה/הקשר);
- **`GEMINI_CLI_HOME` מבודד זמני** שבו `.gemini/settings.json`
  בוחר באימות `gemini-api-key`, כך שסשן OAuth של Google מאוחסן (Code Assist)
  לא יחליף את ההשקה המנוהלת על ידי ShiguangGateway — נמחק לאחר היציאה;
- **היגיינת סביבה**: הסביבה של הילד מנוקה מ`GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` ו`GOOGLE_GENAI_USE_GCA` (שיכוונו את
  האימות ל-Vortex/Code Assist), ו`GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key` מוגדר
  כהגנה נוספת — שאר היעדים של `run` מקבלים את אותו טיפול עבור המשתנים המנוגדים שלהם;
- הזרקת `--model <id>` מ`--provider`/`--model`.

```bash
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

שומר האמון של Gemini עדיין חל במצב ללא ראש — העבר
`--skip-trust` (או סמוך על התיקייה באופן אינטראקטיבי) בעצמך; המפעיל
בכוונה לא עוקף את זה. מפעיל זה שונה מ**הרישום ACP**
(`src/lib/acp/registry.ts`, `gemini --acp`), אשר נשאר האינטגרציה של פרוטוקול הסוכן עבור `/dashboard/acp-agents`.

---

## סוויפ עשן אמיתי (אופציה)

הרצת תכנית השקה דטרמיניסטית מתבצעת ב-CI (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). כדי לאמת את הבינארים האמיתיים מול שרת
ShiguangGateway אמיתי, קיים מנגנון אופציה ב
`tests/integration/upstream-cli-smoke.int.test.ts`. הוא אף פעם לא רץ אוטומטית
(כל תת-מבחן מדלג אלא אם `RUN_CLI_SMOKE=1`), מעביר את האישור דרך משתנה סביבה
NAME (לעולם לא לפי ערך), מסנן מחרוזות בצורת מפתח מכל פלט מוקלט, מדלג
על יעדים שהבינארי שלהם לא מותקן, ומסווג כישלונות כ
אימות / עליון / הגדרה במקום בוליאני פשוט:

```bash
RUN_CLI_SMOKE=1 \
SHIGUANG_GATEWAY_SMOKE_BASE_URL="http://localhost:20128" \
SHIGUANG_GATEWAY_SMOKE_MODEL="<provider/model>" \
SHIGUANG_GATEWAY_SMOKE_API_KEY_ENV="SHIGUANG_GATEWAY_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

אופציונלי: `SHIGUANG_GATEWAY_SMOKE_TARGETS="codex,opencode,qwen"` מגביל את הסוויפ;
`SHIGUANG_GATEWAY_SMOKE_TIMEOUT_MS` עוקף את מגבלת הזמן של 120 שניות לכל יעד.

## ראה גם

- [הגדרת קוד קלוד](./CLAUDE-CODE-CONFIGURATION.md) — המדריך העמוק יותר לקוד קלוד
- [הגדרת CLI של קודקס](./CODEX-CLI-CONFIGURATION.md) — ההגדרה הבסיסית של `[model_providers.shiguang-gateway]` פעם אחת
- [מצב מרוחק](./REMOTE-MODE.md) — הקשרים, אסימוני גישה עם טווח, הפעלת שרת מרוחק
- [הפניה לכלי CLI](../reference/CLI-TOOLS.md) — הקטלוג המלא של כלים נתמכים + דפי לוח מחוונים
- [מדריך התקנה](./SETUP_GUIDE.md) — שיטות התקנה והדרכה לריצה ראשונה
