/** "omr_" followed by exactly 40 lowercase hexadecimal characters. */
export const SUPPORTER_KEY_REGEX = /^omr_[0-9a-f]{40}$/;

/** Validate without trimming; callers decide whether surrounding whitespace is allowed. */
export function isValidSupporterKeyFormat(key: string): boolean {
  return SUPPORTER_KEY_REGEX.test(key);
}
