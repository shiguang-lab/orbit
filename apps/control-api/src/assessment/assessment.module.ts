import { Module, type OnModuleInit } from "@nestjs/common";
import { ensureAssessmentSchema } from "./assessment-schema.js";

/** Initializes the control-plane assessment schema at application startup. */
@Module({})
export class AssessmentModule implements OnModuleInit {
  onModuleInit(): void {
    ensureAssessmentSchema();
  }
}
