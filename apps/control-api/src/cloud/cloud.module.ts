import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { CloudController } from "./cloud.controller.js";
import { CloudService } from "./cloud.service.js";

@Module({ imports: [CommonModule], controllers: [CloudController], providers: [CloudService] })
export class CloudModule {}
