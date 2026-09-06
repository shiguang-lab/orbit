import { Module } from "@nestjs/common";
import { CommonModule } from "../common/common.module.js";
import { AutoComboCandidatesController } from "./auto-combo-candidates.controller.js";
import { AutoComboCandidatesService } from "./auto-combo-candidates.service.js";

@Module({
  imports: [CommonModule],
  controllers: [AutoComboCandidatesController],
  providers: [AutoComboCandidatesService],
})
export class AutoComboCandidatesModule {}
