import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { EmbeddedServiceProxyController } from "./embedded-service-proxy.controller.js";
import { EmbeddedServicesRuntimeService } from "./embedded-services-runtime.service.js";

@Module({
  imports: [CommonModule],
  controllers: [EmbeddedServiceProxyController],
  providers: [EmbeddedServicesRuntimeService],
})
export class EmbeddedServiceProxyModule {}
