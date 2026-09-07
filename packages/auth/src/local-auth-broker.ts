/**
 * 本地 SSO Broker：移植自 asset-hub apps/web/dev/local-auth-broker.ts。
 *
 * 机制：用配置的真实 shiguang 账号调线上 auth-service 的 /api/auth/local-broker，
 * 换 brokerToken + identityToken + session(带 localBroker 标记)。
 *  - Gateway 的 /api/auth/session 返回 broker session(本地即"已登录"，身份来自线上)
 *  - 业务路由注入 broker 的 identityToken 作为 x-sg-identity
 *
 * 前提(auth-service 部署配置)：
 *  - LOCAL_BROKER_POLICIES 需含 orbit 产品条目(publicOrigin 指向本地 Gateway origin)
 *  - 提供真实 shiguang 账号(SG_BROKER_USERNAME / SG_BROKER_PASSWORD)
 *
 * broker 不可用时返回不可用状态，由前端显示明确错误，不注入模拟身份。
 */
const REFRESH_SKEW_MS = 15_000;
const PRODUCT_ID = "orbit";

export interface LocalBrokerSession {
  authenticated: true;
  subject: string;
  displayName?: string;
  email?: string;
  preferredUsername?: string;
  organization?: { id: string; name: string } | null;
  roles?: string[];
  platformRoles?: string[];
  entitlements?: string[];
  localBroker: true;
}

interface BrokerResponse {
  brokerToken: string;
  brokerExpiresAt: string;
  identityToken: string;
  identityExpiresAt: string;
  session: Omit<LocalBrokerSession, "localBroker">;
}

export interface LocalAuthBrokerOptions {
  authTarget: string;
  loginName: string;
  password: string;
  fetchImpl?: typeof fetch;
  now?: () => number;
}

export class LocalAuthBroker {
  private brokerToken: string | null = null;
  private brokerExpiresAt = 0;
  private identityToken: string | null = null;
  private identityExpiresAt = 0;
  private sessionValue: LocalBrokerSession | null = null;
  private pending: Promise<string> | null = null;
  private readonly fetchImpl: typeof fetch;
  private readonly now: () => number;
  private readonly authTarget: string;

  constructor(private readonly options: LocalAuthBrokerOptions) {
    this.authTarget = options.authTarget.replace(/\/$/, "");
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.now = options.now ?? Date.now;
  }

  get enabled(): boolean {
    return Boolean(this.options.loginName && this.options.password);
  }

  async identity(): Promise<string | null> {
    if (!this.enabled) return null;
    try {
      if (this.identityToken && this.identityExpiresAt - this.now() > REFRESH_SKEW_MS) {
        return this.identityToken;
      }
      if (!this.pending) {
        this.pending = this.refreshOrLogin().finally(() => {
          this.pending = null;
        });
      }
      return await this.pending;
    } catch (err) {
      console.warn("[gateway:broker] identity unavailable:", (err as Error).message);
      return null;
    }
  }

  async session(): Promise<LocalBrokerSession | null> {
    await this.identity();
    return this.sessionValue;
  }

  private async refreshOrLogin(): Promise<string> {
    if (this.brokerToken && this.brokerExpiresAt > this.now()) {
      const response = await this.fetchBroker("/api/auth/local-broker/refresh", {
        headers: { Authorization: `Bearer ${this.brokerToken}` },
      });
      if (response.status !== 401) return this.consume(response);
      this.clear();
    }
    return this.consume(
      await this.fetchBroker("/api/auth/local-broker", {
        body: JSON.stringify({
          loginName: this.options.loginName,
          password: this.options.password,
          productId: PRODUCT_ID,
        }),
      }),
    );
  }

  private async fetchBroker(
    path: string,
    init: { body?: string; headers?: Record<string, string> },
  ): Promise<Response> {
    return this.fetchImpl(`${this.authTarget}${path}`, {
      method: "POST",
      redirect: "error",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        // 与 asset-hub 一致：Origin 用 authTarget(shiguanglab.com)，匹配 auth-service PUBLIC_ORIGIN
        Origin: this.authTarget,
        ...(init.headers ?? {}),
      },
      body: init.body,
    });
  }

  private async consume(response: Response): Promise<string> {
    if (!response.ok) {
      let code = "broker_unavailable";
      try {
        const body = (await response.json()) as { error?: string };
        code = body.error ?? code;
      } catch {
        // status + 稳定错误码足够，不包含上游 body
      }
      throw new Error(`Local auth broker failed (${response.status}: ${code})`);
    }
    const body = (await response.json()) as BrokerResponse;
    if (
      !body.brokerToken ||
      !body.identityToken ||
      !body.session?.subject ||
      !Number.isFinite(Date.parse(body.brokerExpiresAt)) ||
      !Number.isFinite(Date.parse(body.identityExpiresAt))
    ) {
      throw new Error("Local auth broker returned an invalid response");
    }
    this.brokerToken = body.brokerToken;
    this.brokerExpiresAt = Date.parse(body.brokerExpiresAt);
    this.identityToken = body.identityToken;
    this.identityExpiresAt = Date.parse(body.identityExpiresAt);
    this.sessionValue = { ...body.session, authenticated: true, localBroker: true };
    return body.identityToken;
  }

  private clear(): void {
    this.brokerToken = null;
    this.brokerExpiresAt = 0;
    this.identityToken = null;
    this.identityExpiresAt = 0;
    this.sessionValue = null;
  }
}
