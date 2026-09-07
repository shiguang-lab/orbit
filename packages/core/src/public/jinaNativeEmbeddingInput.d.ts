export function isPlainObject(value: unknown): value is Record<string, unknown>;
export function isCanonicalEmbeddingItem(value: unknown): boolean;
export function isJinaNativeDoc(value: unknown): boolean;
export function isJinaMergedContentGroup(value: unknown): boolean;
export function isJinaNativeEmbeddingItem(value: unknown): boolean;
export function isJinaNativeEmbeddingInput(input: unknown): boolean;
export function collectJinaNativeModalities(
  input: unknown,
): Array<"text" | "image" | "audio" | "video" | "document">;
