export function resolveImageRouteModel(model: string): Promise<string>;
export function extractImageEditInputFromJson(body: unknown): {
  prompt: string;
  model: string | null;
  size: string | null;
  responseFormat: string | null;
  imageBytes: Buffer | null;
  imageMime: string | null;
  images: Array<{ bytes: Buffer; mime: string }>;
  imageInputCount: number;
};
export function validateCodexImageEditReferences(
  images: Array<{ bytes: Buffer; mime: string }>,
): string | null;
