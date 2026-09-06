export interface ApiKeyPolicyInfo {
  allowedConnections?: string[] | null;
  [key: string]: unknown;
}
export interface ApiKeyPolicyResult {
  apiKey: string | null;
  apiKeyInfo: ApiKeyPolicyInfo | null;
  rejection: Response | null;
}
export function enforceApiKeyPolicy(request: Request, modelStr: string | null): Promise<ApiKeyPolicyResult>;

