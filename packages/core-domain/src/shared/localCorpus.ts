/** Shared local-corpus capability used by control configuration and MCP tools. */
export {
  clearLocalCorpusRoot,
  getLocalCorpusConfig,
  getLocalCorpusRoot,
  setLocalCorpusRoot,
} from "../lib/db/localCorpus";
export {
  canonicalizeLocalCorpusRoot,
  getDefaultLocalCorpusStatus,
  LocalCorpusIndex,
} from "../lib/localCorpus/index";
export {
  getConfiguredLocalCorpusStatus,
  readConfiguredLocalCorpus,
  resetLocalCorpusIndex,
  searchConfiguredLocalCorpus,
} from "../lib/localCorpus/configured";

