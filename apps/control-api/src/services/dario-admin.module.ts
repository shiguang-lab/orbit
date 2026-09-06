import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { DarioAdminController } from "./dario-admin.controller.js";
import { DarioAdminService } from "./dario-admin.service.js";

@Module({ imports: [CommonModule], controllers: [DarioAdminController], providers: [DarioAdminService] })
export class DarioAdminModule {}
