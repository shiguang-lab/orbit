# CLI-INTEGRATIONS (ไทย)

🌐 **Languages:** 🇺🇸 [English](../../../../guides/CLI-INTEGRATIONS.md) · 🇸🇦 [ar](../../../ar/docs/guides/CLI-INTEGRATIONS.md) · 🇦🇿 [az](../../../az/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇬 [bg](../../../bg/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇩 [bn](../../../bn/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇿 [cs](../../../cs/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇰 [da](../../../da/docs/guides/CLI-INTEGRATIONS.md) · 🇩🇪 [de](../../../de/docs/guides/CLI-INTEGRATIONS.md) · 🇪🇸 [es](../../../es/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇷 [fa](../../../fa/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇮 [fi](../../../fi/docs/guides/CLI-INTEGRATIONS.md) · 🇫🇷 [fr](../../../fr/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [gu](../../../gu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇱 [he](../../../he/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [hi](../../../hi/docs/guides/CLI-INTEGRATIONS.md) · 🇭🇺 [hu](../../../hu/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [id](../../../id/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇩 [in](../../../in/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇹 [it](../../../it/docs/guides/CLI-INTEGRATIONS.md) · 🇯🇵 [ja](../../../ja/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇷 [ko](../../../ko/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [mr](../../../mr/docs/guides/CLI-INTEGRATIONS.md) · 🇲🇾 [ms](../../../ms/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇱 [nl](../../../nl/docs/guides/CLI-INTEGRATIONS.md) · 🇳🇴 [no](../../../no/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇭 [phi](../../../phi/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇱 [pl](../../../pl/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇹 [pt](../../../pt/docs/guides/CLI-INTEGRATIONS.md) · 🇧🇷 [pt-BR](../../../pt-BR/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇴 [ro](../../../ro/docs/guides/CLI-INTEGRATIONS.md) · 🇷🇺 [ru](../../../ru/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇰 [sk](../../../sk/docs/guides/CLI-INTEGRATIONS.md) · 🇸🇪 [sv](../../../sv/docs/guides/CLI-INTEGRATIONS.md) · 🇰🇪 [sw](../../../sw/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [ta](../../../ta/docs/guides/CLI-INTEGRATIONS.md) · 🇮🇳 [te](../../../te/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇷 [tr](../../../tr/docs/guides/CLI-INTEGRATIONS.md) · 🇺🇦 [uk-UA](../../../uk-UA/docs/guides/CLI-INTEGRATIONS.md) · 🇵🇰 [ur](../../../ur/docs/guides/CLI-INTEGRATIONS.md) · 🇻🇳 [vi](../../../vi/docs/guides/CLI-INTEGRATIONS.md) · 🇨🇳 [zh-CN](../../../zh-CN/docs/guides/CLI-INTEGRATIONS.md) · 🇹🇼 [zh-TW](../../../zh-TW/docs/guides/CLI-INTEGRATIONS.md)

---

---

title: "CLI Integrations — point any coding CLI at ShiguangGateway"
version: 3.8.50
lastUpdated: 2026-08-18
---

# CLI Integrations

ShiguangGateway มีคำสั่ง `setup-*` ที่ใช้ในการกำหนดค่า CLI สำหรับการเขียนโค้ด (Codex, Claude Code, OpenCode, Cline, …) เพื่อใช้ ShiguangGateway เป็น backend — ดังนั้นเครื่องมือจึงติดต่อกับ **หนึ่ง** endpoint และ ShiguangGateway จะทำการส่งต่อไปยังผู้ให้บริการที่ถูกต้องพร้อมการสำรองอัตโนมัติ คำสั่งแต่ละคำสั่งจะอ่านแคตตาล็อกโมเดล **สด** จาก ShiguangGateway ที่กำลังทำงาน (ท้องถิ่นหรือระยะไกล) และเขียนไฟล์การกำหนดค่าของเครื่องมือเองลงใน **เครื่องของคุณ** คีย์ API จะถูกอ้างอิงโดยตัวแปรสภาพแวดล้อมที่เครื่องมือรองรับ คำสั่งที่เก็บไฟล์สภาพแวดล้อมเฉพาะเครื่องมือจะถูกบันทึกไว้ด้านล่าง

นอกจากนี้ยังมีตัวเรียกใช้ทั่วไป — `shiguang-gateway run <target>` — ที่สร้าง `claude`, `codex`, `aider`, `goose`, `opencode`, `qwen` หรือ `gemini` พร้อมกับ env ที่ถูกฉีดเข้าไป โดยไม่ต้องเขียนการกำหนดค่าใด ๆ เป้าหมายและชื่อเล่นของพวกเขามาจากเอกสารที่เป็นมาตรฐาน `bin/cli/cli-manifest.mjs` (`claude-code|cc|anthropic`, `codex-cli|openai-codex|openai`, `goose-cli`, `open-code`, `qwen-code`, `gemini-cli`), และ `shiguang-gateway completion` จะเสนอคำที่ได้จากเอกสารเดียวกัน คำสั่งเรียกใช้แบบเก่าต่อเครื่องมือ — `shiguang-gateway launch` (Claude Code) และ `shiguang-gateway launch-codex` (Codex) — ยังคงมีให้ใช้งาน

การลงทะเบียนผู้ให้บริการสามารถทำได้จากบริบทท้องถิ่น/ระยะไกลเดียวกัน คำสั่ง API-first ด้านล่างนี้จะเก็บการตรวจสอบการจัดการแยกจากข้อมูลประจำตัวของผู้ให้บริการและไม่เคยพิมพ์ข้อมูลประจำตัวในผลลัพธ์ที่มีโครงสร้าง:

```bash
shiguang-gateway providers add glm --credential-env GLM_API_KEY --name work
shiguang-gateway providers import ./providers.json --dry-run --json
shiguang-gateway providers auth openai
shiguang-gateway providers edit <connection-id> --default-model glm/glm-5.2
shiguang-gateway providers remove <connection-id> --yes
```

สำหรับสคริปต์ ให้ใช้ `--credential-stdin` หรือ `--credential-env`; `--credential` จะถูกเก็บไว้สำหรับการใช้งานในท้องถิ่นที่ควบคุม `providers remove` ต้องการ `--yes` ในเทอร์มินัลที่ไม่โต้ตอบ และคำสั่งทั้งห้าจะเคารพบริบทที่ใช้งานอยู่หรือทางเลือก `--base-url`/`--api-key` ทั่วไป

สำหรับการตั้งค่าเบื้องต้นแบบเขียนด้วยมือครั้งเดียวของการรวมที่ร่ำรวยที่สุดสองรายการ ให้ดูการเจาะลึกเฉพาะเครื่องมือ:

- [การกำหนดค่า Claude Code](./CLAUDE-CODE-CONFIGURATION.md)
- [การกำหนดค่า Codex CLI](./CODEX-CLI-CONFIGURATION.md)
- [โหมดระยะไกล](./REMOTE-MODE.md) — ขับ ShiguangGateway ระยะไกล (VPS / Tailnet) จากแล็ปท็อปของคุณ
- [VS Code Copilot Chat](./VSCODE-COPILOT.md) — ส่วนขยาย OmniCopilot; มันยังสามารถเรียกใช้คำสั่ง `setup-*` เหล่านี้ให้คุณจากภายในตัวแก้ไข

---

## Master table

ทุกคำสั่งจะเคารพ **บริบทที่ใช้งานอยู่** (ตั้งค่าด้วย `shiguang-gateway connect`, ดู [โหมดระยะไกล](./REMOTE-MODE.md)) หรือธง `--remote <url> --api-key <key>` ที่ชัดเจน "ท้องถิ่นกับระยะไกล" ด้านล่างหมายถึง: โดยไม่มีธงมันจะมุ่งเป้าไปที่ `http://localhost:20128`; ด้วย `--remote` (หรือบริบทระยะไกลที่ใช้งานอยู่) มันจะดึงแคตตาล็อกจากเซิร์ฟเวอร์นั้นและเขียนการกำหนดค่าในท้องถิ่น

| Command                    | Tool                         | What it writes                                                                                                                                       | Key flags                                                                                                                                  | Local vs remote |
| -------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | --------------- |
| `shiguang-gateway setup-codex`    | OpenAI Codex CLI             | `~/.codex/<name>.config.toml` — โปรไฟล์หนึ่งต่อโมเดลข้อความที่เข้ากันได้ (`codex --profile <name>`)                                                  | `--remote` `--api-key` `--only` `--dry-run` `--port` `--codex-home`                                                                        | Both            |
| `shiguang-gateway setup-claude`   | Claude Code                  | `~/.claude/profiles/<name>/settings.json` — โปรไฟล์หนึ่งต่อโมเดลที่ตรงกัน (`CLAUDE_CONFIG_DIR`)                                                      | `--remote` `--api-key` `--only` `--dry-run` `--port` `--claude-home`                                                                       | Both            |
| `shiguang-gateway setup-opencode` | OpenCode (openai-compatible) | `~/.config/opencode/opencode.json` — ผู้ให้บริการ `shiguang-gateway` พร้อมโมเดลทุกตัวในแคตตาล็อก (`opencode -m shiguang-gateway/<model>`)                          | `--remote` `--api-key` `--only` `--model` `--dry-run` `--port`                                                                             | Both            |
| `shiguang-gateway setup-cline`    | Cline                        | `~/.cline/data/{globalState,secrets}.json` (โหมด CLI) + พิมพ์การตั้งค่าขยาย VS Code                                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--cline-dir`                                                                | Both            |
| `shiguang-gateway setup-kilo`     | Kilo Code                    | `~/.local/share/kilo/auth.json` (CLI) + รวม `kilocode.*` ลงใน `settings.json` ของ VS Code หากมีอยู่                                                  | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--auth-path` `--vscode-settings`                                            | Both            |
| `shiguang-gateway setup-continue` | Continue / `cn` CLI          | `~/.continue/config.yaml` — โมเดล `provider: openai` คีย์ผ่าน `${{ secrets.SHIGUANG_GATEWAY_API_KEY }}`                                                     | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Both            |
| `shiguang-gateway setup-cursor`   | Cursor                       | ไม่มีอะไร — พิมพ์ขั้นตอนในแอป (การกำหนดค่าของ Cursor เป็น SQLite ที่ไม่โปร่งใส)                                                                      | `--remote` `--api-key` `--only` `--port`                                                                                                   | Both            |
| `shiguang-gateway setup-roo`      | Roo Code                     | `~/.shiguang-gateway/roo-settings.json` (เอกสารนำเข้า) + ตั้งค่า `roo-cline.autoImportSettingsPath` หากมี `settings.json` ของ VS Code                       | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--import-path` `--vscode-settings`                                          | Both            |
| `shiguang-gateway setup-crush`    | Crush                        | `~/.config/crush/crush.json` — ผู้ให้บริการ `openai-compat` คีย์ผ่าน `$SHIGUANG_GATEWAY_API_KEY`                                                            | `--remote` `--api-key` `--only` `--dry-run` `--port` `--config-path`                                                                       | Both            |
| `shiguang-gateway setup-goose`    | Goose                        | `~/.config/goose/config.yaml` (`GOOSE_PROVIDER`/`OPENAI_HOST`/`GOOSE_MODEL`) + พิมพ์สูตร env                                                         | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Both            |
| `shiguang-gateway setup-aider`    | Aider                        | `~/.aider.conf.yml` (`openai-api-base` + `model: openai/<id>`) + พิมพ์สูตร env                                                                       | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path`                                                              | Both            |
| `shiguang-gateway setup-qwen`     | Qwen Code                    | `~/.qwen/settings.json` — อาร์เรย์ `V4 modelProviders.openai` + `SHIGUANG_GATEWAY_API_KEY` ใน `~/.qwen/.env`                                                | `--remote` `--api-key` `--model` `--yes` `--dry-run` `--port` `--config-path` `--env-path`                                                 | Both            |
| `shiguang-gateway run <target>`   | Runtime launch (generic)     | ไม่มีอะไร — สร้าง `claude`/`codex`/`aider`/`goose`/`opencode`/`qwen`/`gemini` พร้อม env และ args ที่ถูกต้อง; Qwen และ Gemini ใช้โฮมชั่วคราวที่แยกออก | `--remote` `--base-url` `--context` `--provider` `--model` `--api-key` `--api-key-env` `--dry-run` `--json` `--port` `--profile` `--token` | Both            |
| `shiguang-gateway launch`         | Claude Code                  | ไม่มีอะไร — สร้าง `claude` พร้อมกับ `ANTHROPIC_BASE_URL`/`ANTHROPIC_AUTH_TOKEN` ที่ถูกฉีดเข้าไป                                                      | `--remote` `--api-key` `--token` `--profile` `--port`                                                                                      | Both            |
| `shiguang-gateway launch-codex`   | OpenAI Codex CLI             | ไม่มีอะไร — สร้าง `codex` พร้อมกับผู้ให้บริการ `shiguang-gateway` ที่ถูกฉีดผ่านธง `-c`                                                                      | `--remote` `--api-key` `--profile` (`-p`) `--port`                                                                                         | Both            |

หมายเหตุเกี่ยวกับธง (ตรวจสอบในแหล่งที่มาของคำสั่ง):

- `--remote <url>` — ดึงแคตตาล็อกจาก ShiguangGateway ระยะไกล (เขียนทับ `--port` และบริบทที่ใช้งานอยู่) `--api-key <key>` จะจัดเตรียมข้อมูลประจำตัวสำหรับเซิร์ฟเวอร์นั้น (ค่าเริ่มต้นคือ `SHIGUANG_GATEWAY_API_KEY` env var หรือโทเค็นของบริบทที่ใช้งานอยู่)
- `--only <patterns>` — สตริงที่คั่นด้วยเครื่องหมายจุลภาค; เก็บเฉพาะ ID โมเดลที่ตรงกัน (เช่น `--only glm,kimi`) ใช้งานได้กับ `setup-codex`, `setup-claude`, `setup-opencode`, `setup-continue`, `setup-cursor`, `setup-crush`
- `--dry-run` — พิมพ์สิ่งที่จะแสดงออกมาโดยไม่แตะต้องระบบไฟล์ ใช้งานได้กับทุกคำสั่ง `setup-*` **ยกเว้น** `setup-cursor` (ซึ่งไม่เคยเขียนไฟล์)
- `--model <id>` — จำเป็น (หรือเลือกแบบโต้ตอบ) สำหรับเครื่องมือที่ไม่มีการค้นหาโมเดลอัตโนมัติ: Cline, Kilo, Roo, Goose, Qwen, Aider เครื่องมือเหล่านั้นยังรับ `--yes` สำหรับการทำงานแบบไม่โต้ตอบ (ซึ่งจะต้องการ `--model`) `setup-opencode` ใช้ `--model` เพื่อตั้งค่าโมเดลระดับบนสุดเริ่มต้น
- `--model <id>` บน `shiguang-gateway run` จะปฏิบัติตามการเชื่อมต่อเฉพาะเป้าหมายในเอกสาร (`bin/cli/cli-manifest.mjs`): **aider** จะได้รับ `--model openai/<id>` และ **opencode** `--model shiguang-gateway/<id>` (คำนำหน้าจะถูกเพิ่มเฉพาะเมื่อ id ไม่มีอยู่แล้ว); **qwen** และ **gemini** จะได้รับ id ตามตัวอักษร; **claude** จะได้รับผ่าน `ANTHROPIC_MODEL`, **goose** ผ่าน `GOOSE_MODEL`, และ **codex** ผ่าน `-c model_providers.shiguang-gateway.*` args **Qwen เป็นเป้าหมายการทำงานเพียงอย่างเดียวที่ต้องการ `--model`** — `shiguang-gateway run qwen` โดยไม่มีมันจะออก `2` พร้อมกับข้อผิดพลาดที่ชัดเจน
- `--port <port>` — พอร์ต ShiguangGateway ในท้องถิ่น (ค่าเริ่มต้น `20128`, จะถูกละเว้นเมื่อกำหนด `--remote`) ปรากฏในทุกคำสั่ง `setup-*` และทั้งสองตัวเรียกใช้
- รหัสออกจาก `shiguang-gateway run`: รหัสออกของ CLI ลูกจะถูกส่งต่ออย่างตรงไปตรงมา; `2` = อาร์กิวเมนต์ไม่ถูกต้อง (เป้าหมายที่ไม่รองรับ, ขาด `--model` ที่จำเป็น, การป้องกันคอนเทนเนอร์); `127` = ไบนารีเป้าหมายไม่อยู่ใน `PATH`; `130`/`143`/`129` เมื่อการเรียกใช้สิ้นสุดโดย `SIGINT`/`SIGTERM`/`SIGHUP`; `1` = ความล้มเหลวในการเรียกใช้ในระหว่างเวลาอื่น
- ตัวเรียกใช้ทั้งสอง (`launch`, `launch-codex`) ยอมรับ `--profile <name>` เพื่อเลือกโปรไฟล์ที่เขียนโดย `setup-claude` / `setup-codex` พร้อมกับอาร์กิวเมนต์ที่ส่งผ่านสำหรับไบนารี `claude` / `codex` ที่อยู่เบื้องหลัง

ตัวเลือกแบบโต้ตอบยังแชร์โดยสูตรการตั้งค่า:

```bash
# เลือกจากแคตตาล็อกโมเดลท้องถิ่นหรือระยะไกลที่ใช้งานอยู่และกำหนดค่าเป้าหมาย
shiguang-gateway configure claude
shiguang-gateway configure opencode --provider glm
shiguang-gateway configure qwen --model qwen/qwen3.8-max-preview --yes
```

`configure` ปัจจุบันจะมอบหมายให้สูตรที่ทดสอบสำหรับ `codex`, `claude`, `opencode`, `qwen`, `aider`, `goose`, `cline`, `continue`, และ `kilo` รายการแคตตาล็อกเฉพาะ IDE, MITM, และเฉพาะคู่มือจะยังคงเป็นการไหลแบบ `setup-*`/ด้วยมือและไม่ถูกนำเสนอเป็นเป้าหมายที่สามารถเรียกใช้ได้

> `setup-opencode` เป็นการรวม OpenCode ที่เข้ากันได้กับ openai **ที่มีน้ำหนักเบา**
> นอกจากนี้ยังมีการรวมปลั๊กอินที่ร่ำรวยกว่า — `shiguang-gateway setup opencode` — ซึ่ง
> ติดตั้ง `@orbit/opencode-plugin` พวกเขาเป็นคำสั่งที่แตกต่างกัน; ตาราง
> ข้างต้นบันทึก `setup-opencode`.

---

## การใช้งานในท้องถิ่น

เมื่อ ShiguangGateway ทำงานอยู่ที่ `localhost:20128` ให้รันคำสั่งตั้งค่าสำหรับเครื่องมือของคุณ คลังข้อมูลจะถูกดึงจากเซิร์ฟเวอร์ท้องถิ่น

```bash
# Codex: เขียนโปรไฟล์ต่อแบบที่ตรงกันลงใน ~/.codex/
shiguang-gateway setup-codex
codex --profile glm52            # ใช้โปรไฟล์ที่สร้างขึ้น

# Claude Code: เขียนโปรไฟล์ต่อแบบตามโมเดล จากนั้นเริ่มต้นหนึ่ง
shiguang-gateway setup-claude
shiguang-gateway launch --profile glm52

# OpenCode: เขียนผู้ให้บริการที่เข้ากันได้กับ openai พร้อมโมเดลทั้งหมดในคลัง
shiguang-gateway setup-opencode
export SHIGUANG_GATEWAY_API_KEY=sk-...  # อ้างอิงผ่าน {env:SHIGUANG_GATEWAY_API_KEY} ไม่เคยอยู่ในดิสก์
opencode -m shiguang-gateway/glm/glm-5.2 "..."

# เครื่องมือที่ไม่มีการค้นพบอัตโนมัติต้องการโมเดลที่ชัดเจน:
shiguang-gateway setup-aider --model glm/glm-5.2
shiguang-gateway setup-qwen --model qwen/qwen3.8-max-preview

# ดูตัวอย่างโดยไม่เขียนอะไรเลย:
shiguang-gateway setup-continue --dry-run
```

เริ่มต้นโดยไม่เขียนการกำหนดค่าใด ๆ (การฉีด env เท่านั้น):

```bash
shiguang-gateway launch                 # Claude Code → ShiguangGateway ท้องถิ่น
shiguang-gateway launch-codex           # Codex CLI → ShiguangGateway ท้องถิ่น
shiguang-gateway launch-codex --profile glm52
shiguang-gateway run claude --model openai/gpt-5.4
shiguang-gateway run codex --model openai/gpt-5.4 --dry-run --json
shiguang-gateway run aider --model glm/glm-5.2 -- --message "reply OK"
shiguang-gateway run goose --model glm/glm-5.2
shiguang-gateway run opencode --model glm/glm-5.2 -- run "reply OK"
shiguang-gateway run qwen --model glm/glm-5.2 -- -p "reply OK"
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "reply OK"

# เส้นทางคำสั่งที่ชัดเจน: ส่งผ่านสิ่งที่มาหลัง --
shiguang-gateway run claude -- --print-system-prompt "review this diff"
```

---

## การใช้งานระยะไกล

ชี้คำสั่งตั้งค่าใด ๆ ไปที่ ShiguangGateway ระยะไกลด้วย `--remote` + `--api-key` คลังข้อมูลจะถูกดึงจากระยะไกล; การกำหนดค่าจะถูกเขียนลงในเครื่องของคุณ

```bash
# OpenCode กับ VPS ระยะไกล เก็บเฉพาะโมเดล glm/kimi
shiguang-gateway setup-opencode --remote http://192.168.0.15:20128 --api-key oma_live_xxx \
  --only glm,kimi
opencode -m shiguang-gateway/glm/glm-5.2 "..."   # ส่งออก SHIGUANG_GATEWAY_API_KEY ก่อน

# โปรไฟล์ Codex จากคลังระยะไกล
shiguang-gateway setup-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx

# เริ่ม CLI ตรงไปที่ระยะไกล
shiguang-gateway launch       --remote http://192.168.0.15:20128 --api-key oma_live_xxx
shiguang-gateway launch-codex --remote http://192.168.0.15:20128 --api-key oma_live_xxx
```

แทนที่จะส่งผ่าน `--remote`/`--api-key` ทุกครั้ง ให้เข้าสู่ระบบเพียงครั้งเดียวและให้ **บริบทที่ใช้งานอยู่** จัดหาพวกเขาโดยอัตโนมัติ:

```bash
shiguang-gateway connect 192.168.0.15        # สร้างโทเค็นที่มีขอบเขต เก็บบริบท
shiguang-gateway setup-codex                 # ← ตอนนี้ใช้คลังระยะไกล
shiguang-gateway setup-opencode              # ← เช่นเดียวกัน
shiguang-gateway launch                      # ← Claude Code กับระยะไกล
```

ดู [โหมดระยะไกล](./REMOTE-MODE.md) สำหรับบริบท ขอบเขต และการจัดการโทเค็น

---

## ข้อกำหนด URL พื้นฐาน (เครื่องมือที่ต้องการ `/v1`)

ShiguangGateway เปิดเผยพื้นผิว OpenAI ที่ `/v1` พื้นผิว Anthropic ที่ราก และพื้นผิว Gemini ดั้งเดิมที่ `/v1beta` การรวมแต่ละอย่างถูกเชื่อมต่อกับรูปแบบที่เครื่องมือของคุณคาดหวัง (ตรวจสอบในแหล่งที่มาของคำสั่ง):

| การรวม                                                                     | URL พื้นฐานที่เขียน | `/v1`?                                     |
| -------------------------------------------------------------------------- | ------------------- | ------------------------------------------ |
| `setup-cline` (`openAiBaseUrl`)                                            | ราก                 | ไม่ — Cline เพิ่ม `/v1/chat/completions`   |
| `setup-goose` (`OPENAI_HOST`)                                              | ราก                 | ไม่ — Goose เพิ่มเส้นทาง                   |
| `setup-aider` (`OPENAI_API_BASE`)                                          | ราก                 | ไม่ — LiteLLM เพิ่ม `/v1/chat/completions` |
| `setup-kilo`, `setup-roo`, `setup-continue`, `setup-crush`, `setup-cursor` | พร้อม `/v1`         | ใช่                                        |
| `setup-claude` (`ANTHROPIC_BASE_URL`), `launch`                            | ราก                 | ไม่ — Claude Code เพิ่ม `/v1/messages`     |
| `setup-codex`, `launch-codex` (`model_providers.shiguang-gateway.base_url`)       | พร้อม `/v1`         | ใช่                                        |
| `setup-qwen` (`modelProviders.openai[].baseUrl`)                           | พร้อม `/v1`         | ใช่                                        |
| `run gemini` (`GOOGLE_GEMINI_BASE_URL`)                                    | ราก                 | ไม่ — SDK เพิ่ม `/v1beta/models/…`         |

---

## การรักษา native deps ในการอัปเดต: `--include=optional`

เมื่อคุณอัปเดตด้วย `shiguang-gateway update` (หลังจากยืนยัน หรือด้วย `--apply`),
ShiguangGateway จะรันการติดตั้งด้วย `--include=optional` ที่ฝังอยู่ในนั้น:

```bash
npm install -g shiguang-gateway@latest --include=optional
```

นี่คือ **ไม่ใช่** ธงที่คุณส่งไปยัง `shiguang-gateway update` — มันจะถูกนำไปใช้เสมอโดย
ตัวอัปเดต มันรับประกันว่า `optionalDependencies` (`better-sqlite3`, `keytar`,
`tls-client`, สแต็ค LLMLingua SLM) จะอยู่รอดในการอัปเดตแม้ว่าการตั้งค่า npm ของคุณ
จะมี `omit=optional` ตั้งอยู่ ซึ่งจะทำให้ไดรเวอร์ SQLite
และการเชื่อมต่อ OS-keyring ถูกละทิ้งอย่างเงียบ ๆ หากต้องการดูคำสั่งที่แน่นอนโดยไม่ต้องใช้:

```bash
shiguang-gateway update --dry-run
# [DRY RUN] จะรัน: npm install -g shiguang-gateway@latest --include=optional
```

ธงอื่น ๆ ของ `shiguang-gateway update` (ได้รับการตรวจสอบในซอร์ส): `--check` (ออก 1 หาก
ล้าสมัย), `--apply` (ติดตั้งโดยไม่ต้องถาม), `--changelog`, `--no-backup`,
`--yes`.

---

## Google Gemini CLI ผ่าน `shiguang-gateway run gemini`

สัญญาได้รับการตรวจสอบกับ `@google/gemini-cli` 0.50.0: CLI จะเคารพ
`GOOGLE_GEMINI_BASE_URL` และออกคำสั่ง `POST /v1beta/models/<model>:generateContent`
(และ `:streamGenerateContent?alt=sse`) ต่อมัน — ตรงตามพื้นผิว Gemini ดั้งเดิมของ ShiguangGateway (`/v1beta`). `shiguang-gateway run gemini` จะเชื่อมต่อสิ่งนั้นโดยอัตโนมัติ:

- `GOOGLE_GEMINI_BASE_URL` → URL พื้นฐาน ShiguangGateway ที่ใช้งานอยู่ (ราก, ไม่มี `/v1`);
- `GEMINI_API_KEY` → ข้อมูลรับรอง ShiguangGateway ที่แก้ไขแล้ว (ตัวเลือก/สภาพแวดล้อม/บริบท);
- **`GEMINI_CLI_HOME` ชั่วคราวที่แยกออก** ซึ่ง `.gemini/settings.json`
  จะเลือกการรับรอง `gemini-api-key`, ดังนั้นเซสชัน Google OAuth ที่เก็บไว้ (Code Assist)
  จะไม่เขียนทับการเปิดตัวที่กำหนดโดย ShiguangGateway — จะถูกลบหลังจากออก;
- **ความสะอาดของ env**: สภาพแวดล้อมลูกจะถูกล้างข้อมูล `GOOGLE_API_KEY`,
  `GOOGLE_GENAI_USE_VERTEXAI` และ `GOOGLE_GENAI_USE_GCA` (ซึ่งจะเปลี่ยนเส้นทาง
  การรับรองไปยัง Vertex/Code Assist), และ `GEMINI_DEFAULT_AUTH_TYPE=gemini-api-key` จะถูกตั้งค่าเป็น
  การสำรอง — เป้าหมาย `run` อื่น ๆ จะได้รับการรักษาในลักษณะเดียวกันสำหรับตัวแปรที่ขัดแย้งของตนเอง;
- การฉีด `--model <id>` จาก `--provider`/`--model`.

```bash
shiguang-gateway run gemini --model glm/glm-5.2 -- --skip-trust -p "hello"
```

การป้องกันความไว้วางใจในพื้นที่ทำงานของ Gemini ยังคงใช้ในโหมด headless — ส่ง
`--skip-trust` (หรือไว้วางใจไดเรกทอรีแบบโต้ตอบ) เอง; ตัวเปิดจะไม่ข้ามมันโดยเจตนา ตัวเปิดนี้แตกต่างจาก **การลงทะเบียน ACP**
(`src/lib/acp/registry.ts`, `gemini --acp`), ซึ่งยังคงเป็นการรวมโปรโตคอลตัวแทนสำหรับ `/dashboard/acp-agents`.

---

## การตรวจสอบควันจริง (เลือกเข้าร่วม)

การทดสอบแผนการเปิดตัวที่แน่นอนจะทำงานใน CI (`tests/unit/cli/run-command.test.ts`,
`tests/unit/cli/run-execution.test.ts`). เพื่อยืนยันไบนารีจริงกับเซิร์ฟเวอร์ ShiguangGateway จริง
มีเครื่องมือเลือกเข้าร่วมที่ `tests/integration/upstream-cli-smoke.int.test.ts`. มันจะไม่ทำงานโดยอัตโนมัติ
(ทุกการทดสอบย่อยจะข้ามเว้นแต่ `RUN_CLI_SMOKE=1`), ส่งข้อมูลรับรองผ่านตัวแปร env
NAME (ไม่เคยส่งโดยค่า), ปกปิดสตริงที่มีลักษณะเป็นคีย์จากผลลัพธ์ที่บันทึกไว้, ข้าม
เป้าหมายที่ไบนารีไม่ได้ติดตั้ง, และจัดประเภทความล้มเหลวเป็น
การรับรอง / ข้อมูลต้นทาง / การตั้งค่าแทนที่จะเป็นบูลีนเปล่า:

```bash
RUN_CLI_SMOKE=1 \
SHIGUANG_GATEWAY_SMOKE_BASE_URL="http://localhost:20128" \
SHIGUANG_GATEWAY_SMOKE_MODEL="<provider/model>" \
SHIGUANG_GATEWAY_SMOKE_API_KEY_ENV="SHIGUANG_GATEWAY_API_KEY" \
node --import tsx/esm --test tests/integration/upstream-cli-smoke.int.test.ts
```

ตัวเลือก: `SHIGUANG_GATEWAY_SMOKE_TARGETS="codex,opencode,qwen"` จำกัดการตรวจสอบ;
`SHIGUANG_GATEWAY_SMOKE_TIMEOUT_MS` จะเขียนทับเวลา 120 วินาทีต่อเป้าหมาย.

## ดูเพิ่มเติม

- [การกำหนดค่าของ Claude Code](./CLAUDE-CODE-CONFIGURATION.md) — คู่มือ Claude Code ที่ลึกซึ้งยิ่งขึ้น
- [การกำหนดค่าของ Codex CLI](./CODEX-CLI-CONFIGURATION.md) — การตั้งค่าเบื้องต้น `[model_providers.shiguang-gateway]` แบบครั้งเดียว
- [โหมดระยะไกล](./REMOTE-MODE.md) — บริบท, โทเค็นการเข้าถึงที่มีขอบเขต, การควบคุมเซิร์ฟเวอร์ระยะไกล
- [เอกสารอ้างอิงเครื่องมือ CLI](../reference/CLI-TOOLS.md) — รายการเครื่องมือที่รองรับทั้งหมด + หน้าแดชบอร์ด
- [คู่มือการติดตั้ง](./SETUP_GUIDE.md) — วิธีการติดตั้งและการแนะนำการใช้งานครั้งแรก
