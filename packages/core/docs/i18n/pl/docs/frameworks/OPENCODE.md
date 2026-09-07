---
title: "Integracja z OpenCode"
version: 3.8.40
lastUpdated: 2027-07-27
---

# Integracja z OpenCode

> **Status:** Ogólnie dostępne.
> **Odbiorcy:** Operatorzy podłączający OpenCode do wdrożenia ShiguangGateway.
> **Źródło prawdy (schemat konfiguracji):** `src/shared/services/opencodeConfig.ts`
> **Źródło prawdy (pakiet npm):** `@orbit/opencode-provider/` (publikowalny workspace)

[OpenCode](https://opencode.ai) to agentowy klient AI CLI/desktop. Czyta katalog providerów z `~/.config/opencode/opencode.json` (lub `opencode.jsonc`) i stosuje schemat z `https://opencode.ai/config.json`. ShiguangGateway udostępnia się OpenCode jako jeden z tych providerów — każde żądanie przechodzi przez standardową, zgodną z OpenAI powierzchnię `/v1` ShiguangGateway, więc OpenCode automatycznie korzysta z routingu Auto-Combo, circuit breakerów, polityk kluczy, observability itd.

Są **dwie obsługiwane ścieżki integracji**. Wybierz jedną — generują tę samą konfigurację.

---

## Ścieżka 1 — generator CLI (bez instalacji npm)

Zalecana dla użytkowników końcowych. Dostarczana z ShiguangGateway. Zapisuje `opencode.json` w miejscu.

```bash
# After installing ShiguangGateway (npm i -g @orbit/cli or local clone)
shiguang-gateway config opencode \
  --base-url http://localhost:20128 \
  --api-key "$SHIGUANG_GATEWAY_API_KEY"
```

W tle CLI wywołuje `mergeOpenCodeConfigText()` (`src/shared/services/opencodeConfig.ts:104`), więc istniejący `opencode.json` zachowuje pozostałych providerów i komentarze. Wpis ShiguangGateway jest dodawany/zastępowany atomowo.

Wynikowy plik (domyślny katalog modeli):

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "provider": {
    "shiguang-gateway": {
      "npm": "@ai-sdk/openai-compatible",
      "name": "ShiguangGateway",
      "options": {
        "baseURL": "http://localhost:20128/v1",
        "apiKey": "<your-key>",
      },
      "models": {
        "claude-opus-4-5-thinking": { "name": "claude-opus-4-5-thinking" },
        "claude-sonnet-4-5-thinking": { "name": "claude-sonnet-4-5-thinking" },
        "gemini-3.1-pro-high": { "name": "gemini-3.1-pro-high" },
        "gemini-3-flash": { "name": "gemini-3-flash" },
      },
    },
  },
}
```

---

## Ścieżka 2 — pakiet npm `@orbit/opencode-provider`

Zalecana, gdy skryptujesz konfigurację z Node/TS (pipeline'y CI, monoreposy, własne flow instalatora).

```bash
npm install --save-dev @orbit/opencode-provider
```

```ts
import { writeFileSync } from "node:fs";
import { buildShiguangGatewayOpenCodeConfig } from "@orbit/opencode-provider";

const config = buildShiguangGatewayOpenCodeConfig({
  baseURL: "http://localhost:20128",
  apiKey: process.env.SHIGUANG_GATEWAY_API_KEY ?? "sk_shiguang-gateway",
  // Optional: override the model catalog exposed to OpenCode
  models: ["auto", "claude-opus-4-7", "gpt-5.5"],
  modelLabels: { auto: "Auto-Combo" },
});

writeFileSync("opencode.json", JSON.stringify(config, null, 2));
```

Aby nieniszcząco scalić z istniejącym plikiem, odtwórz `mergeOpenCodeConfigText()` z `opencodeConfig.ts` albo wywołaj generator CLI.

Pełne API znajdziesz w [README pakietu](../../@orbit/opencode-provider/README.md).

---

## Co runtime robi w praktyce

Obie ścieżki produkują to samo `provider.shiguang-gateway.npm: "@ai-sdk/openai-compatible"`. W runtime OpenCode ładuje `@ai-sdk/openai-compatible` (już jest zależnością przechodnią OpenCode) i konfiguruje go przez `baseURL` + `apiKey`. Dalej:

```
OpenCode UI/agent
   → @ai-sdk/openai-compatible
      → HTTP POST {baseURL}/chat/completions          (ShiguangGateway OpenAI surface)
         → ShiguangGateway /v1/chat/completions handler     (open-sse/handlers/chatCore.ts)
            → combo routing / Auto-Combo / executor
               → upstream provider
