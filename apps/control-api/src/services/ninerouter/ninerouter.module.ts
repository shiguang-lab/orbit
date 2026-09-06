import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { NinerouterController } from "./ninerouter.controller.js";
import { NinerouterService } from "./ninerouter.service.js";

@Module({ imports: [CommonModule], controllers: [NinerouterController], providers: [NinerouterService], exports: [NinerouterService] })
export class NinerouterModule {}
