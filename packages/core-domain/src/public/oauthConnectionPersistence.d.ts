export function safeEqual(a: string | null | undefined, b: string | null | undefined): boolean;
export function findExistingOAuthConnectionMatch(
  existing: Array<Record<string, any>>,
  provider: string,
  tokenData: Record<string, any>,
  connectionId?: string
): Record<string, any> | undefined;
export function buildOAuthConnectionCreatePayload(
  provider: string,
  tokenData: Record<string, any>,
  expiresAt: string | null,
  degradedProject?: {
    testStatus: "degraded";
    errorCode: string;
    lastErrorType: string;
    lastError: string;
  } | null
): Record<string, any>;
export function persistOAuthConnection(
  provider: string,
  tokenData: Record<string, any>,
  connectionId?: string
): Promise<Record<string, any>>;
