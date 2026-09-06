import { Module } from "@nestjs/common";
import { HttpKernelModule } from "@shiguang-gateway/http-kernel";
import { EdgeRuntimeModule } from "./runtime/edge-runtime.module.js";
import { EdgeRoutesModule } from "./routes/edge-routes.module.js";
import { AudioModule } from "./audio/audio.module.js";
import { A2aModule } from "./a2a/a2a.module.js";
import { BatchesModule } from "./batches/batches.module.js";
import { EmbeddingsModule } from "./embeddings/embeddings.module.js";
import { FilesModule } from "./files/files.module.js";
import { ImagesModule } from "./images/images.module.js";
import { ModerationsModule } from "./moderations/moderations.module.js";
import { MusicModule } from "./music/music.module.js";
import { OcrModule } from "./ocr/ocr.module.js";
import { RerankModule } from "./rerank/rerank.module.js";
import { SegmentModule } from "./segment/segment.module.js";
import { VoicesModule } from "./voices/voices.module.js";
import { VideosModule } from "./videos/videos.module.js";
import { WsModule } from "./ws/ws.module.js";
import { WebModule } from "./web/web.module.js";

@Module({
  imports: [
    HttpKernelModule,
    EdgeRuntimeModule,
    EdgeRoutesModule,
    AudioModule,
    A2aModule,
    BatchesModule,
    EmbeddingsModule,
    FilesModule,
    ImagesModule,
    ModerationsModule,
    MusicModule,
    OcrModule,
    RerankModule,
    SegmentModule,
    VoicesModule,
    VideosModule,
    WsModule,
    WebModule,
  ],
})
export class AppModule {}
