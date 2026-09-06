/**
 * Client-safe numeric formatting helpers shared by applications and runtime
 * packages.  Keep this module free of persistence or Node-only dependencies.
 */

/**
 * Safely extract a finite percentage value from an unknown payload.
 *
 * Quota APIs may return malformed or missing values; callers can distinguish
 * those cases from a legitimate numeric zero by checking for `undefined`.
 */
export function safePercentage(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
