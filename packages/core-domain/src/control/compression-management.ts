/**
 * Explicit control-plane boundary for compression management operations.
 * Runtime implementation lives in open-sse; control-api consumes this stable
 * package export instead of reaching into open-sse source paths.
 */
export {
  benchmarkEngines,
  compareReports,
  DEFAULT_BENCHMARK_ENGINES,
} from "@shiguang-gateway/open-sse/services/compression/harness/benchmark";
export {
  registerBuiltinCompressionEngines,
} from "@shiguang-gateway/open-sse/services/compression/engines/index";
export { listCompressionEngines } from "@shiguang-gateway/open-sse/services/compression/engines/registry";
export {
  listCavemanRulePacks,
  listSupportedCompressionLanguages,
} from "@shiguang-gateway/open-sse/services/compression";
export {
  retrieveBlock,
} from "@shiguang-gateway/open-sse/services/compression/engines/ccr/index";
export { queryBlock } from "@shiguang-gateway/open-sse/services/compression/engines/ccr/ccrQuery";
export { sanitizeErrorMessage } from "@shiguang-gateway/open-sse/utils/error";
