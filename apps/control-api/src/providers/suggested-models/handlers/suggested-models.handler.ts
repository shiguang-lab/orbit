import { z } from "zod";
import { isAuthenticated } from "@shiguang-gateway/core-domain/control/authenticated";
import { CORS_HEADERS } from "@shiguang-gateway/contracts/cors";
import { buildErrorBody } from "@shiguang-gateway/open-sse/utils/error";

const HF_MODELS_API_URL = "https://huggingface.co/api/models";
const HF_SEARCH_PAGE_SIZE = 100;
const HF_FETCH_TIMEOUT_MS = 8000;

const querySchema = z.object({
  type: z.enum(["image"]).default("image"),
  sortBy: z.enum(["downloads", "likes"]).default("downloads"),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const SUGGESTED_MODEL_KIND_PIPELINE_TAGS: Readonly<Record<string, string>> = {
  image: "text-to-image",
};

interface HfModelSummary {
  id: string;
  likes?: number;
  downloads?: number;
  pipeline_tag?: string;
}

function errorResponse(status: number, message: string): Response {
  return Response.json(buildErrorBody(status, message), { status, headers: CORS_HEADERS });
}

function sortSuggestedModels(
  models: readonly HfModelSummary[],
  sortBy: "downloads" | "likes",
  limit: number,
): HfModelSummary[] {
  const valid = models.filter(
    (model): model is HfModelSummary =>
      !!model && typeof model.id === "string" && model.id.trim().length > 0,
  );

  return [...valid]
    .sort((a, b) => {
      const bValue = Number(b[sortBy]);
      const aValue = Number(a[sortBy]);
      return (Number.isFinite(bValue) ? bValue : 0) - (Number.isFinite(aValue) ? aValue : 0);
    })
    .slice(0, limit);
}

export function OPTIONS(): Response {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET(request: Request): Promise<Response> {
  if (!(await isAuthenticated(request))) return errorResponse(401, "Authentication required");

  const searchParams = new URL(request.url).searchParams;
  const parsed = querySchema.safeParse({
    type: searchParams.get("type") ?? undefined,
    sortBy: searchParams.get("sortBy") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return errorResponse(400, parsed.error.issues[0]?.message ?? "Invalid query parameters");
  }

  const { type, sortBy, limit } = parsed.data;
  const pipelineTag = SUGGESTED_MODEL_KIND_PIPELINE_TAGS[type];
  if (!pipelineTag) return errorResponse(400, `Unsupported suggested-models type: ${type}`);

  try {
    const upstreamUrl = new URL(HF_MODELS_API_URL);
    upstreamUrl.searchParams.set("inference_provider", "hf-inference");
    upstreamUrl.searchParams.set("pipeline_tag", pipelineTag);
    upstreamUrl.searchParams.set("limit", String(HF_SEARCH_PAGE_SIZE));

    const upstream = await fetch(upstreamUrl.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(HF_FETCH_TIMEOUT_MS),
    });
    if (!upstream.ok) {
      return errorResponse(502, `HuggingFace Hub API responded with status ${upstream.status}`);
    }

    const raw: unknown = await upstream.json();
    const models: HfModelSummary[] = Array.isArray(raw)
      ? raw.filter(
          (model): model is HfModelSummary =>
            !!model && typeof model === "object" && typeof (model as { id?: unknown }).id === "string",
        )
      : [];
    const suggested = sortSuggestedModels(models, sortBy, limit);

    return Response.json(
      {
        object: "list",
        type,
        pipeline_tag: pipelineTag,
        data: suggested.map((model) => ({
          id: model.id,
          likes: typeof model.likes === "number" ? model.likes : 0,
          downloads: typeof model.downloads === "number" ? model.downloads : 0,
        })),
      },
      { headers: CORS_HEADERS },
    );
  } catch (error) {
    return errorResponse(502, error instanceof Error ? error.message : String(error));
  }
}
