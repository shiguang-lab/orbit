import { Injectable, type OnModuleInit, type OnApplicationShutdown } from "@nestjs/common";
import { onAny } from "@orbit/core/events/eventBus";
import { getInternalServiceAuthHeaders } from "@orbit/auth/internal-service";
import { startRealtimePublisher } from "@orbit/utils/realtime";

@Injectable()
export class RealtimePublisherLifecycleService implements OnModuleInit, OnApplicationShutdown {
  private publisher: ReturnType<typeof startRealtimePublisher> | undefined;

  onModuleInit(): void {
    this.publisher = startRealtimePublisher({
      url: process.env.SHIGUANG_GATEWAY_REALTIME_EVENT_URL,
      subscribe: onAny,
      headers: getInternalServiceAuthHeaders,
      onError: (error) => console.warn("[realtime-publisher] delivery failed:", error instanceof Error ? error.message : String(error)),
    });
  }

  async onApplicationShutdown(): Promise<void> {
    await this.publisher?.close();
    this.publisher = undefined;
  }
}
