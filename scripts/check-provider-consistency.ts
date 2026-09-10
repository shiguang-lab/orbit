import { AI_PROVIDERS, getProviderById } from "../packages/providers/src/catalog/index.ts";
import { REGISTRY } from "../packages/providers/src/config/providers/index.ts";

export const KNOWN_REGISTRY_ONLY: Record<string, string> = {
  maxai: "Browser-minted web executor not yet exposed as a dashboard catalog provider.",
  uc: "Internal consumer-web executor not yet exposed as a dashboard catalog provider.",
  "uc-direct": "Direct UC registry entry not yet exposed as a dashboard catalog provider.",
  "perplexity-agent": "Responses endpoint variant owned by the Perplexity provider family.",
  seekai: "Operator-oriented compatible registry entry not yet exposed in the dashboard catalog.",
};

export const KNOWN_CATALOG_ONLY: Record<string, string> = {
  "amazon-q": "OAuth provider routed through the Kiro executor.",
  zed: "IDE provider routed through its specialized executor.",
  piapi: "Connection-baseUrl compatible gateway.",
  getgoapi: "Connection-baseUrl compatible gateway.",
  laozhang: "Connection-baseUrl compatible gateway.",
  thebai: "Connection-baseUrl compatible gateway.",
  fenayai: "Connection-baseUrl compatible gateway.",
  empower: "Connection-baseUrl compatible gateway.",
  "arcee-ai": "Connection-baseUrl provider.",
  "azure-openai": "Azure executor plus connection baseUrl.",
  "azure-ai": "Azure AI executor plus connection baseUrl.",
  watsonx: "Enterprise connection-baseUrl provider.",
  oci: "Enterprise connection-baseUrl provider.",
  sap: "Enterprise connection-baseUrl provider.",
  datarobot: "Enterprise connection-baseUrl provider.",
  clarifai: "Enterprise connection-baseUrl provider.",
  "360ai": "Regional connection-baseUrl provider.",
  gitlab: "Specialized executor plus connection baseUrl.",
  "poe-web": "Specialized web executor.",
  "venice-web": "Specialized web executor.",
  "v0-vercel-web": "Specialized web executor.",
  "gemini-business": "Specialized enterprise Gemini executor.",
  "ollama-local": "Local connection-baseUrl provider.",
  "lm-studio": "Local connection-baseUrl provider.",
  vllm: "Local connection-baseUrl provider.",
  lemonade: "Local connection-baseUrl provider.",
  llamafile: "Local connection-baseUrl provider.",
  "llama-cpp": "Local connection-baseUrl provider.",
  triton: "Local connection-baseUrl provider.",
  "docker-model-runner": "Local connection-baseUrl provider.",
  xinference: "Local connection-baseUrl provider.",
  oobabooga: "Local connection-baseUrl provider.",
};

export function findOrphanRegistryIds(
  registryIds: string[],
  isKnownProvider: (id: string) => boolean,
  allowlist: Record<string, string>,
): string[] {
  return registryIds.filter((id) => !isKnownProvider(id) && !(id in allowlist));
}

export function findCatalogOnlyLlmProviders(
  providers: Record<string, { serviceKinds: string[] }>,
  registryIds: string[],
  allowlist: Record<string, string>,
): string[] {
  const registry = new Set(registryIds);
  return Object.entries(providers)
    .filter(([id, provider]) => !registry.has(id) && !(id in allowlist) && provider.serviceKinds.includes("llm"))
    .map(([id]) => id);
}

const registryIds = Object.keys(REGISTRY);
const canonicalIds = new Set(Object.keys(AI_PROVIDERS));
const orphans = findOrphanRegistryIds(
  registryIds,
  (id) => canonicalIds.has(id) || Boolean(getProviderById(id)),
  KNOWN_REGISTRY_ONLY,
);
const reverseOrphans = findCatalogOnlyLlmProviders(
  AI_PROVIDERS as Record<string, { serviceKinds: string[] }>,
  registryIds,
  KNOWN_CATALOG_ONLY,
);

if (orphans.length || reverseOrphans.length) {
  if (orphans.length) console.error(`[provider-consistency] registry-only: ${orphans.join(", ")}`);
  if (reverseOrphans.length) console.error(`[provider-consistency] catalog-only LLM: ${reverseOrphans.join(", ")}`);
  process.exitCode = 1;
} else {
  console.log(`[provider-consistency] OK — registry=${registryIds.length}, catalog=${canonicalIds.size}`);
}
