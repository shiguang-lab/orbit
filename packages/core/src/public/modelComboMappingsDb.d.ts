export interface ModelComboMapping {
  id: string;
  pattern: string;
  comboId: string;
  comboName?: string;
  priority: number;
  enabled: boolean;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export interface ModelComboMappingPage {
  items: ModelComboMapping[];
  total: number;
}

export interface CreateModelComboMappingInput {
  pattern: string;
  comboId: string;
  priority?: number;
  enabled?: boolean;
  description?: string;
}

export function getModelComboMappings(options?: {
  limit?: number;
  offset?: number;
}): Promise<ModelComboMappingPage>;
export function getModelComboMappingById(id: string): Promise<ModelComboMapping | null>;
export function createModelComboMapping(
  data: CreateModelComboMappingInput,
): Promise<ModelComboMapping>;
export function updateModelComboMapping(
  id: string,
  data: Partial<CreateModelComboMappingInput>,
): Promise<ModelComboMapping | null>;
export function deleteModelComboMapping(id: string): Promise<boolean>;
export function resolveComboForModel(model: string): Promise<Record<string, unknown> | null>;
