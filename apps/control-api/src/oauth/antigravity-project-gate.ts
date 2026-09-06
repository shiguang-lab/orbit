/**
 * Antigravity OAuth connect-time degraded state for accounts without a Cloud
 * Code projectId. Connecting remains non-fatal so request-time discovery can
 * later heal the persisted connection.
 */

export type AntigravityDegradedProjectState = {
  testStatus: "degraded";
  errorCode: string;
  lastErrorType: string;
  lastError: string;
  warning: string;
};

const PROJECT_EXPECTED_PROVIDERS = new Set(["antigravity", "agy"]);

const BYOP_WARNING =
  "Connected, but Google did not assign a Cloud Code project to this account (BYOP). " +
  "Create a GCP Project at console.cloud.google.com and complete Gemini Code Assist onboarding; " +
  "the account is marked degraded until then and cannot serve requests.";

const DISCOVERY_FAILED_WARNING =
  "Connected, but the Google Cloud Code projectId could not be discovered during login " +
  "(loadCodeAssist/onboardUser failed). The account is marked degraded; discovery retries " +
  "automatically on the first request.";

export function antigravityDegradedProjectState(
  provider: string,
  tokenData: Record<string, unknown> | null | undefined,
): AntigravityDegradedProjectState | null {
  if (!PROJECT_EXPECTED_PROVIDERS.has(provider)) return null;
  const outcome = tokenData?.projectDiscoveryOutcome;
  if (!outcome) return null;
  console.warn(
    `[oauth] ${provider}: marking connection degraded — no Cloud Code projectId (${String(outcome)}) (#11284)`,
  );
  return {
    testStatus: "degraded",
    errorCode: "missing_project_id",
    lastErrorType: "oauth_missing_project_id",
    lastError: outcome === "requires_manual_project" ? BYOP_WARNING : DISCOVERY_FAILED_WARNING,
    warning: outcome === "requires_manual_project" ? BYOP_WARNING : DISCOVERY_FAILED_WARNING,
  };
}
