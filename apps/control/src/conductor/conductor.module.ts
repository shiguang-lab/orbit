import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ConductorController } from "./conductor.controller.js";
import { ConductorService } from "./conductor.service.js";

@Module({ imports: [CommonModule], controllers: [ConductorController], providers: [ConductorService] })
export class ConductorModule {}
