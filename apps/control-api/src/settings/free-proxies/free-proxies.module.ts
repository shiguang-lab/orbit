import { Module } from "@nestjs/common";
import { FreeProxiesController } from "./free-proxies.controller.js";
import { FreeProxiesService } from "./free-proxies.service.js";

/** Control-plane catalog and promotion API for externally sourced proxies. */
@Module({
  controllers: [FreeProxiesController],
  providers: [FreeProxiesService],
})
export class FreeProxiesModule {}
