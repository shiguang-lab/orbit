import { getSupervisor, unregisterSupervisor } from "../../../../../lib/services/registry.ts";
import { getOrInitSupervisor } from "../_lib";
import { generateServiceApiKey } from "../../../../../lib/services/apiKey.ts";
import { updateServiceField } from "../../../../../lib/db/versionManager.ts";
import { encrypt } from "../../../../../lib/db/encryption.ts";
import { createErrorResponse } from "../../../../../lib/api/errorResponse.ts";
import { sanitizeErrorMessage } from "../../../../../../open-sse/utils/error.ts";

export async function POST(): Promise<Response> {
  try {
    const newKey = generateServiceApiKey("nr");
    await updateServiceField("9router", "apiKey", encrypt(newKey) ?? newKey);

    const sup = getSupervisor("9router");
    const wasRunning = sup?.getStatus().state === "running";

    let restarted = false;
    if (wasRunning && sup) {
      await sup.stop();
      // Unregister the existing supervisor so its stale spawnArgs closure (which
      // captured the OLD apiKey at construction time) is discarded. getOrInitSupervisor
      // will then build a fresh supervisor whose closure reads the new key.
      unregisterSupervisor("9router");
      const freshSup = await getOrInitSupervisor();
      await freshSup.start();
      restarted = true;
    }

    // Never return the key in the default response (hard rule: no credential leak)
    return Response.json({ keyRotated: true, restarted });
  } catch (err) {
    const msg = sanitizeErrorMessage(err instanceof Error ? err.message : String(err));
    return createErrorResponse({ status: 500, message: msg });
  }
}
