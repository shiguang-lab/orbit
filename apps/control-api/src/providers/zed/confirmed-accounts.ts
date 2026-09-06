/**
 * Validation + filtering helpers for the Zed import 2-step confirmation flow.
 * Extracted so the route handler stays slim and so the rejection paths can be
 * unit-tested without spinning up Next's Request/Response stack.
 *
 * See docs/security/SOCKET_DEV_FINDINGS.md §2.
 */
import type { ZedCredential } from "./keychain-reader.js";
import { fingerprintZedCredential } from "./credential-fingerprint.js";
import {
  confirmedAccountSchema,
  zedImportSchema,
  type ConfirmedAccount,
} from "@shiguang-gateway/core-domain/shared/validation/schemas";

export function isConfirmedAccount(value: unknown): value is ConfirmedAccount {
  return confirmedAccountSchema.safeParse(value).success;
}

export function parseConfirmedAccounts(body: unknown): ConfirmedAccount[] | null {
  const result = zedImportSchema.safeParse(body) as {
    success: boolean;
    data?: { confirmedAccounts: ConfirmedAccount[] };
  };
  if (!result.success) return null;
  return result.data?.confirmedAccounts ?? null;
}

export function filterCredentialsByConfirmation(
  credentials: ZedCredential[],
  confirmed: ConfirmedAccount[]
): ZedCredential[] {
  const confirmedKeys = new Set(
    confirmed.map((c) => c.service + "|" + c.account + "|" + c.fingerprint)
  );
  return credentials.filter((cred) => {
    const fp = fingerprintZedCredential(cred.service, cred.account, cred.token);
    const key = cred.service + "|" + cred.account + "|" + fp;
    return confirmedKeys.has(key);
  });
}
