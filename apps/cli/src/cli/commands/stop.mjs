import { t } from "../i18n.mjs";
import { stopSplitServices } from "../runtime/splitLifecycle.mjs";

export function registerStop(program) {
  program.command("stop").description(t("stop.description")).action(async () => {
    const exitCode = await runStopCommand();
    if (exitCode !== 0) process.exitCode = exitCode;
  });
}

export async function runStopCommand(_opts = {}, deps = {}) {
  try {
    const stopped = await stopSplitServices(deps);
    if (stopped.length === 0) {
      console.log(t("stop.notRunning"));
      return 0;
    }
    for (const { name, pid } of stopped) console.log(`Stopped ${name} (PID ${pid})`);
    console.log(t("stop.stopped"));
    return 0;
  } catch (error) {
    console.error(t("common.error", { message: error instanceof Error ? error.message : String(error) }));
    return 1;
  }
}
