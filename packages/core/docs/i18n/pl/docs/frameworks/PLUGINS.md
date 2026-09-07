---
title: "System wtyczek CLI Orbit"
version: 3.8.40
lastUpdated: 2026-06-28
---

# System wtyczek CLI Orbit

Rozszerzaj CLI `orbit` bez modyfikowania jego rdzenia. Wtyczki stosują konwencję nazewnictwa `orbit-cmd-*`, podobnie jak `gh extension` lub `kubectl plugin`.

## Szybki start

```bash
# Install a plugin from npm
orbit plugin install stripe

# Install a local plugin in development
orbit plugin install ./my-plugin

# List installed plugins
orbit plugin list

# Scaffold a new plugin
orbit plugin scaffold myplugin
cd orbit-cmd-myplugin
orbit plugin install .
```

## Anatomia wtyczki

Wtyczka to pakiet npm o nazwie `orbit-cmd-<name>` (lub `@scope/orbit-cmd-<name>`).

```
orbit-cmd-myplugin/
├── package.json     # must have "type": "module" and "main": "index.mjs"
├── index.mjs        # exports register(program, ctx) + optional meta
└── README.md
```

### `package.json`

```json
{
  "name": "orbit-cmd-myplugin",
  "version": "0.1.0",
  "type": "module",
  "main": "index.mjs",
  "engines": { "orbit": ">=4.0.0" },
  "keywords": ["orbit-plugin", "orbit-cmd"]
}
```

### `index.mjs`

```js
export const meta = {
  name: "myplugin",
  version: "0.1.0",
  description: "My plugin for Orbit",
  orbitApi: ">=4.0.0",
};

export function register(program, ctx) {
  program
    .command("myplugin")
    .description(meta.description)
    .option("-n, --name <name>")
    .action(async (opts, cmd) => {
      const gOpts = cmd.optsWithGlobals();
      const res = await ctx.apiFetch("/api/combos", {
        baseUrl: gOpts.baseUrl,
        apiKey: gOpts.apiKey,
      });
      const data = await res.json();
      ctx.emit(data, gOpts);
    });
}
```

## API kontekstu wtyczki

Obiekt `ctx` przekazywany do `register(program, ctx)`:

| Property                     | Type             | Description                                                 |
| ---------------------------- | ---------------- | ----------------------------------------------------------- |
| `ctx.apiFetch(path, opts)`   | `async function` | Uwierzytelniony fetch do serwera Orbit                  |
| `ctx.emit(data, opts)`       | `function`       | Wyjście w formacie table/json/jsonl/csv wg flagi `--output` |
| `ctx.t(key)`                 | `async function` | Wyszukiwanie tłumaczenia i18n                               |
| `ctx.withSpinner(label, fn)` | `async function` | Opakowuje async fn w spinner ora                            |
| `ctx.baseUrl`                | `string`         | Rozwiązany base URL                                         |
| `ctx.apiKey`                 | `string \| null` | Klucz API, jeśli podany                                     |

## Odkrywanie

Wtyczki są wykrywane z:

1. `~/.orbit/plugins/<name>/` — instalacje lokalne użytkownika
2. `ORBIT_PLUGIN_PATH` env var — niestandardowy katalog

Błędy ładowania są przechwytywane i wypisywane jako ostrzeżenia — uszkodzona wtyczka nigdy nie zawiesza CLI.

## Bezpieczeństwo

Wtyczki działają z tymi samymi uprawnieniami procesu Node.js co `orbit`. Instaluj wtyczki wyłącznie ze źródeł, którym ufasz. `orbit plugin install` wyświetla wyraźne ostrzeżenie i wymaga `--yes` albo interaktywnego potwierdzenia.

## Publikowanie

1. Upewnij się, że `package.json` ma `"keywords": ["orbit-plugin"]`
2. `npm publish` jak zwykle
3. Użytkownicy odkrywają wtyczki przez `orbit plugin search <query>` (przeszukuje rejestr npm)

## Przykładowa wtyczka

Zobacz [`examples/orbit-cmd-hello/`](../../examples/orbit-cmd-hello/index.mjs) — minimalny działający przykład z `meta` + `register()`.
