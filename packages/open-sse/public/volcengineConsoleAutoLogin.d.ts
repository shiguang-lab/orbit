export interface VolcengineLoginSession {
  id: string;
  phase: string;
  [key: string]: unknown;
}

export interface VolcengineConsoleAutoLoginService {
  startLogin(phone: string, options?: { timeout?: number }): Promise<{
    ok: boolean;
    session?: VolcengineLoginSession;
    error?: string;
  }>;
  withBinding(
    sessionId: string,
    binder: (credentials: Record<string, unknown>) => Promise<unknown>,
  ): Promise<VolcengineLoginSession | null>;
  getStatus(sessionId: string): VolcengineLoginSession | null;
  submitCode(
    sessionId: string,
    code: string,
    captcha?: string,
    options?: { timeout?: number },
  ): Promise<VolcengineLoginSession | null>;
  selectIdentity(
    sessionId: string,
    index: number,
    options?: { timeout?: number },
  ): Promise<VolcengineLoginSession | null>;
  cancel(sessionId: string): Promise<VolcengineLoginSession | null>;
  resendCode(sessionId: string): Promise<VolcengineLoginSession | null>;
}

export const volcengineConsoleAutoLoginService: VolcengineConsoleAutoLoginService;
