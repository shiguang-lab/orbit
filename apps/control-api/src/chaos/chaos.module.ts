import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ChaosController } from "./chaos.controller.js";
import { ChaosService } from "./chaos.service.js";

@Module({ imports: [CommonModule], controllers: [ChaosController], providers: [ChaosService] })
export class ChaosModule {}
