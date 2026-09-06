export type OwnedRoute = {
  path: string;
  methods: readonly ("GET" | "POST" | "DELETE" | "OPTIONS")[];
};

export const ownedEdgeRoutes: readonly OwnedRoute[] = [
  { path: "/a2a", methods: ["OPTIONS", "POST"] },
  { path: "/a2a/tasks", methods: ["GET", "POST"] },
  { path: "/a2a/tasks/:id", methods: ["GET"] },
  { path: "/a2a/tasks/:id/cancel", methods: ["POST"] },
  { path: "/a2a/status", methods: ["GET"] },
  { path: "/v1/audio/speech", methods: ["OPTIONS", "POST"] },
  { path: "/v1/agents/health", methods: ["GET", "OPTIONS"] },
  { path: "/v1/agents/credentials", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/agents/tasks", methods: ["DELETE", "GET", "OPTIONS", "POST"] },
  { path: "/v1/agents/tasks/:id", methods: ["DELETE", "GET", "OPTIONS", "POST"] },
  { path: "/v1/audio/transcriptions", methods: ["OPTIONS", "POST"] },
  { path: "/v1/audio/translations", methods: ["OPTIONS", "POST"] },
  { path: "/v1/batches", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/batches/delete-completed", methods: ["DELETE", "OPTIONS"] },
  { path: "/v1/batches/:id", methods: ["DELETE", "GET", "OPTIONS"] },
  { path: "/v1/batches/:id/cancel", methods: ["OPTIONS", "POST"] },
  { path: "/v1/embeddings", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/classify", methods: ["OPTIONS", "POST"] },
  { path: "/v1/combos", methods: ["GET", "OPTIONS"] },
  { path: "/v1/files", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/files/:id", methods: ["DELETE", "GET", "OPTIONS"] },
  { path: "/v1/files/:id/content", methods: ["GET", "OPTIONS"] },
  { path: "/v1/images/edits", methods: ["OPTIONS", "POST"] },
  { path: "/v1/images/generations", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/images/upscale", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/moderations", methods: ["OPTIONS", "POST"] },
  { path: "/v1/ocr", methods: ["OPTIONS", "POST"] },
  { path: "/v1/music/generations", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/rerank", methods: ["OPTIONS", "POST"] },
  { path: "/v1/segment", methods: ["OPTIONS", "POST"] },
  { path: "/v1/session-leases", methods: ["OPTIONS", "POST"] },
  { path: "/v1/speech-to-text", methods: ["OPTIONS", "POST"] },
  { path: "/v1/text-to-speech/:voiceId", methods: ["OPTIONS", "POST"] },
  { path: "/v1/voices", methods: ["GET", "OPTIONS"] },
  { path: "/v1/web/fetch", methods: ["OPTIONS", "POST"] },
  { path: "/v1/videos/generations", methods: ["GET", "OPTIONS", "POST"] },
  { path: "/v1/ws", methods: ["GET", "OPTIONS"] },
  { path: "/v1/providers/:provider/models", methods: ["GET", "OPTIONS"] },
];

/** Paths physically owned by edge-gateway, expressed as compatibility catalog segments. */
export const ownedEdgeRouteKeys = new Set(
  ownedEdgeRoutes.map((route) => route.path.replace(/^\//, "").replace(/:([^/]+)/g, "[$1]")),
);

/** Relative paths consumed by the Nest controller under both /v1 and /api/v1. */
export const ownedEdgeControllerPaths = ownedEdgeRoutes.map((route) => route.path.replace(/^\/v1\/?/, ""));

export const ownedEdgeRoutesByPath = new Map(ownedEdgeRoutes.map((route) => [route.path, route]));
