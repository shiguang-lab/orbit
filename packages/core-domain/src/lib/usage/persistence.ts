import { isNextBuildPhase } from "../buildPhase.js";

/** Whether usage records and call-log artifacts may be persisted by this runtime. */
export const shouldPersistToDisk =
  !(typeof globalThis.caches === "object" && globalThis.caches !== null) &&
  !isNextBuildPhase();
