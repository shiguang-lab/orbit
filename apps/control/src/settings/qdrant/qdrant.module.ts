import { Module } from "@nestjs/common";
import { QdrantController } from "./qdrant.controller.js";
import { QdrantService } from "./qdrant.service.js";

/** Control-plane module for Qdrant configuration and operator diagnostics. */
@Module({
  controllers: [QdrantController],
  providers: [QdrantService],
})
export class QdrantModule {}

