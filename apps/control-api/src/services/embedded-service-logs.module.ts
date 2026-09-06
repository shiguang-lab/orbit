import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { EmbeddedServiceLogsController } from "./embedded-service-logs.controller.js";
import { EmbeddedServiceLogsService } from "./embedded-service-logs.service.js";
import { BifrostModule } from "../bifrost/bifrost.module.js";
import { DarioModule } from "./dario/dario.module.js";
import { NinerouterModule } from "./ninerouter/ninerouter.module.js";

@Module({ imports: [CommonModule, BifrostModule, DarioModule, NinerouterModule], controllers: [EmbeddedServiceLogsController], providers: [EmbeddedServiceLogsService] })
export class EmbeddedServiceLogsModule {}
