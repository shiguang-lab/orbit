export interface ConolBrowserLoginResult {
  success: boolean;
  credentials?: { cookie: string };
  error?: string;
}

export function startConolBrowserLogin(
  requestedTimeout?: unknown,
): Promise<ConolBrowserLoginResult>;
