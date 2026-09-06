export interface InAppLoginService {
  startLogin(
    provider: string,
    options?: { timeout?: number },
  ): Promise<{
    success: boolean;
    credentials?: Record<string, unknown>;
    error?: string;
  }>;
}

export const inAppLoginService: InAppLoginService;
