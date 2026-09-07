import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module.js";
import { MuxController } from "./mux.controller.js";
import { MuxService } from "./mux.service.js";

@Module({ imports: [CommonModule], controllers: [MuxController], providers: [MuxService] })
export class MuxModule {}
