import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AudioController } from "./audio.controller.js";
import { AudioSpeechService } from "./audio-speech.service.js";
import { AudioTranscriptionService } from "./audio-transcription.service.js";
import { AudioTranslationService } from "./audio-translation.service.js";
import { SpeechToTextService } from "./speech-to-text.service.js";

@Module({
  imports: [CommonModule],
  controllers: [AudioController],
  providers: [SpeechToTextService, AudioSpeechService, AudioTranscriptionService, AudioTranslationService],
})
export class AudioModule {}
