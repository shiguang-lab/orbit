const ANY_ZERO_WIDTH = /[\u200B-\u200D\uFEFF]/;
const ZERO_WIDTH_SPACE_OR_BOM = /[\u200B\uFEFF]/g;
const JOINER_BETWEEN_ASCII_WORD_CHARS =
  /(?<=[A-Za-z0-9_])[\u200C\u200D]+(?=[A-Za-z0-9_]|$)|^[\u200C\u200D]+(?=[A-Za-z0-9_])/g;

/** Remove request-side ASCII obfuscation markers while preserving linguistic/emoji joiners. */
export function stripObfuscationZeroWidth(text: string): string {
  if (!text || !ANY_ZERO_WIDTH.test(text)) return text;
  return text.replace(ZERO_WIDTH_SPACE_OR_BOM, "").replace(JOINER_BETWEEN_ASCII_WORD_CHARS, "");
}
