import { Injectable, type OnModuleInit } from "@nestjs/common";
import { hydrateRequestRuntime } from "@shiguang-gateway/core-domain/runtime/request";
import { ensureControlSchema } from "./control-schema.js";

const load = (specifier: string): Promise<any> => import(specifier as string);

@Injectable()
export class ControlRuntimeService implements OnModuleInit {
  private initialization: Promise<void> | null = null;

  onModuleInit(): Promise<void> {
    return this.initialize();
  }

  initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = hydrateRequestRuntime()
        .then(() => ensureControlSchema())
        .then(async () => {
          const [{ ensurePersistentManagementPasswordHash }, { getSettings }] = await Promise.all([
            load("@shiguang-gateway/core-domain/control/management-password"),
            load("@shiguang-gateway/core-domain/control/settings"),
          ]);
          const settings = await getSettings();
          await ensurePersistentManagementPasswordHash({
            logger: console,
            settings,
            source: "control-api:startup",
          });
        })
        .then(() => console.log("[control-api] request runtime initialized"))
        .catch((error) => {
          this.initialization = null;
          throw error;
        });
    }
    return this.initialization;
  }
}
