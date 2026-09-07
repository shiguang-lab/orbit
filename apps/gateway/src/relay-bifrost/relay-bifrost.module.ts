import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { RelayBifrostController } from "./relay-bifrost.controller.js";
import { RelayBifrostService } from "./relay-bifrost.service.js";
@Module({ imports: [CommonModule], controllers: [RelayBifrostController], providers: [RelayBifrostService] })
export class RelayBifrostModule {}
