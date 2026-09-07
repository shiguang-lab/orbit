import { Module, type OnModuleInit } from "@nestjs/common";
import { ensureAssessmentSchema } from "./assessment-schema.js";
import { AssessmentController } from "./assessment.controller.js";
import { AssessmentService } from "./assessment.service.js";

/** Initializes the control-plane assessment schema at application startup. */
@Module({ controllers: [AssessmentController], providers: [AssessmentService] })
export class AssessmentModule implements OnModuleInit {
  onModuleInit(): void {
    ensureAssessmentSchema();
  }
}