```

Wtyczka nigdy nie dotyka HTTP. Emisuje wyłącznie konfigurację.

---

## Domyślny katalog modeli

```ts
export const SHIGUANG_GATEWAY_DEFAULT_OPENCODE_MODELS = [
  "claude-opus-4-5-thinking",
  "claude-sonnet-4-5-thinking",
  "gemini-3.1-pro-high",
  "gemini-3-flash",
] as const;
```

Możesz nadpisać przez `models: [...]`. Zalecane dodatki:

- `"auto"` — udostępnia router zero-config [Auto-Combo](../routing/AUTO-COMBO.md) ShiguangGateway. Pozwala OpenCode wybrać „najlepszy dostępny model” bez hardkodowania katalogu.
- `"<combo-name>"` — dowolne combo zdefiniowane w dashboardzie; ShiguangGateway rozwiązuje je przejrzyście.

---

## Normalizacja URL

Helper akceptuje obie formy i emituje dokładnie jedno `/v1`:

| Wejście                        | Wyjście (`options.baseURL`) |
| ------------------------------ | --------------------------- |
| `http://localhost:20128`       | `http://localhost:20128/v1` |
| `http://localhost:20128/`      | `http://localhost:20128/v1` |
| `http://localhost:20128/v1`    | `http://localhost:20128/v1` |
| `http://localhost:20128/v1///` | `http://localhost:20128/v1` |

Ta deduplikacja to **najczęstsza przyczyna awarii** w starszych konfiguracjach. Jeśli masz `opencode.json` sprzed v3.8.0 wskazujący na `/v1/v1/...`, uruchom generator ponownie albo wywołaj `createShiguangGatewayProvider` jeszcze raz.

---

## Tryby uwierzytelniania

| Ustawienie ShiguangGateway                         | Zalecana wartość `apiKey`                                  |
| -------------------------------------------- | ---------------------------------------------------------- |
| `REQUIRE_API_KEY=false` (domyślnie lokalnie) | `sk_shiguang-gateway` (dosłowny placeholder)                      |
| `REQUIRE_API_KEY=true`                       | Prawdziwy klucz API per użytkownik z Dashboard → API Keys. |

Dla klientów w stylu Anthropic, które wysyłają `x-api-key` + `anthropic-version`, `extractApiKey` ShiguangGateway honoruje też klucz z `x-api-key`. OpenCode używa powierzchni OpenAI, więc zawsze wyśle `Authorization: Bearer ${apiKey}` — specjalny przypadek Anthropic tu nie obowiązuje.

---

## Rozwiązywanie problemów

| Objaw                                                | Przyczyna                                                                 | Naprawa                                                                                                |
| ---------------------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `404` na każdym żądaniu z URL zawierającym `/v1/v1/` | Przestarzała konfiguracja z wtyczki pre-v3.8, która podwajała `/v1`.      | Wygeneruj ponownie przez Ścieżkę 1 lub 2.                                                              |
| `401 Invalid API key`                                | ShiguangGateway ma `REQUIRE_API_KEY=true`, a klucz jest nieznany.               | Utwórz klucz w dashboardzie albo ustaw `REQUIRE_API_KEY=false` (tylko lokalnie) i użyj `sk_shiguang-gateway`. |
| Pusta lista modeli w UI OpenCode                     | Wszystkie 4 domyślne modele są ukryte w widoczności providerów ShiguangGateway. | Przekaż `models: ["auto", ...]`, aby udostępnić włączone modele.                                       |
| OpenCode 500 z `cannot read property 'models'`       | Starszy OpenCode (< 0.1.x) nie akceptował inline `models`.                | Zaktualizuj OpenCode do wersji zgodnej ze schematem v1 (`opencode.ai/config.json`).                    |

---

## Zobacz też

- [API reference](../reference/API_REFERENCE.md) — pełna powierzchnia REST ShiguangGateway
- [Auto-Combo](../routing/AUTO-COMBO.md) — co oznacza `model: "auto"`
- [`@orbit/opencode-provider` README](../../@orbit/opencode-provider/README.md)
- Źródło: `src/shared/services/opencodeConfig.ts`, `src/lib/cli-helper/config-generator/opencode.ts`, `@orbit/opencode-provider/src/index.ts`
