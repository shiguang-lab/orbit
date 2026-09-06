import { Injectable } from "@nestjs/common";

type RateLimitApi = { getAllRateLimitStatus(): unknown };
type SemaphoreApi = { getStats(): unknown; resetAll(): void };

const load = <T>(specifier: string): Promise<T> => import(specifier) as Promise<T>;

/** Use cases for the operator concurrency diagnostics endpoint. */
@Injectable()
export class AdminConcurrencyService {
  async status() {
    const [{ getAllRateLimitStatus }, { getStats }] = await Promise.all([
      load<RateLimitApi>("@shiguang-gateway/open-sse/services/rateLimitManager"),
      load<SemaphoreApi>("@shiguang-gateway/open-sse/services/accountSemaphore"),
    ]);
    return {
      timestamp: new Date().toISOString(),
      rateLimits: getAllRateLimitStatus(),
      semaphores: getStats(),
    };
  }

  async resetSemaphores() {
    const { resetAll } = await load<SemaphoreApi>(
      "@shiguang-gateway/open-sse/services/accountSemaphore",
    );
    resetAll();
  }
}
