import { requireManagementAuth } from "@orbit/core/control/management-auth";
import { CommandCodeAuthRepository } from "../command-code-auth.repository.js";
import { commandCodeStateSchema, noStoreJson, stateHash } from "./shared.handler.js";

async function readState(request: Request): Promise<string | null> {
  const fromQuery = new URL(request.url).searchParams.get("state");
  if (fromQuery) return fromQuery;
  try {
    const parsed = commandCodeStateSchema.safeParse(await request.json());
    return parsed.success ? parsed.data.state : null;
  } catch {
    return null;
  }
}

export async function statusCommandCodeAuth(request: Request, repository: CommandCodeAuthRepository): Promise<Response> {
  const authError = await requireManagementAuth(request);
  if (authError) return authError;
  const state = await readState(request);
  const parsed = commandCodeStateSchema.safeParse({ state });
  if (!parsed.success) return noStoreJson({ error: "Invalid state" }, { status: 400 });
  const session = repository.getSafeStatus(stateHash(repository, parsed.data.state));
  if (!session) return noStoreJson({ status: "not_found" }, { status: 404 });
  return noStoreJson({
    status: session.status,
    metadata: session.metadata,
    expiresAt: session.expiresAt,
    receivedAt: session.receivedAt,
    appliedAt: session.appliedAt,
  });
}
