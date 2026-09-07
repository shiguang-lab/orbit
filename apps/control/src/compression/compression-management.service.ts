import { Injectable } from "@nestjs/common";
import {
  benchmarkEngines,
  compareReports,
  DEFAULT_BENCHMARK_ENGINES,
} from "@orbit/inference/services/compression/harness/benchmark";
import {
  registerBuiltinCompressionEngines,
} from "@orbit/inference/services/compression/engines/index";
import { listCompressionEngines } from "@orbit/inference/services/compression/engines/registry";
import {
  listCavemanRulePacks,
  listSupportedCompressionLanguages,
} from "@orbit/inference/services/compression";
import {
  retrieveBlock,
} from "@orbit/inference/services/compression/engines/ccr/index";
import { queryBlock } from "@orbit/inference/services/compression/engines/ccr/ccrQuery";
import { sanitizeErrorMessage } from "@orbit/utils/errors";

@Injectable()
export class CompressionManagementService {
  listEngines() {
    registerBuiltinCompressionEngines();
    return listCompressionEngines().map((engine) => ({
      id: engine.id,
      name: engine.name,
      description: engine.description,
      icon: engine.icon,
      stackable: engine.stackable,
      stackPriority: engine.stackPriority,
      metadata: engine.metadata,
      configSchema: engine.getConfigSchema(),
    }));
  }

  listLanguagePacks() {
    return {
      languages: listSupportedCompressionLanguages(),
      packs: listCavemanRulePacks(),
    };
  }

  async compare(messages: Array<{ role: string; content: unknown }>, engineIds?: string[]) {
    const text = messages
      .map((message) => `${message.role}: ${typeof message.content === "string" ? message.content : JSON.stringify(message.content)}`)
      .join("\n");
    const reports = await benchmarkEngines(
      [{ id: "input", input: text }],
      engineIds ?? DEFAULT_BENCHMARK_ENGINES,
    );
    return { rows: compareReports(reports) };
  }

  retrieve(options: {
    hash: string;
    mode?: "full" | "head" | "tail" | "lines" | "grep" | "stats";
    n?: number;
    start?: number;
    end?: number;
    pattern?: string;
    unique?: boolean;
  }) {
    const block = retrieveBlock(options.hash);
    if (block == null) return { found: false };
    if (!options.mode || options.mode === "full") return { found: true, block };
    const result = queryBlock(block, options);
    return "content" in result
      ? { found: true, block: result.content }
      : { found: true, error: result.error };
  }

  errorMessage(error: unknown) {
    return sanitizeErrorMessage(error);
  }
}
