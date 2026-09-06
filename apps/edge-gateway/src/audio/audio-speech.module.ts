import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AudioSpeechController } from "./audio-speech.controller.js";
import { AudioSpeechService } from "./audio-speech.service.js";

@Module({
  imports: [CommonModule],
  controllers: [AudioSpeechController],
  providers: [AudioSpeechService],
})
export class AudioSpeechModule {}
