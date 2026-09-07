import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { DarioController } from "./dario.controller.js";
import { DarioService } from "./dario.service.js";
@Module({ imports: [CommonModule], controllers: [DarioController], providers: [DarioService], exports: [DarioService] })
export class DarioModule {}
