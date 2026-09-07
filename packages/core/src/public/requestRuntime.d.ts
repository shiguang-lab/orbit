export interface RequestRuntimeHandle {
  close(): void;
}

export function hydrateRequestRuntime(): Promise<RequestRuntimeHandle>;
