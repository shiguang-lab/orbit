export * from "@shiguang-gateway/core-domain/memory/runtime";
export function installMemoryRuntimePort(): void;
export {
  retrieveMemories,
  DEFAULT_MEMORY_SETTINGS,
  getMemorySettings,
  toMemoryRetrievalConfig,
  injectMemory,
  shouldInjectMemory,
  systemMessageMustBeFirst,
  extractFacts,
  createMemory,
  deleteMemory,
  listMemories,
  MemoryType,
} from "@shiguang-gateway/core-domain/edge/memory-runtime";
