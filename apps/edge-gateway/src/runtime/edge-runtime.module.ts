import { Module } from "@nestjs/common";
import { EdgeRuntimeService } from "./edge-runtime.service.js";

@Module({
  providers: [EdgeRuntimeService],
})
export class EdgeRuntimeModule {}
