import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { RelayController } from "./relay.controller.js";
import { RelayService } from "./relay.service.js";

@Module({ imports: [CommonModule], controllers: [RelayController], providers: [RelayService] })
export class RelayModule {}
