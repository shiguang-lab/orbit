import type { ProviderCredentials } from "./base.ts";

export async function resolveCliproxyManagerTarget(
  credentials: ProviderCredentials,
): Promise<string> {
  const data = credentials?.providerSpecificData;
  const managerId = data?.cliproxyManagerId;
  const processId = data?.cliproxyProcessId;
  const credentialId = data?.cliproxyCredentialId;
  if (
    typeof managerId !== "string" ||
    typeof processId !== "string" ||
    typeof credentialId !== "string"
  ) {
    throw new Error(
      "Select a CLIProxyAPI instance and credential in the model combo",
    );
  }
  const { resolveCliproxyCredentialTarget } = await import(
    "@orbit/core/control/service-nodes"
  );
  return resolveCliproxyCredentialTarget(managerId, processId, credentialId);
}
