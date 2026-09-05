export interface PluginManager {
  install(path: string): Promise<any>;
  uninstall(name: string): Promise<void>;
  activate(name: string): Promise<void>;
  deactivate(name: string): Promise<void>;
  scan(): Promise<{ discovered: number; errors: string[] }>;
}

export const pluginManager: PluginManager;
