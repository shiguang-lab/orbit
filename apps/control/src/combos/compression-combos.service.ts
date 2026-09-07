import { Injectable } from "@nestjs/common";
import {
  createCompressionCombo,
  deleteCompressionCombo,
  getAssignmentsForCompressionCombo,
  getCompressionCombo,
  listCompressionCombos,
  setDefaultCompressionCombo,
  updateAssignments,
  updateCompressionCombo,
  type CompressionCombo,
} from "@orbit/core/control/compression-combos";
import { getCompressionSettings } from "@orbit/core/control/compression-settings";
import { deriveDefaultPlan } from "@orbit/inference/services/compression/deriveDefaultPlan";

/** Use cases for named compression pipelines and their routing-combo assignments. */
@Injectable()
export class CompressionCombosService {
  list() {
    return { combos: listCompressionCombos() };
  }

  create(data: Partial<CompressionCombo>) {
    return createCompressionCombo(data);
  }

  get(id: string) {
    return getCompressionCombo(id);
  }

  update(id: string, data: Partial<CompressionCombo>) {
    if (data.isDefault === true && !setDefaultCompressionCombo(id)) return null;
    return updateCompressionCombo(id, data);
  }

  remove(id: string) {
    return deleteCompressionCombo(id);
  }

  assignments(id: string) {
    return getAssignmentsForCompressionCombo(id);
  }

  updateAssignments(id: string, routingComboIds: string[]) {
    return updateAssignments(id, routingComboIds);
  }

  async defaultPlan() {
    const config = await getCompressionSettings();
    const rawEngines =
      config.engines && typeof config.engines === "object" && !Array.isArray(config.engines)
        ? (config.engines as Record<string, unknown>)
        : {};
    const engines = Object.fromEntries(
      Object.entries(rawEngines).map(([id, value]) => {
        const entry =
          value && typeof value === "object" && !Array.isArray(value)
            ? (value as Record<string, unknown>)
            : {};
        return [
          id,
          {
            enabled: entry.enabled === true,
            ...(typeof entry.level === "string" && { level: entry.level }),
          },
        ];
      }),
    );
    const plan = deriveDefaultPlan(engines, config.enabled !== false);
    return {
      mode: plan.mode,
      pipeline: plan.stackedPipeline,
      derived: true,
    };
  }
}
