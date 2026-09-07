export const dynamic = "force-dynamic";

import { exec } from "child_process";
import { promisify } from "util";
import path from "path";
import os from "os";
import fs from "fs/promises";
import { load as yamlLoad, dump as yamlDump } from "js-yaml";
import { isValidationFailure, validateBody } from "@orbit/core/shared/validation/helpers";
import { cliAuthOnlyConfigSchema } from "@orbit/core/control/cli-tools-config-validation";
import { getOmpCredentials, saveOmpCredentials, deleteOmpCredentials } from "@orbit/core/control/cli-tools-omp";
import { requireManagementAuth as requireCliToolsAuth } from "@orbit/core/control/management-auth";
import { sanitizeErrorMessage } from "@orbit/inference/utils/error";
import { isJsonObject, type JsonObject } from "./_lib/jsonObject.js";

const execAsync = promisify(exec);

const PROVIDER_ID = "orbit";

const getOmpDir = () => path.join(os.homedir(), ".omp", "agent");
const getOmpDbPath = () => path.join(getOmpDir(), "agent.db");
const getOmpModelsYmlPath = () => path.join(getOmpDir(), "models.yml");

const checkOmpInstalled = async () => {
  const isWindows = os.platform() === "win32";
  try {
    const command = isWindows ? "where omp" : "which omp";
    await execAsync(command, { windowsHide: true });
    return true;
  } catch {
    try {
      await fs.access(getOmpDbPath());
      return true;
    } catch {
      if (isWindows) {
        try {
          const appDataPath = path.join(process.env.LOCALAPPDATA || "", "omp", "omp.exe");
          await fs.access(appDataPath);
          return true;
        } catch {}
      }
      return false;
    }
  }
};

const readModelsYml = async (): Promise<JsonObject> => {
  try {
    const content = await fs.readFile(getOmpModelsYmlPath(), "utf-8");
    const parsed = yamlLoad(content);
    return isJsonObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

export async function GET(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;
  try {
    const installed = await checkOmpInstalled();

    if (!installed) {
      return Response.json({
        installed: false,
        config: null,
        message: "Oh My Pi is not installed",
      });
    }

    const creds = getOmpCredentials(PROVIDER_ID);
    const modelsYml = await readModelsYml();
    const providers = isJsonObject(modelsYml.providers) ? modelsYml.providers : {};
    const ymlProvider = isJsonObject(providers[PROVIDER_ID]) ? providers[PROVIDER_ID] : null;

    return Response.json({
      installed: true,
      config: {
        providers: {
          [PROVIDER_ID]: {
            baseUrl: typeof ymlProvider?.baseUrl === "string" ? ymlProvider.baseUrl : creds.baseUrl,
            apiKey: typeof ymlProvider?.apiKey === "string" ? ymlProvider.apiKey : creds.apiKey,
            discovery: isJsonObject(ymlProvider?.discovery) && typeof ymlProvider.discovery.type === "string"
              ? ymlProvider.discovery.type
              : null,
          },
        },
      },
      hasOrbit: !!(ymlProvider || creds.hasOrbit),
      configPath: getOmpModelsYmlPath(),
    });
  } catch (error) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(error) } },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;
  let rawBody;
  try {
    rawBody = await request.json();
  } catch {
    return Response.json({ error: { message: "Invalid JSON body" } }, { status: 400 });
  }

  try {
    const validation = validateBody(cliAuthOnlyConfigSchema, rawBody);
    if (isValidationFailure(validation)) {
      return Response.json({ error: validation.error }, { status: 400 });
    }
    const { baseUrl, apiKey } = validation.data;

    const normalizedBaseUrl = baseUrl.endsWith("/v1") ? baseUrl : `${baseUrl}/v1`;
    const keyRef = apiKey || "sk_orbit";

    await fs.mkdir(getOmpDir(), { recursive: true });

    // 1. Write models.yml — provider config + auto-discovery
    const modelsYml = await readModelsYml();
    const providers = isJsonObject(modelsYml.providers) ? modelsYml.providers : {};
    modelsYml.providers = providers;

    providers[PROVIDER_ID] = {
      baseUrl: normalizedBaseUrl,
      apiKey: keyRef,
      api: "openai-completions",
      authHeader: true,
      disableStrictTools: true,
      discovery: { type: "proxy" },
    };

    await fs.writeFile(getOmpModelsYmlPath(), yamlDump(modelsYml, { lineWidth: -1 }), "utf-8");

    // 2. Write auth_credentials — so omp sees orbit as "logged in"
    saveOmpCredentials(PROVIDER_ID, keyRef, normalizedBaseUrl);

    return Response.json({
      success: true,
      message:
        "Oh My Pi settings applied! Run omp and all Orbit models appear under orbit in /model.",
      configPath: getOmpModelsYmlPath(),
    });
  } catch (error) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(error) } },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  const authError = await requireCliToolsAuth(request);
  if (authError) return authError;
  try {
    // 1. Remove from models.yml
    const modelsYml = await readModelsYml();
    const providers = isJsonObject(modelsYml.providers) ? modelsYml.providers : null;
    if (providers?.[PROVIDER_ID]) {
      delete providers[PROVIDER_ID];
      if (Object.keys(providers).length === 0) delete modelsYml.providers;
      await fs.mkdir(getOmpDir(), { recursive: true });
      if (Object.keys(modelsYml).length === 0) {
        await fs.unlink(getOmpModelsYmlPath()).catch(() => {});
      } else {
        await fs.writeFile(getOmpModelsYmlPath(), yamlDump(modelsYml, { lineWidth: -1 }), "utf-8");
      }
    }

    // 2. Remove from auth_credentials
    deleteOmpCredentials(PROVIDER_ID);

    return Response.json({
      success: true,
      message: "Orbit removed from Oh My Pi",
    });
  } catch (error) {
    return Response.json(
      { error: { message: sanitizeErrorMessage(error) } },
      { status: 500 }
    );
  }
}
