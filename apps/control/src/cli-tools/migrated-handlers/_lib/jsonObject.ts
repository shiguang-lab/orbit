export type JsonObject = Record<string, unknown>;

export function isJsonObject(value: unknown): value is JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function parseJsonObject(content: string): JsonObject {
  const parsed: unknown = JSON.parse(content);
  if (!isJsonObject(parsed)) {
    throw new TypeError("Expected a JSON object");
  }
  return parsed;
}

export function errorCode(error: unknown): string | undefined {
  return isJsonObject(error) && typeof error.code === "string" ? error.code : undefined;
}
