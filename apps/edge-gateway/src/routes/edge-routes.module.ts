import { Module } from "@nestjs/common";
import { MethodGuardService } from "./method-guard.service.js";

@Module({
  providers: [MethodGuardService],
})
export class EdgeRoutesModule {}
