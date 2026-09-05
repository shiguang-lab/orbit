import { Module } from "@nestjs/common";
import { HttpKernelModule } from "@shiguang-gateway/http-kernel";
import { HttpInfrastructureModule } from "./infrastructure/http-infrastructure.module.js";
import { EdgeRuntimeModule } from "./runtime/edge-runtime.module.js";
import { EdgeRoutesModule } from "./routes/edge-routes.module.js";
import { AudioModule } from "./audio/audio.module.js";
import { BatchesModule } from "./batches/batches.module.js";
import { EmbeddingsModule } from "./embeddings/embeddings.module.js";
import { FilesModule } from "./files/files.module.js";
import { ImagesModule } from "./images/images.module.js";
import { ModerationsModule } from "./moderations/moderations.module.js";
import { MusicModule } from "./music/music.module.js";
import { RerankModule } from "./rerank/rerank.module.js";
import { VoicesModule } from "./voices/voices.module.js";
import { WsModule } from "./ws/ws.module.js";

@Module({
  imports: [
    HttpKernelModule,
    HttpInfrastructureModule,
    EdgeRuntimeModule,
    EdgeRoutesModule,
    AudioModule,
    BatchesModule,
    EmbeddingsModule,
    FilesModule,
    ImagesModule,
    ModerationsModule,
    MusicModule,
    RerankModule,
    VoicesModule,
    WsModule,
  ],
})
export class AppModule {}
