export type WebCookieValidationResult = {
  valid: boolean;
  error: string | null;
  errorCode?: string;
  unsupported?: boolean;
};
export function validateWebCookieProvider(input: {
  provider: string;
  apiKey?: string;
  providerSpecificData?: Record<string, unknown>;
}): Promise<WebCookieValidationResult>;
export function bytezValidationResultFromStatus(status: number): {
  valid: boolean;
  error: string | null;
};
