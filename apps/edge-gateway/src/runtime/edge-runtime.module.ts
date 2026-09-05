import { Module } from "@nestjs/common";
import { EdgeRuntimeService } from "./edge-runtime.service.js";

@Module({
  providers: [EdgeRuntimeService],
  exports: [EdgeRuntimeService],
})
export class EdgeRuntimeModule {}
