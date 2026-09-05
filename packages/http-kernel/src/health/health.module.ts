import { Module } from "@nestjs/common";
import { HttpHealthController } from "./http-health.controller.js";

/** Explicit Nest module for the process health probes. */
@Module({ controllers: [HttpHealthController] })
export class HealthModule {}
