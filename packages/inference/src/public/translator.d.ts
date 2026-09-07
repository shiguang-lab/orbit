export function initTranslators(): void;
export const FORMATS: Record<string, string>;
export function translateRequest(
  sourceFormat: string,
  targetFormat: string,
  model: string,
  body: unknown,
  stream?: boolean,
  credentials?: unknown,
  provider?: string | null,
  reqLogger?: unknown,
  options?: Record<string, unknown>,
): unknown;
