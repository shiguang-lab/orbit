/** Match a string against a case-insensitive glob containing `*` and `?`. */
export function wildcardMatch(value: string, pattern: string): boolean {
  if (!value || !pattern) return false;
  if (pattern === "*" || pattern === value) return true;
  const expression = pattern
    .replace(/[.+^${}()|[\]\\]/g, "\\$&")
    .replace(/\*/g, ".*")
    .replace(/\?/g, ".");
  return new RegExp(`^${expression}$`, "i").test(value);
}
