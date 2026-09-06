/** OAuth constants that are independent of a transport or persistence layer. */

/** CodeBuddy CN (Tencent) custom device-auth flow configuration. */
export const CODEBUDDY_CN_CONFIG = {
  baseUrl: "https://copilot.tencent.com",
  stateUrl: "https://copilot.tencent.com/v2/plugin/auth/state",
  tokenUrl: "https://copilot.tencent.com/v2/plugin/auth/token",
  refreshUrl: "https://copilot.tencent.com/v2/plugin/auth/token/refresh",
  userAgent: "CLI/2.63.2 CodeBuddy/2.63.2",
  platform: "CLI",
  pollInterval: 5000,
} as const;

/** Canonical AWS region shape accepted by Kiro's OAuth endpoints. */
export const AWS_REGION_PATTERN = /^[a-z]{2}-[a-z]+-\d{1,2}$/;

export function assertValidAwsRegion(region: string): string {
  if (typeof region !== "string" || !AWS_REGION_PATTERN.test(region)) {
    throw new Error("Invalid region");
  }
  return region;
}
