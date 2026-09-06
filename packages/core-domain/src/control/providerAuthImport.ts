/**
 * Provider credential import primitives used by the control-plane HTTP app.
 *
 * The transport (Nest controllers, authentication and response shaping) lives
 * in apps/control-api.  This narrow contract keeps the provider-specific file
 * formats and persistence use-cases behind a package export while the legacy
 * local-login routes are migrated separately.
 */
export {
  ClaudeAuthFileError,
  parseAndValidateClaudeAuth,
  enrichWithBootstrap,
  createConnectionFromAuthFile as createClaudeConnectionFromAuthFile,
} from "../lib/oauth/utils/claudeAuthImport.ts";
export type {
  ParsedClaudeAuth,
  EnrichedClaudeAuth,
  CreateConnectionOptions as ClaudeCreateConnectionOptions,
} from "../lib/oauth/utils/claudeAuthImport.ts";

export {
  CodexAuthFileError,
  parseAndValidateCodexAuth,
  createConnectionFromAuthFile as createCodexConnectionFromAuthFile,
} from "../lib/oauth/utils/codexAuthImport.ts";
export type {
  ParsedCodexAuth,
  CreateConnectionOptions as CodexCreateConnectionOptions,
} from "../lib/oauth/utils/codexAuthImport.ts";

export {
  AgyAuthFileError,
  parseAndValidateAgyToken,
  enrichWithAntigravityBackend,
  createConnectionFromAgyToken,
} from "../lib/oauth/utils/agyAuthImport.ts";
export type {
  ParsedAgyAuth,
  EnrichedAgyAuth,
  CreateAgyConnectionOptions,
} from "../lib/oauth/utils/agyAuthImport.ts";

export { extractJsonZip as extractClaudeAuthZip } from "../lib/oauth/utils/claudeAuthZipExtract.ts";
export { extractJsonZip as extractCodexAuthZip } from "../lib/oauth/utils/codexAuthZipExtract.ts";
export { extractJsonZip as extractAgyAuthZip } from "../lib/oauth/utils/jsonZipExtract.ts";
export type { ExtractedZipFile } from "../lib/oauth/utils/jsonZipExtract.ts";

export { sanitizeProviderSpecificDataForResponse } from "../lib/providers/requestDefaults.ts";
export { getProviderAuditTarget } from "../lib/compliance/providerAudit.ts";

export {
  importClaudeAuthSchema,
  importClaudeAuthBulkSchema,
  importCodexAuthSchema,
  importCodexAuthBulkSchema,
  importAgyAuthSchema,
  importAgyAuthBulkSchema,
} from "../shared/validation/schemas/auth.ts";
