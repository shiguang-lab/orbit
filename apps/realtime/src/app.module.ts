import { Module } from "@nestjs/common";
import { HttpKernelModule } from "@shiguang-gateway/http-kernel";
import { LiveModule } from "./modules/live/live.module.js";

@Module({
  imports: [HttpKernelModule, LiveModule],
})
export class AppModule {}
