import { Module } from "@nestjs/common";
import { OneproxyController } from "./oneproxy.controller.js";
import { OneproxyService } from "./oneproxy.service.js";

/** Compatibility transport for the retired 1proxy settings endpoints. */
@Module({
  controllers: [OneproxyController],
  providers: [OneproxyService],
})
export class OneproxyModule {}
