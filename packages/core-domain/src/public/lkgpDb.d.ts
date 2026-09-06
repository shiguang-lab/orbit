export interface LKGPRecord {
  provider: string;
  connectionId?: string;
}

export function getLKGP(comboName: string, modelId: string): Promise<LKGPRecord | null>;
export function setLKGP(
  comboName: string,
  modelId: string,
  providerId: string,
  connectionId?: string,
): Promise<void>;
export function clearLKGP(comboName: string, modelId: string): Promise<void>;
