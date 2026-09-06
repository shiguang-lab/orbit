import { Injectable } from "@nestjs/common";
import { getBuilderOptions } from "./handlers/builder-options.js";
import { duplicate } from "./handlers/duplicate.js";
import { getMetrics, resetMetrics } from "./handlers/metrics.js";
import { reorder } from "./handlers/reorder.js";

/** Application service for control-plane combo management endpoints. */
@Injectable()
export class CombosManagementService {
  builderOptions(request: Request) { return getBuilderOptions(request); }
  metrics(request: Request) { return getMetrics(request); }
  resetMetrics(request: Request) { return resetMetrics(request); }
  reorder(request: Request) { return reorder(request); }
  duplicate(request: Request) { return duplicate(request); }

  async auto(request: Request) {
    const { listAutoCombos } = await import("./handlers/auto.js");
    return listAutoCombos(request);
  }

  async test(request: Request) {
    const { testCombo } = await import("./handlers/test.js");
    return testCombo(request);
  }
}
