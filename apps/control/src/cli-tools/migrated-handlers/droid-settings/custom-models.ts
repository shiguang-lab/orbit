export interface DroidCustomModelOptions {
  baseUrl: string;
  apiKey: string;
  activeModel?: string;
}

export interface DroidCustomModelEntry {
  model: string;
  id: string;
  index: number;
  baseUrl: string;
  apiKey: string;
  displayName: string;
  maxOutputTokens: number;
  noImageSupport: boolean;
  provider: string;
}

export function normalizeDroidModelList(input: {
  model?: unknown;
  models?: unknown;
}): string[] {
  const raw: unknown[] = Array.isArray(input.models)
    ? input.models
    : typeof input.model === "string"
      ? [input.model]
      : [];

  const seen = new Set<string>();
  const out: string[] = [];
  for (const model of raw) {
    if (typeof model !== "string") continue;
    const trimmed = model.trim();
    if (!trimmed || seen.has(trimmed)) continue;
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

export function buildDroidCustomModels(
  models: string[],
  opts: DroidCustomModelOptions,
): DroidCustomModelEntry[] {
  if (models.length === 0) {
    throw new Error("buildDroidCustomModels requires at least one model");
  }

  let defaultIndex: number;
  if (typeof opts.activeModel === "string") {
    if (opts.activeModel === "") {
      defaultIndex = -1;
    } else {
      const index = models.indexOf(opts.activeModel);
      defaultIndex = index >= 0 ? index : 0;
    }
  } else {
    defaultIndex = 0;
  }

  const entries: DroidCustomModelEntry[] = models.map((model, index) => ({
    model,
    id: `custom:ShiguangGateway-${index}`,
    index,
    baseUrl: opts.baseUrl,
    apiKey: opts.apiKey,
    displayName: model,
    maxOutputTokens: 131072,
    noImageSupport: false,
    provider: "openai",
  }));

  if (defaultIndex > 0 && entries[defaultIndex]) {
    const [defaultEntry] = entries.splice(defaultIndex, 1);
    entries.unshift({ ...defaultEntry, index: 0 });
    entries.forEach((entry, index) => {
      entry.index = index;
      entry.id = `custom:ShiguangGateway-${index}`;
    });
  }

  return entries;
}

export function isShiguangGatewayCustomModel(
  entry: { id?: unknown } | null | undefined,
): boolean {
  return typeof entry?.id === "string" && entry.id.startsWith("custom:ShiguangGateway");
}
