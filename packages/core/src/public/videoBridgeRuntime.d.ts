export interface VideoRuntimeStatus {
  available: boolean;
  ffmpegVersion: string | null;
  ffprobeVersion: string | null;
  reason?: string;
}

export function probeVideoRuntime(): Promise<VideoRuntimeStatus>;
