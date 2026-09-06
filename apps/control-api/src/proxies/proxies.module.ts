import { Module } from "@nestjs/common";
import { WebRouteDispatcher } from "../common/web-route.dispatcher.js";
import { ProxiesController } from "./proxies.controller.js";
import { ProxiesService } from "./proxies.service.js";

/** Control-plane management for the proxy registry and scope assignments. */
@Module({
  controllers: [ProxiesController],
  providers: [ProxiesService, WebRouteDispatcher],
})
export class ProxiesModule {}
