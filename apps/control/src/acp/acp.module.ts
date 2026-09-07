import { Module } from "@nestjs/common";
import { AcpController } from "./acp.controller.js";
import { AcpService } from "./acp.service.js";

@Module({ controllers: [AcpController], providers: [AcpService] })
export class AcpModule {}
