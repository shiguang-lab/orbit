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
} from "@shiguang-gateway/core-domain/control/compression-combos";
import { getCompressionSettings } from "@shiguang-gateway/core-domain/control/compression-settings";
import { deriveDefaultPlan } from "@shiguang-gateway/open-sse/services/compression/deriveDefaultPlan";

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
    const engines = config.engines && typeof config.engines === "object" && !Array.isArray(config.engines)
      ? config.engines as Record<string, { enabled?: boolean; level?: string }>
      : {};
    const plan = deriveDefaultPlan(engines, config.enabled !== false);
    return {
      mode: plan.mode,
      pipeline: plan.stackedPipeline,
      derived: true,
    };
  }
}
