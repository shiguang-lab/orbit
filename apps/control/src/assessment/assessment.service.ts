import { Injectable } from "@nestjs/common";
import { Assessor, Categorizer, SelfHealer } from "@orbit/core/control/assessment";
import type { AssessmentScope, AssessmentTrigger, ModelCategory } from "@orbit/core/control/assessment";
import { validateBody } from "@orbit/core/shared/validation/helpers";
import { z } from "zod";

const modelCategories = new Set<ModelCategory>([
  "coding", "reasoning", "reasoning_deep", "chat", "fast", "vision", "tool_call", "structured_output",
]);
const scopeSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("all") }),
  z.object({ type: z.literal("provider"), providerId: z.string().min(1) }),
  z.object({ type: z.literal("model"), modelId: z.string().min(1) }),
]);
const postSchema = z.object({
  scope: scopeSchema.optional().default({ type: "all" }),
  trigger: z.enum(["scheduled", "on_demand", "on_provider_change", "on_error", "startup"]).optional().default("on_demand"),
});

const runtimeBaseUrl = process.env.ORBIT_BASE_URL ?? process.env.INTERNAL_BASE_URL ?? "http://127.0.0.1:8787";
const runtimeApiKey = process.env.ORBIT_API_KEY ?? process.env.API_KEY ?? "";
const runtimeV1BaseUrl = `${runtimeBaseUrl.replace(/\/$/, "")}${/\/v1$/i.test(runtimeBaseUrl) ? "" : "/v1"}`;

@Injectable()
export class AssessmentService {
  private readonly assessor = new Assessor(runtimeApiKey, runtimeV1BaseUrl);
  private readonly categorizer = new Categorizer();
  // Reserved for the assessment domain's self-healing lifecycle.
  private readonly healer = new SelfHealer();

  async run(body: unknown): Promise<{ status: number; payload: unknown }> {
    const validation = validateBody(postSchema, body);
    if (!validation.success) return { status: 400, payload: { error: validation.error } };
    const scope: AssessmentScope = validation.data.scope;
    const trigger: AssessmentTrigger = validation.data.trigger;
    let models: Array<{ providerId: string; modelId: string }>;
    if (scope.type === "provider") models = await this.getModelsForProvider(scope.providerId);
    else if (scope.type === "model") models = [{ providerId: scope.modelId.split("/")[0], modelId: scope.modelId.split("/")[1] }];
    else models = await this.getAllModels();
    const run = await this.assessor.runAssessment(models, trigger);
    for (const assessment of this.assessor.getAllAssessments()) this.categorizer.assignCategoriesAndFitness(assessment);
    return { status: 200, payload: { run_id: run.id, status: "completed", models_tested: run.modelsTested, models_passed: run.modelsPassed, models_failed: run.modelsFailed, models_rate_limited: run.modelsRateLimited, duration_ms: run.durationMs } };
  }

  list(url: string): unknown {
    const action = new URL(url, runtimeBaseUrl).searchParams.get("action");
    if (action === "results") {
      const params = new URL(url, runtimeBaseUrl).searchParams;
      let results = this.assessor.getAllAssessments();
      const status = params.get("status"); const provider = params.get("provider"); const category = params.get("category");
      if (status) results = results.filter((a) => a.status === status);
      if (provider) results = results.filter((a) => a.providerId === provider);
      if (category && modelCategories.has(category as ModelCategory)) results = results.filter((a) => a.categories.includes(category as ModelCategory));
      return { models: results };
    }
    if (action === "combo-health") return { combos: [], message: "Combo health requires DB access" };
    if (action === "working") return { models: this.assessor.getWorkingModels() };
    return { endpoints: { "GET ?action=results": "Get assessment results (filter: status, provider, category)", "GET ?action=combo-health": "Get combo health status", "GET ?action=working": "Get working models only", "POST { scope, trigger }": "Run assessment" } };
  }

  private async getAllModels(): Promise<Array<{ providerId: string; modelId: string }>> {
    const response = await fetch(`${runtimeV1BaseUrl}/models`, { headers: runtimeApiKey ? { Authorization: `Bearer ${runtimeApiKey}` } : undefined });
    if (!response.ok) throw new Error(`Model catalog request failed: HTTP ${response.status}`);
    const data = (await response.json()) as { data?: unknown };
    return (Array.isArray(data.data) ? data.data : [])
      .filter((model): model is { id: string } => !!model && typeof model === "object" && typeof (model as { id?: unknown }).id === "string")
      .filter((model) => model.id.startsWith("auto/"))
      .map((model) => ({ providerId: "auto", modelId: model.id.replace("auto/", "") }));
  }
  private getModelsForProvider(_providerId: string) { return this.getAllModels(); }
}
