export interface PlaygroundPresetListItem {
  id: string;
  name: string;
  endpoint: string;
  model: string;
  system: string | null;
  params: Record<string, unknown>;
  created_at: string;
}

export function listPlaygroundPresets(options?: { limit?: number; offset?: number }): {
  items: PlaygroundPresetListItem[];
  total: number;
};
export function getPlaygroundPreset(id: string): PlaygroundPresetListItem | null;
export function createPlaygroundPreset(input: {
  name: string;
  endpoint: string;
  model: string;
  system: string | null | undefined;
  params: Record<string, unknown>;
}): PlaygroundPresetListItem;
export function updatePlaygroundPreset(
  id: string,
  patch: Partial<{
    name: string;
    endpoint: string;
    model: string;
    system: string | null;
    params: Record<string, unknown>;
  }>,
): PlaygroundPresetListItem | null;
export function deletePlaygroundPreset(id: string): boolean;
