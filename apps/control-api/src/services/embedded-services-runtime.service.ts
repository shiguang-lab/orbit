import { Injectable, type OnModuleDestroy, type OnModuleInit } from "@nestjs/common";
import { stopAllSupervisors } from "@shiguang-gateway/core-domain/control/embedded-services-runtime-support";
import { bootstrapEmbeddedServices } from "./embedded-services-runtime.js";
import { initEmbedWsProxy } from "./embedded-service-ws-proxy.js";

/** Owns embedded-service process supervision and its WebSocket transport. */
@Injectable()
export class EmbeddedServicesRuntimeService implements OnModuleInit, OnModuleDestroy {
  async onModuleInit(): Promise<void> {
    await bootstrapEmbeddedServices();
    initEmbedWsProxy();
  }

  async onModuleDestroy(): Promise<void> {
    await stopAllSupervisors();
  }
}
