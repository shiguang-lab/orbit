import { Injectable } from "@nestjs/common";
import { GET as getBudget, POST as setBudget } from "./handlers/budget.handler.js";
import { GET as getBulkBudget } from "./handlers/budget-bulk.handler.js";
import { GET as getHistory } from "./handlers/history.handler.js";
import { GET as getModelLatencyStats } from "./handlers/model-latency-stats.handler.js";
import { GET as getCacheHealth } from "./handlers/cache-health.handler.js";
import { GET as getProviderWindowCosts } from "./handlers/provider-window-costs.handler.js";
import { GET as getRouteExplain } from "./handlers/route-explain.handler.js";

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
}
