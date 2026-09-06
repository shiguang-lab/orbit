import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { SessionsController } from "./sessions.controller.js";
import { SessionsService } from "./sessions.service.js";
@Module({ imports: [CommonModule], controllers: [SessionsController], providers: [SessionsService] })
export class SessionsModule {}
