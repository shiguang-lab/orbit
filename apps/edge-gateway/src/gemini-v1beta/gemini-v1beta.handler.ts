import { GET as getModels, OPTIONS as modelsOptions } from "@shiguang-gateway/core-domain/edge/v1beta-models";
import { POST as generate, OPTIONS as generateOptions } from "@shiguang-gateway/core-domain/edge/v1beta-generate";

export function OPTIONS(): Response {
  return modelsOptions();
}

export function GET(): Promise<Response> {
  return getModels();
}

export function POST(request: Request, path: string[]): Promise<Response> {
  return generate(request, { params: Promise.resolve({ path }) });
}

export function OPTIONS_GENERATE(): Response {
  return generateOptions();
}
