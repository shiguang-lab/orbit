import { Injectable } from "@nestjs/common";
import { GET as getBudget, POST as setBudget } from "./handlers/budget.handler.js";
import { GET as getBulkBudget } from "./handlers/budget-bulk.handler.js";
import { GET as getHistory } from "./handlers/history.handler.js";
import { GET as getModelLatencyStats } from "./handlers/model-latency-stats.handler.js";
import { GET as getCacheHealth } from "./handlers/cache-health.handler.js";
import { GET as getProviderWindowCosts } from "./handlers/provider-window-costs.handler.js";
import { GET as getRouteExplain } from "./handlers/route-explain.handler.js";
import { GET as getUtilization } from "./handlers/utilization.handler.js";
import { GET as getCodexResetCredit, POST as consumeCodexResetCredit } from "./handlers/codex-reset-credit.handler.js";
import { GET as getComboForecast } from "./handlers/combo-forecast.handler.js";
import { GET as getComboHealthDashboard } from "./handlers/combo-health-dashboard.handler.js";
import { GET as getComboHealthAutopilot } from "./handlers/combo-health-autopilot.handler.js";
import { GET as getComboScoringInspector } from "./handlers/combo-scoring-inspector.handler.js";

/** Management-facing usage use cases. HTTP transport stays in UsageController. */
@Injectable()
export class UsageService {
  getBudget(request: Request) {
    return getBudget(request);
  }

  setBudget(request: Request) {
    return setBudget(request);
  }

  getBulkBudget(request: Request) {
    return getBulkBudget(request);
  }

  getHistory(request: Request) {
    return getHistory(request);
  }

  getModelLatencyStats(request: Request) {
    return getModelLatencyStats(request);
  }

  getCacheHealth(request: Request) {
    return getCacheHealth(request);
  }

  getProviderWindowCosts(request: Request) {
    return getProviderWindowCosts(request);
  }

  getRouteExplain(request: Request, id: string) {
    return getRouteExplain(request, { params: { id } });
  }

  getUtilization(request: Request) {
    return getUtilization(request);
  }

  getCodexResetCredit(request: Request) { return getCodexResetCredit(request); }
  consumeCodexResetCredit(request: Request) { return consumeCodexResetCredit(request); }
  getComboForecast(request: Request) { return getComboForecast(request); }
  getComboHealthDashboard(request: Request) { return getComboHealthDashboard(request); }
  getComboHealthAutopilot(request: Request) { return getComboHealthAutopilot(request); }
  getComboScoringInspector(request: Request) { return getComboScoringInspector(request); }
}
