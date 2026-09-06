export interface ImageProviderModel {
  id: string;
  name?: string;
  inputModalities?: string[];
  supportedSizes?: string[];
  imageRequired?: boolean;
  description?: string;
  [key: string]: unknown;
}

export interface ImageProviderConfig {
  id: string;
  alias?: string;
  baseUrl: string;
  models: ImageProviderModel[];
  [key: string]: unknown;
}

export const IMAGE_PROVIDERS: Record<string, ImageProviderConfig>;
export function parseImageModel(model: string | null | undefined): {
  provider: string | null;
  model: string | null;
};
export function getImageProvider(providerId: string | null | undefined): ImageProviderConfig | null;
export function getImageModelEntry(model: string | null | undefined): {
  provider: string;
  model: string;
  inputModalities?: string[];
  imageRequired?: boolean;
  description?: string;
} | null;

