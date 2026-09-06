export interface EmbeddingModelDescriptor {
  id: string;
  name: string;
  provider: string;
  dimensions: number | undefined;
}
export function getAllEmbeddingModels(): EmbeddingModelDescriptor[];
