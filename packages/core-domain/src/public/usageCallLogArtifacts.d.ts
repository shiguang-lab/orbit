import type { RequestPipelinePayloads } from "@shiguang-gateway/contracts/request-pipeline-payloads";

type CallLogArtifact = {
  schemaVersion: 5;
  summary: {
    id: string;
    timestamp: string;
    method: string;
    path: string;
    status: number;
    model: string;
    requestedModel: string | null;
    provider: string;
    account: string;
    connectionId: string | null;
    duration: number;
    tokens: {
      in: number;
      out: number;
      cacheRead: number | null;
      cacheWrite: number | null;
      reasoning: number | null;
      compressed: number | null;
    };
    requestType: string | null;
    sourceFormat: string | null;
    targetFormat: string | null;
    apiKeyId: string | null;
    apiKeyName: string | null;
    comboName: string | null;
    comboStepId: string | null;
    comboExecutionKey: string | null;
  };
  requestBody: unknown;
  responseBody: unknown;
  error: unknown;
  pipeline?: RequestPipelinePayloads;
};

export function readCallArtifact(relativePath: string | null): {
  artifact: CallLogArtifact | null;
  state: "ready" | "missing" | "corrupt";
};
