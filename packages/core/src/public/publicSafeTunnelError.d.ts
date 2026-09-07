export type PublicSafeTunnelErrorReason =
  | "not_installed"
  | "permission_denied"
  | "already_running"
  | "timeout"
  | "network"
  | "unknown";
export interface PublicSafeTunnelErrorBody {
  error: string;
  reason: PublicSafeTunnelErrorReason;
}
export function toPublicSafeTunnelError(
  error: unknown,
  fallback: string,
  context: string,
): PublicSafeTunnelErrorBody;
