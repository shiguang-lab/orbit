export interface ServiceModel {
  id: string;
  name?: string;
  object?: string;
  owned_by?: string;
  created?: number;
  available?: boolean;
  [key: string]: unknown;
}
export function getServiceModels(tool: string): ServiceModel[];
export function isServiceBackendPluginId(pluginId: string): pluginId is "9router" | "cliproxyapi";
