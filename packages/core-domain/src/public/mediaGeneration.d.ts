export type MediaGenerationResultLike = {
  success: boolean;
  data?: unknown;
  error?: unknown;
  status?: number;
};

type MediaGenerationFailure = {
  success: false;
  error: unknown;
  status: number;
};

export declare function isMediaGenerationFailure(
  result: MediaGenerationResultLike
): result is MediaGenerationFailure;

export declare function promptRequiredResponse(body: { prompt?: unknown }): Response | null;

export declare function successfulMediaGenerationResponse(options: {
  result: { data: unknown };
  billingMode: "audio" | "video";
  provider: string;
  model: string;
  startTime: number;
  duration: unknown;
  strategy?: string;
  fallbackAttempts?: number;
}): Promise<Response>;

export declare function failedMediaGenerationResponse(
  result: MediaGenerationResultLike,
  fallbackMessage: string
): Response;
