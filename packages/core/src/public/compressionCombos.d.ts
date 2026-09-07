import type { CompressionPipelineStep } from "@orbit/contracts/compression-settings";

export interface CompressionCombo {
  id: string;
  name: string;
  description: string;
  pipeline: CompressionPipelineStep[];
  languagePacks: string[];
  outputMode: boolean;
  outputModeIntensity: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompressionComboAssignment {
  id: string;
  compressionComboId: string;
  routingComboId: string;
  createdAt: string;
}

export function listCompressionCombos(): CompressionCombo[];
export function getCompressionCombo(id: string): CompressionCombo | null;
export function createCompressionCombo(data: Partial<CompressionCombo>): CompressionCombo;
export function updateCompressionCombo(id: string, data: Partial<CompressionCombo>): CompressionCombo | null;
export function deleteCompressionCombo(id: string): boolean;
export function setDefaultCompressionCombo(id: string): boolean;
export function getAssignmentsForCompressionCombo(id: string): CompressionComboAssignment[];
export function updateAssignments(id: string, routingComboIds: string[]): boolean;
export function getCompressionComboForRoutingCombo(routingComboId: string): CompressionCombo | null;
export function getDefaultCompressionCombo(): CompressionCombo | null;
