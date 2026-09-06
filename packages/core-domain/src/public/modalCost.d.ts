export type Modality = "image" | "audio" | "rerank" | "video";
export type ModalUsage = {
  n?: number;
  seconds?: number;
  characters?: number;
  searchUnits?: number;
};

export function calculateModalCost(
  modality: Modality,
  provider: string,
  model: string,
  usage: ModalUsage,
): Promise<number>;
