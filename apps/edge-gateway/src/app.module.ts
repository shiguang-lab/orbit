import { Module } from "@nestjs/common";
import { HealthModule as ProcessHealthModule, HttpKernelModule } from "@shiguang-gateway/http-kernel";
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
import { CloudAgentsModule } from "./cloud-agents/cloud-agents.module.js";
import { SessionLeasesModule } from "./session-leases/session-leases.module.js";
import { ClassifyModule } from "./classify/classify.module.js";
import { CombosModule } from "./combos/combos.module.js";
import { MuseCodeModule } from "./muse-code/muse-code.module.js";
import { ProviderModelsModule } from "./provider-models/provider-models.module.js";
import { ModelsModule } from "./models/models.module.js";
import { ProviderChatModule } from "./provider-chat/provider-chat.module.js";
import { ChatCompletionsModule } from "./chat-completions/chat-completions.module.js";
import { ProviderEmbeddingsModule } from "./provider-embeddings/provider-embeddings.module.js";
import { CompletionsModule } from "./completions/completions.module.js";
import { MeModule } from "./me/me.module.js";
import { ExplainRoutingModule } from "./explain-routing/explain-routing.module.js";
import { VideoBridgeDrilldownModule } from "./video-bridge/video-bridge-drilldown.module.js";
import { ProviderImagesModule } from "./provider-images/provider-images.module.js";
import { AntigravityModule } from "./antigravity/antigravity.module.js";
import { AutoComboCandidatesModule } from "./auto-combo-candidates/auto-combo-candidates.module.js";
import { MessagesModule } from "./messages/messages.module.js";
import { ResponsesModule } from "./responses/responses.module.js";
import { RelayBifrostModule } from "./relay-bifrost/relay-bifrost.module.js";
import { RelayChatModule } from "./relay-chat/relay-chat.module.js";
import { VscodeVersionModule } from "./vscode-version/vscode-version.module.js";
import { SearchModule } from "./search/search.module.js";
import { VscodeChatModule } from "./vscode-chat/vscode-chat.module.js";

@Module({
  imports: [
    HttpKernelModule,
    ProcessHealthModule,
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
    CloudAgentsModule,
    SessionLeasesModule,
    ClassifyModule,
    CombosModule,
    MuseCodeModule,
    ProviderModelsModule,
    ModelsModule,
    ProviderChatModule,
    ChatCompletionsModule,
    ProviderEmbeddingsModule,
    CompletionsModule,
    MeModule,
    ExplainRoutingModule,
    VideoBridgeDrilldownModule,
    ProviderImagesModule,
    AntigravityModule,
    AutoComboCandidatesModule,
    MessagesModule,
    ResponsesModule,
    RelayBifrostModule,
    RelayChatModule,
    VscodeVersionModule,
    SearchModule,
    VscodeChatModule,
  ],
})
export class AppModule {}
