import type { FastifyInstance, FastifyPluginAsync } from "fastify";

// Types
export interface RadarMergedEntry {
  provider: string;
  modelId: string;
  displayName: string;
  familyId?: string | null;
  monthlyTokens: number;
  creditTokens: number;
  freeType: string;
  poolKey: string | null;
  tos: string;
  trainsOnPrompts?: boolean;
  enabled?: boolean;
  origin: "baseline" | "radar" | "local";
  disabledBy?: "radar";
  contextWindow?: number | null;
  capabilities?: {
    tools: boolean | null;
    vision: boolean | null;
    thinking: boolean | null;
  };
  metadataEvidenceUrls?: string[];
  budget?: { kind: string; tokensPerMonth?: number; poolId?: string };
  limits?: { rpm: number | null; rpd: number | null; tpm: number | null; tpd: number | null };
  setup?: { keyUrl: string | null; steps: any[] } | null;
}

export interface RadarLocalModelState {
  provider: string;
  modelId: string;
  displayName: string | null;
  enabled: boolean | null;
  tombstoned: boolean;
  updatedAt: string;
}

// In-memory / persistent store for Radar
let radarSettings = {
  optIn: false,
  supporterKey: null as string | null,
  updatedAt: new Date().toISOString(),
};

let radarCatalogCache = {
  version: "2026.08.01.1",
  generatedAt: new Date().toISOString(),
  tier: "community",
  fetchedAt: new Date().toISOString(),
  entries: [] as RadarMergedEntry[],
};

let radarReferralsCache = {
  tier: "community",
  fetchedAt: new Date().toISOString(),
  fixed: [
    {
      provider: "Groq",
      url: "https://console.groq.com/keys",
      kind: "fixo",
      validUntil: null,
      requiredAction: "注册账号并获取免费 API Key",
      isDefault: true,
    },
    {
      provider: "Google AI Studio",
      url: "https://aistudio.google.com/apikey",
      kind: "fixo",
      validUntil: null,
      requiredAction: "使用 Google 账号登录并创建 Gemini 免费密钥",
      isDefault: true,
    },
    {
      provider: "Cerebras",
      url: "https://cloud.cerebras.ai",
      kind: "fixo",
      validUntil: null,
      requiredAction: "注册即可获取超高速免费 Llama 推理额度",
      isDefault: false,
    },
    {
      provider: "Mistral",
      url: "https://console.mistral.ai",
      kind: "fixo",
      validUntil: null,
      requiredAction: "验证手机号激活免费 La Plateforme 额度",
      isDefault: false,
    },
  ],
  campaigns: [
    {
      provider: "DeepSeek",
      url: "https://platform.deepseek.com",
      kind: "campanha",
      validUntil: "2026-12-31T23:59:59.000Z",
      requiredAction: "新用户注册送 500万 Tokens",
      isDefault: false,
    },
  ],
};

let radarOffersCache = {
  version: "2026.08.09.1",
  tier: "live",
  fetchedAt: new Date().toISOString(),
  offers: [
    {
      id: "groq-free-boost",
      provider: "Groq",
      title: { en: "Groq Llama 3.3 Free Tier", zh: "Groq Llama 3.3 免费高频额度" },
      description: { en: "High speed free inference up to 30 RPM / 14.4K RPD", zh: "极速 Llama 3.3 免费推理，高达 30 RPM / 14400 RPD" },
      benefit: { kind: "rate_limit", rpm: 30, rpd: 14400 },
      publicBenefit: null,
      conditions: { en: "Free account registration", zh: "仅需注册免费账号" },
      validUntil: "2099-12-31T23:59:59.000Z",
      url: "https://console.groq.com/keys",
      partner: false,
    },
    {
      id: "gemini-flash-tier",
      provider: "Google Gemini",
      title: { en: "Gemini 2.5 Flash Free Tier", zh: "Gemini 2.5 Flash 免费层" },
      description: { en: "15 RPM free access with 1M context window", zh: "100万 Token 超长上下文，免费 15 RPM" },
      benefit: { kind: "rate_limit", rpm: 15, rpd: 1500 },
      publicBenefit: null,
      conditions: { en: "Google Account in supported regions", zh: "支持区域的 Google 账号" },
      validUntil: "2099-12-31T23:59:59.000Z",
      url: "https://aistudio.google.com/apikey",
      partner: true,
    },
  ],
};

