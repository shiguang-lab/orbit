import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { ResponsesController } from "./responses.controller.js";
import { ResponsesService } from "./responses.service.js";

@Module({ imports: [CommonModule], controllers: [ResponsesController], providers: [ResponsesService] })
export class ResponsesModule {}
