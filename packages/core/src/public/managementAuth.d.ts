export interface ManagementAuthOptions {
  alwaysRequireAuth?: boolean;
  invalidApiKeyStatus?: 401 | 403;
  acceptMcpConnectScope?: boolean;
}

export function requireManagementAuth(
  request?: Request | null,
  options?: ManagementAuthOptions,
): Promise<Response | null>;
