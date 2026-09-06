import { Module } from "@nestjs/common";
import { ProcessHealthController } from "./process-health.controller.js";

@Module({ controllers: [ProcessHealthController] })
export class ProcessHealthModule {}
