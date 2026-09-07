import { Injectable } from "@nestjs/common";
import { executeEdgeRuntimeCommand } from "../../edge-runtime/client.js";
import { updatePersistedRuntimeSettings } from "../runtime-settings-persistence.js";

type TaskRoutingConfig = {
  enabled: boolean;
  detectionEnabled: boolean;
  patternOverrides?: Record<string, unknown>;
  taskModelMap: Record<string, string>;
  stats: Record<string, number>;
};

type TaskRoutingUpdate = Pick<
  Partial<TaskRoutingConfig>,
  "enabled" | "detectionEnabled" | "patternOverrides"
> & {
  taskModelMap?: Partial<TaskRoutingConfig["taskModelMap"]>;
};

/** Use cases for the control-plane task-aware routing settings surface. */
@Injectable()
export class TaskRoutingService {
  getConfig() {
    return executeEdgeRuntimeCommand<TaskRoutingConfig & Record<string, unknown>>({
      command: "task-routing.snapshot",
    });
  }

  async updateConfig(config: TaskRoutingUpdate) {
    const { taskModelMap, ...rest } = config;
    const current = await this.getConfig();
    const persistable = {
      enabled: current.enabled,
      detectionEnabled: current.detectionEnabled,
      ...(current.patternOverrides ? { patternOverrides: current.patternOverrides } : {}),
      ...rest,
      ...(taskModelMap
        ? { taskModelMap: { ...current.taskModelMap, ...taskModelMap } }
        : { taskModelMap: current.taskModelMap }),
    };
    await updatePersistedRuntimeSettings({ taskRouting: JSON.stringify(persistable) });
    return this.getConfig();
  }

  resetStats() {
    return executeEdgeRuntimeCommand<{ success: true; stats: Record<string, number> }>({
      command: "task-routing.reset-stats",
    });
  }

  detect(body: Record<string, unknown>) {
    return executeEdgeRuntimeCommand({ command: "task-routing.detect", body });
  }
}
