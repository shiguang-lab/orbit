/**
 * Provider credential import primitives used by the control-plane HTTP app.
 *
 * The transport (Nest controllers, authentication and response shaping) lives
 * in apps/control.  This narrow contract keeps the provider-specific file
 * formats and persistence use-cases behind a package export while the legacy
 * local-login routes are migrated separately.
 */
export {
  parseAndValidateClaudeAuth,
  enrichWithBootstrap,
  createConnectionFromAuthFile as createClaudeConnectionFromAuthFile,
} from "./utils/claudeAuthImport.js";
export { ClaudeAuthFileError } from "./utils/claudeAuthFile.js";
export type {
  ParsedClaudeAuth,
  EnrichedClaudeAuth,
  CreateConnectionOptions as ClaudeCreateConnectionOptions,
} from "./utils/claudeAuthImport.js";

export {
  parseAndValidateCodexAuth,
  createConnectionFromAuthFile as createCodexConnectionFromAuthFile,
} from "./utils/codexAuthImport.js";
export { CodexAuthFileError } from "./utils/codexAuthFile.js";
export type {
  ParsedCodexAuth,
  CreateConnectionOptions as CodexCreateConnectionOptions,
} from "./utils/codexAuthImport.js";

export {
  AgyAuthFileError,
  parseAndValidateAgyToken,
  enrichWithAntigravityBackend,
  createConnectionFromAgyToken,
} from "./utils/agyAuthImport.js";
export type {
  ParsedAgyAuth,
  EnrichedAgyAuth,
  CreateAgyConnectionOptions,
} from "./utils/agyAuthImport.js";

export { extractClaudeAuthZip } from "./utils/claudeAuthZipExtract.js";
export { extractCodexAuthZip } from "./utils/codexAuthZipExtract.js";
export { extractJsonZip as extractAgyAuthZip } from "./utils/jsonZipExtract.js";
export type { ExtractedZipFile } from "./utils/jsonZipExtract.js";

export { sanitizeProviderSpecificDataForResponse } from "@orbit/core/providers/request-defaults";
export { getProviderAuditTarget } from "@orbit/core/compliance/provider-audit";

export {
  importClaudeAuthSchema,
  importClaudeAuthBulkSchema,
  importCodexAuthSchema,
  importCodexAuthBulkSchema,
  importAgyAuthSchema,
  importAgyAuthBulkSchema,
} from "@orbit/core/shared/validation/schemas/oauth-import";