let radarIntelCache = {
  version: "2026.08.09.1",
  tier: "live",
  fetchedAt: new Date().toISOString(),
  supporterVerified: true,
  intel: {
    feed: "omniroute-radar-intel",
    schemaVersion: 1,
    version: "2026.08.09.1",
    generatedAt: new Date().toISOString(),
    tier: "live",
    methodology: { kind: "elo", initialRating: 1000, kFactor: 32 },
    rankings: [
      {
        rank: 1,
        provider: "Groq",
        modelId: "llama-3.3-70b-versatile",
        category: "coding",
        rating: 1240,
        matches: 820,
        wins: 620,
        losses: 150,
        draws: 50,
      },
      {
        rank: 2,
        provider: "Google Gemini",
        modelId: "gemini-2.5-flash",
        category: "general",
        rating: 1210,
        matches: 950,
        wins: 710,
        losses: 190,
        draws: 50,
      },
      {
        rank: 3,
        provider: "Cerebras",
        modelId: "llama-3.1-8b",
        category: "speed",
        rating: 1180,
        matches: 600,
        wins: 420,
        losses: 130,
        draws: 50,
      },
    ],
    catalog: {
      currentVersion: "2026.08.09.1",
      previousVersion: "2026.08.08.1",
      currentGeneratedAt: new Date().toISOString(),
      ageDays: 0,
      freshness: "fresh",
      providers: { current: 8, added: 2, removed: 0 },
      models: { current: 35, added: 4, removed: 0 },
      trend: "growing",
    },
  },
};

const localModelStates = new Map<string, RadarLocalModelState>();

// Baseline catalog initializer
function getBaselineEntries(): RadarMergedEntry[] {
  return [
    {
      provider: "Groq",
      modelId: "llama-3.3-70b-versatile",
      displayName: "Llama 3.3 70B Versatile",
      familyId: "llama-3.3-70b",
      monthlyTokens: 1000000,
      creditTokens: 0,
      freeType: "recurring-daily",
      poolKey: null,
      tos: "ok",
      trainsOnPrompts: false,
      enabled: true,
      origin: "baseline",
      contextWindow: 131072,
      capabilities: { tools: true, vision: false, thinking: false },
      setup: {
        keyUrl: "https://console.groq.com/keys",
        steps: [
          { en: "Create a free account in Groq Console", zh: "在 Groq 控制台创建免费账号" },
          { en: "Generate an API Key on the API Keys page", zh: "在 API Keys 页面生成密钥" },
          { en: "Add the API key to OmniRoute under groq provider", zh: "将密钥添加到 OmniRoute 的 groq 提供商连接" },
        ],
      },
    },
    {
      provider: "Google Gemini",
      modelId: "gemini-2.5-flash",
      displayName: "Gemini 2.5 Flash",
      familyId: "gemini-2.5-flash",
      monthlyTokens: 500000,
      creditTokens: 0,
      freeType: "recurring-daily",
      poolKey: "gemini-free-pool",
      tos: "ok",
      trainsOnPrompts: false,
      enabled: true,
      origin: "baseline",
      contextWindow: 1048576,
      capabilities: { tools: true, vision: true, thinking: true },
      setup: {
        keyUrl: "https://aistudio.google.com/apikey",
        steps: [
          { en: "Create an API Key in Google AI Studio", zh: "在 Google AI Studio 中创建 API 密钥" },
          { en: "Add the API key to OmniRoute under gemini provider", zh: "将密钥添加到 OmniRoute 的 gemini 提供商连接" },
        ],
      },
    },
    {
      provider: "Google Gemini",
      modelId: "gemini-2.0-flash",
      displayName: "Gemini 2.0 Flash (免密/Keyless)",
      familyId: "gemini-2.0-flash",
      monthlyTokens: 0,
      creditTokens: 0,
      freeType: "keyless",
      poolKey: null,
      tos: "ok",
      trainsOnPrompts: false,
      enabled: true,
      origin: "baseline",
      contextWindow: 1048576,
      capabilities: { tools: true, vision: true, thinking: false },
    },
    {
      provider: "Cerebras",
      modelId: "llama-3.3-70b",
      displayName: "Llama 3.3 70B (Cerebras Ultra-Fast)",
      familyId: "llama-3.3-70b",
      monthlyTokens: 1000000,
      creditTokens: 0,
      freeType: "recurring-daily",
      poolKey: null,
      tos: "ok",
      trainsOnPrompts: false,
      enabled: true,
      origin: "radar",
      contextWindow: 131072,
      capabilities: { tools: true, vision: false, thinking: false },
      setup: {
        keyUrl: "https://cloud.cerebras.ai",
        steps: [
          { en: "Register on Cerebras Cloud", zh: "在 Cerebras Cloud 注册账号" },
          { en: "Create an API Key and connect in OmniRoute", zh: "创建 API Key 并连接到 OmniRoute" },
        ],
      },
    },
    {
      provider: "Mistral",
      modelId: "mistral-small-latest",
      displayName: "Mistral Small Latest",
      familyId: "mistral-small",
      monthlyTokens: 500000,
      creditTokens: 0,
      freeType: "recurring-monthly",
      poolKey: null,
      tos: "ok",
      trainsOnPrompts: false,
      enabled: true,
      origin: "radar",
      contextWindow: 32768,
      capabilities: { tools: true, vision: false, thinking: false },
    },
  ];
}

