export interface AdobeFireflyBrowserLoginResult {
  success: boolean;
  credentials?: { accessToken?: string; cookie?: string };
  arpSessionId?: string;
  account?: string;
  error?: string;
}

export function startAdobeFireflyBrowserLogin(
  requestedTimeout?: unknown,
  options?: { sessionKey?: string; freshSession?: boolean },
): Promise<AdobeFireflyBrowserLoginResult>;
