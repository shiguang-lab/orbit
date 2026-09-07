/**
 * Stub for the control Zed keychain reader activated by
 * `SHIGUANG_GATEWAY_BUILD_PROFILE=minimal`. The keychain-read code path is removed
 * from the built bundle. See SECURITY.md and
 * docs/security/SOCKET_DEV_FINDINGS.md.
 */
const FEATURE = "zed-keychain-import";

function featureDisabledError(featureName: string): Error {
  return new Error(
    `Feature "${featureName}" is disabled in this build (SHIGUANG_GATEWAY_BUILD_PROFILE=minimal). ` +
      "Install the full shiguangGateway artifact instead of shiguangGateway-secure if you need this feature.",
  );
}

export interface ZedCredential {
  provider: string;
  service: string;
  account: string;
  token: string;
}

export async function discoverZedCredentials(): Promise<ZedCredential[]> {
  throw featureDisabledError(FEATURE);
}

export async function getZedCredential(_provider: string): Promise<ZedCredential | null> {
  throw featureDisabledError(FEATURE);
}

export async function isZedInstalled(): Promise<boolean> {
  return false;
}
