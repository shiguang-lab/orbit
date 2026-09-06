export type VideoModelTarget = {
  provider: string | null;
  model: string | null;
  isCustomModel: boolean;
};

export declare function resolveVideoModelTarget(
  modelStr: string | null | undefined
): Promise<VideoModelTarget>;

export declare function isVideoPromptOptional(parsed: {
  provider: string | null;
  model: string | null;
}): boolean;

export declare function resolveLocalOverrideCredentials(provider: string): Promise<any>;