function getMergedCatalog(): RadarMergedEntry[] {
  const baseline = getBaselineEntries();
  return baseline
    .map((entry) => {
      const key = `${entry.provider}:${entry.modelId}`;
      const local = localModelStates.get(key);
      if (local?.tombstoned) return null;
      if (local) {
        return {
          ...entry,
          displayName: local.displayName ?? entry.displayName,
          enabled: local.enabled ?? entry.enabled,
          origin: "local" as const,
        };
      }
      return entry;
    })
    .filter((e): e is RadarMergedEntry => e !== null);
}

function maskSupporterKey(key: string | null): string | null {
  if (!key) return null;
  return `omr_****${key.slice(-4)}`;
}

export const radarRoutes: FastifyPluginAsync = async (app: FastifyInstance) => {
  // GET /api/radar/settings
  app.get("/radar/settings", async (_req, reply) => {
    return reply.send({
      optIn: radarSettings.optIn,
      hasSupporterKey: radarSettings.supporterKey !== null,
      supporterKeyMasked: maskSupporterKey(radarSettings.supporterKey),
      contributorClaimUrl: "https://radar.omniroute.online/auth/github",
      supporterPlansUrl: "https://radar.omniroute.online/planos",
    });
  });

  // POST /api/radar/settings
  app.post("/radar/settings", async (req, reply) => {
    const body = (req.body || {}) as { optIn?: boolean; supporterKey?: string | null };
    if (typeof body.optIn === "boolean") {
      radarSettings.optIn = body.optIn;
    }
    if (typeof body.supporterKey === "string" || body.supporterKey === null) {
      radarSettings.supporterKey = body.supporterKey;
    }
    radarSettings.updatedAt = new Date().toISOString();

    return reply.send({
      optIn: radarSettings.optIn,
      hasSupporterKey: radarSettings.supporterKey !== null,
      supporterKey: maskSupporterKey(radarSettings.supporterKey),
    });
  });

  // GET /api/radar/catalog
  app.get("/radar/catalog", async (_req, reply) => {
    const entries = getMergedCatalog();
    return reply.send({
      entries,
      meta: {
        version: radarCatalogCache.version,
        generatedAt: radarCatalogCache.generatedAt,
        tier: radarSettings.supporterKey ? "live" : "community",
        fetchedAt: radarCatalogCache.fetchedAt,
      },
    });
  });

  // POST /api/radar/sync
  app.post("/radar/sync", async (_req, reply) => {
    radarCatalogCache.fetchedAt = new Date().toISOString();
    return reply.send({
      status: "updated",
      version: radarCatalogCache.version,
      tier: radarSettings.supporterKey ? "live" : "community",
    });
  });

  // GET /api/radar/referrals
  app.get("/radar/referrals", async (_req, reply) => {
    return reply.send({
      fixed: radarReferralsCache.fixed,
      campaigns: radarReferralsCache.campaigns,
      tier: radarSettings.supporterKey ? "live" : "community",
    });
  });

  // GET /api/radar/local-model-state
  app.get("/radar/local-model-state", async (_req, reply) => {
    return reply.send({ states: Array.from(localModelStates.values()) });
  });

  // PATCH /api/radar/local-model-state
  app.patch("/radar/local-model-state", async (req, reply) => {
    const body = (req.body || {}) as {
      provider: string;
      modelId: string;
      displayName?: string | null;
      enabled?: boolean | null;
    };
    if (!body.provider || !body.modelId) {
      return reply.status(400).send({ error: "provider and modelId are required" });
    }
    const key = `${body.provider}:${body.modelId}`;
    const existing = localModelStates.get(key) || {
      provider: body.provider,
      modelId: body.modelId,
      displayName: null,
      enabled: null,
      tombstoned: false,
      updatedAt: new Date().toISOString(),
    };
    if (body.displayName !== undefined) existing.displayName = body.displayName;
    if (body.enabled !== undefined) existing.enabled = body.enabled;
    existing.updatedAt = new Date().toISOString();
    localModelStates.set(key, existing);

    return reply.send({ states: Array.from(localModelStates.values()) });
  });

  // DELETE /api/radar/local-model-state
  app.delete("/radar/local-model-state", async (req, reply) => {
    const query = req.query as { provider?: string; modelId?: string };
    if (!query.provider || !query.modelId) {
      return reply.status(400).send({ error: "provider and modelId are required" });
    }
    const key = `${query.provider}:${query.modelId}`;
    localModelStates.delete(key);
    return reply.send({ states: Array.from(localModelStates.values()) });
  });

  // PUT /api/radar/local-model-state (tombstone)
  app.put("/radar/local-model-state", async (req, reply) => {
    const body = (req.body || {}) as { provider: string; modelId: string; tombstoned: boolean };
    if (!body.provider || !body.modelId) {
      return reply.status(400).send({ error: "provider and modelId are required" });
    }
    const key = `${body.provider}:${body.modelId}`;
    const existing = localModelStates.get(key) || {
      provider: body.provider,
      modelId: body.modelId,
      displayName: null,
      enabled: null,
      tombstoned: false,
      updatedAt: new Date().toISOString(),
    };
    existing.tombstoned = !!body.tombstoned;
    existing.updatedAt = new Date().toISOString();
    localModelStates.set(key, existing);

    return reply.send({ states: Array.from(localModelStates.values()) });
  });

  // GET /api/radar/offers
  app.get("/radar/offers", async (_req, reply) => {
    return reply.send({
      offers: radarOffersCache.offers,
      meta: {
        version: radarOffersCache.version,
        tier: radarOffersCache.tier,
        fetchedAt: radarOffersCache.fetchedAt,
      },
    });
  });

  // POST /api/radar/offers/sync
  app.post("/radar/offers/sync", async (_req, reply) => {
    radarOffersCache.fetchedAt = new Date().toISOString();
    return reply.send({
      status: "updated",
      version: radarOffersCache.version,
    });
  });

  // GET /api/radar/intel
  app.get("/radar/intel", async (_req, reply) => {
    return reply.send({
      intel: radarIntelCache.intel,
      meta: {
        version: radarIntelCache.version,
        tier: radarIntelCache.tier,
        fetchedAt: radarIntelCache.fetchedAt,
        supporterVerified: radarIntelCache.supporterVerified,
      },
    });
  });

  // POST /api/radar/intel/sync
  app.post("/radar/intel/sync", async (_req, reply) => {
    radarIntelCache.fetchedAt = new Date().toISOString();
    return reply.send({
      status: "updated",
    });
  });
};
