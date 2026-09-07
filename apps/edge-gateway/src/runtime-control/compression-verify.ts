import type { EdgeRuntimeCommand } from "@orbit/contracts/edge-runtime-command";
import { calculateCost } from "@orbit/core/pricing/cost-calculator";
import type { ExecuteInput, ProviderCredentials } from "@orbit/inference/executors/base";
import { getExecutor } from "@orbit/inference/executors/index";
import { getProviderCredentials } from "@orbit/inference/services/auth";
import { judgeFidelityBatch } from "@orbit/inference/services/compression/eval/fidelityCheck";
import type {
  ChatTurn,
  ModelCallResult,
  ModelClient,
} from "@orbit/inference/services/compression/eval/types";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";

type CompressionVerifyCommand = Extract<EdgeRuntimeCommand, { command: "compression.verify" }>;

function createPricedJudgeClient(
  provider: string,
  credentials: ProviderCredentials,
): ModelClient {
  return {
    async complete(model: string, messages: ChatTurn[]): Promise<ModelCallResult> {
      const executor = await getExecutor(provider);
      const input: ExecuteInput = {
        model,
        body: { model, messages, stream: false },
        stream: false,
        credentials,
      };
      const raw = (await executor.execute(input)) as { response: Response };
      const json = (await raw.response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: { prompt_tokens?: number; completion_tokens?: number };
      };
      const text = json.choices?.[0]?.message?.content ?? "";
      const usdCost = await calculateCost(provider, model, {
        prompt_tokens: json.usage?.prompt_tokens,
        completion_tokens: json.usage?.completion_tokens,
      });
      return usdCost > 0 ? { text, usdCost } : { text };
    },
  };
}

export async function executeCompressionVerify(command: CompressionVerifyCommand): Promise<
  | { ok: true; value: unknown }
  | { ok: false; status: number; message: string }
> {
  try {
    const rawCredentials = await getProviderCredentials(command.provider);
    if (!rawCredentials) {
      return {
        ok: false,
        status: 400,
        message: `No credentials configured for provider "${command.provider}"`,
      };
    }
    const looksLikeCredentials =
      typeof rawCredentials === "object" &&
      rawCredentials !== null &&
      "connectionId" in rawCredentials &&
      ("apiKey" in rawCredentials || "accessToken" in rawCredentials);
    if (!looksLikeCredentials) {
      return {
        ok: false,
        status: 503,
        message: `Provider "${command.provider}" credentials are unavailable`,
      };
    }

    const client = createPricedJudgeClient(
      command.provider,
      rawCredentials as unknown as ProviderCredentials,
    );
    return {
      ok: true,
      value: await judgeFidelityBatch(
        client,
        command.judgeModel,
        command.items,
        command.costCapUsd,
      ),
    };
  } catch (error) {
    return {
      ok: false,
      status: 500,
      message: sanitizeErrorMessage(error instanceof Error ? error.message : String(error)),
    };
  }
}
