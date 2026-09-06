export const CLI_LOCALE_CODES = Object.freeze([
  "ar", "az", "bg", "bn", "cs", "da", "de", "en", "es", "fa", "fi", "fr", "gu",
  "he", "hi", "hu", "id", "in", "it", "ja", "ko", "mr", "ms", "nl", "no", "phi",
  "pl", "pt-BR", "pt", "ro", "ru", "sk", "sv", "sw", "ta", "te", "th", "tr",
  "uk-UA", "ur", "vi", "zh-CN", "zh-TW",
]);

function displayName(code, locale) {
  try {
    return new Intl.DisplayNames([locale], { type: "language" }).of(code) ?? code;
  } catch {
    return code;
  }
}

export function listCliLocales() {
  return CLI_LOCALE_CODES.map((code) => ({
    code,
    english: displayName(code, "en"),
    native: displayName(code, code),
    flag: "🌐",
  }));
}
