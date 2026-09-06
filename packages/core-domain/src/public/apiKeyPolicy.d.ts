export interface ApiKeyPolicyInfo {
  id?: string;
  name?: string;
  allowedConnections?: string[] | null;
  [key: string]: unknown;
}
export interface ApiKeyPolicyResult {
  apiKey: string | null;
  apiKeyInfo: ApiKeyPolicyInfo | null;
  rejection: Response | null;
}
export function enforceApiKeyPolicy(request: Request, modelStr: string | null): Promise<ApiKeyPolicyResult>;
export function validateApiKeyRoutingTarget(
  request: Request,
  apiKey: string | null,
  apiKeyInfo: ApiKeyPolicyInfo | null,
  modelStr: string | null,
): Promise<Response | null>;
