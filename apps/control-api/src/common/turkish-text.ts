const TR_FOLD: Readonly<Record<string, string>> = {
  ı: "i",
  ş: "s",
  ğ: "g",
  ü: "u",
  ö: "o",
  ç: "c",
};

export function normalizeForSearch(input: string | null | undefined): string {
  if (!input) return "";
  let normalized = input.toLocaleLowerCase("tr");
  normalized = normalized.replace(/[ışğüöç]/g, (character) => TR_FOLD[character] ?? character);
  normalized = normalized.normalize("NFD").replace(/[̀-ͯ]/g, "");
  return normalized.trim();
}

export function matchesSearch(
  text: string | null | undefined,
  query: string | null | undefined,
): boolean {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;
  return normalizeForSearch(text).includes(normalizedQuery);
}

export function matchesAnyToken(
  text: string | null | undefined,
  query: string | null | undefined,
): boolean {
  const normalizedQuery = normalizeForSearch(query);
  if (!normalizedQuery) return true;
  const normalizedText = normalizeForSearch(text);
  if (normalizedText.includes(normalizedQuery)) return true;
  return normalizedQuery.split(/\s+/).filter(Boolean).some((token) => normalizedText.includes(token));
}

const trCollator = new Intl.Collator("tr", {
  sensitivity: "base",
  numeric: true,
});

export function compareTr(a: string | null | undefined, b: string | null | undefined): number {
  return trCollator.compare(a ?? "", b ?? "");
}
