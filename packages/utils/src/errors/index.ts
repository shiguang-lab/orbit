/** Unlabelled credential shapes shared with legacy passthrough classification. */
export const RAW_CREDENTIAL_PATTERNS: ReadonlyArray<RegExp> = [
  /\bsk[-_][A-Za-z0-9._-]{8,200}/g,
  /\bAIza[A-Za-z0-9_-]{20,200}/g,
  /\beyJ[A-Za-z0-9_-]{8,400}\.[A-Za-z0-9_-]{8,800}\.[A-Za-z0-9_-]{8,800}/g,
];

export {
  containsSensitiveErrorCredential,
  containsStrongCredentialToken,
  redactSensitiveErrorText,
  sanitizeErrorMessage,
  sanitizePassthroughUpstreamDetails,
  sanitizeUpstreamDetails,
} from "./error-sanitization.js";

export {
  redactErrorPaths,
  stripErrorStackTail,
  stripRecognizedErrorStackTail,
} from "./error-path-redaction.js";
