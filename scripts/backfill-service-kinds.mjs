import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const files = [
  "packages/providers/src/catalog/definitions/oauth.ts",
  "packages/providers/src/catalog/definitions/web-cookie.ts",
  "packages/providers/src/catalog/definitions/local.ts",
  "packages/providers/src/catalog/definitions/search.ts",
  "packages/providers/src/catalog/definitions/audio.ts",
  "packages/providers/src/catalog/definitions/upstream-proxy.ts",
  "packages/providers/src/catalog/definitions/cloud-agent.ts",
  "packages/providers/src/catalog/definitions/system.ts",
  "packages/providers/src/catalog/definitions/apikey/gateways.ts",
  "packages/providers/src/catalog/definitions/apikey/frontier-labs.ts",
  "packages/providers/src/catalog/definitions/apikey/inference-hosts.ts",
  "packages/providers/src/catalog/definitions/apikey/enterprise-cloud.ts",
  "packages/providers/src/catalog/definitions/apikey/regional.ts",
  "packages/providers/src/catalog/definitions/apikey/specialty-media.ts",
];

const searchFetch = new Set(["exa-search", "tavily-search", "firecrawl"]);
const noLlm = new Set([
  "microsoft-designer-web", "adobe-firefly", "sdwebui", "comfyui", "runwayml",
  "ideogram", "freepik", "magnific", "suno", "udio", "voyage-ai", "jina-ai",
  "fal-ai", "stability-ai", "black-forest-labs", "recraft", "topaz", "segmind",
  "nomic", "mixedbread", "leonardo", "haiper", "kie", "deepai",
]);

function kindsFor(file, id) {
  if (file.endsWith("search.ts")) return searchFetch.has(id) ? ["webSearch", "webFetch"] : ["webSearch"];
  if (noLlm.has(id) || /\/(audio|cloud-agent|system|upstream-proxy)\.ts$/.test(file)) return [];
  return ["llm"];
}

function findEntryEnd(source, start) {
  let depth = 0;
  let string = false;
  let escaped = false;
  for (let index = start; index < source.length; index += 1) {
    const char = source[index];
    if (string) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') string = false;
      continue;
    }
    if (char === '"') string = true;
    else if (char === "{") depth += 1;
    else if (char === "}" && --depth === 0) return index;
  }
  return -1;
}

let inserted = 0;
for (const relative of files) {
  const absolute = path.join(root, relative);
  let source = readFileSync(absolute, "utf8");
  const matches = [...source.matchAll(/^\s{4}id:\s*"([^"]+)",/gm)].reverse();
  for (const match of matches) {
    const id = match[1];
    const objectStart = source.lastIndexOf("{", match.index);
    const objectEnd = findEntryEnd(source, objectStart);
    if (objectStart < 0 || objectEnd < 0) throw new Error(`Cannot locate provider block: ${relative}:${id}`);
    if (/\bserviceKinds\s*:/.test(source.slice(objectStart, objectEnd))) continue;
    const insertAt = match.index + match[0].length;
    source = `${source.slice(0, insertAt)}\n    serviceKinds: ${JSON.stringify(kindsFor(relative, id))},${source.slice(insertAt)}`;
    inserted += 1;
  }
  writeFileSync(absolute, source);
}
console.log(`[serviceKinds] inserted=${inserted}`);
