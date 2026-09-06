import { Injectable, OnModuleInit } from "@nestjs/common";
import { bootstrapEmbeddedServices } from "./embedded-services-runtime.js";
import { initEmbedWsProxy } from "./embedded-service-ws-proxy.js";

/** Owns embedded-service process supervision and its WebSocket transport. */
@Injectable()
export class EmbeddedServicesRuntimeService implements OnModuleInit {
  async onModuleInit(): Promise<void> {
    await bootstrapEmbeddedServices();
    initEmbedWsProxy();
  }
}
