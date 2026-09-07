import { Module } from "@nestjs/common";
import { LocalCorpusController } from "./local-corpus.controller.js";
import { LocalCorpusService } from "./local-corpus.service.js";

/** Control-plane module for local corpus source configuration. */
@Module({
  controllers: [LocalCorpusController],
  providers: [LocalCorpusService],
})
export class LocalCorpusModule {}

