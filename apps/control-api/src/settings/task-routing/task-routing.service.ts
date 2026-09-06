import { Injectable } from "@nestjs/common";
import {
  detectTaskType,
  getDefaultTaskModelMap,
  getDefaultTaskPatterns,
  getTaskRoutingConfig,
  resetTaskRoutingStats,
  setTaskRoutingConfig,
  type TaskRoutingConfig,
} from "@shiguang-gateway/open-sse/services/taskAwareRouter";
import { updateSettings } from "@shiguang-gateway/core-domain/db/settings";

/** Use cases for the control-plane task-aware routing settings surface. */
@Injectable()
export class TaskRoutingService {
  getConfig() {
    return {
      ...getTaskRoutingConfig(),
      defaultTaskModelMap: getDefaultTaskModelMap(),
      defaultTaskPatterns: getDefaultTaskPatterns(),
    };
  }

  async updateConfig(config: Partial<TaskRoutingConfig>) {
    setTaskRoutingConfig(config);
    const { stats: _stats, ...persistable } = getTaskRoutingConfig();
    await updateSettings({ taskRouting: JSON.stringify(persistable) });
    return getTaskRoutingConfig();
  }

  resetStats() {
    resetTaskRoutingStats();
    return getTaskRoutingConfig().stats;
  }

  detect(body: Record<string, unknown>) {
    const taskType = detectTaskType(body);
    const config = getTaskRoutingConfig();
    return {
      taskType,
      preferredModel: config.taskModelMap[taskType] || "(no override)",
    };
  }
}
