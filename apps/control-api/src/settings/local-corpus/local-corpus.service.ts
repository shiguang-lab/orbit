import { Injectable } from "@nestjs/common";
import {
  clearLocalCorpusRoot,
  getLocalCorpusConfig,
  setLocalCorpusRoot,
} from "@shiguang-gateway/core-domain/shared/local-corpus";
import {
  canonicalizeLocalCorpusRoot,
  getConfiguredLocalCorpusStatus,
  resetLocalCorpusIndex,
} from "@shiguang-gateway/core-domain/shared/local-corpus";

/** Use cases for the control-plane local corpus settings surface. */
@Injectable()
export class LocalCorpusService {
  getConfig() {
    return {
      ...getLocalCorpusConfig(),
      status: getConfiguredLocalCorpusStatus(),
    };
  }

  async configure(rootPath: string) {
    const canonicalRoot = await canonicalizeLocalCorpusRoot(rootPath);
    setLocalCorpusRoot(canonicalRoot);
    resetLocalCorpusIndex();
    return {
      configured: true,
      rootPath: canonicalRoot,
      message: "Local corpus root saved. Content remains on the local filesystem.",
    };
  }

  disconnect() {
    clearLocalCorpusRoot();
    resetLocalCorpusIndex();
    return {
      configured: false,
      message: "Local corpus disconnected. Source files were not modified.",
    };
  }
}
