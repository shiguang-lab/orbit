import { t } from "../i18n.mjs";
import { sleep } from "../utils/pid.mjs";
import { addPortOptions, runServe } from "./serve.mjs";
import { runStopCommand } from "./stop.mjs";

export function registerRestart(program) {
  addPortOptions(program.command("restart").description(t("restart.description")))
    .option("--daemon", t("serve.daemon"))
    .option("--no-open", t("serve.no_open"))
    .action(async (opts) => {
      const exitCode = await runRestartCommand(opts);
      if (exitCode !== 0) process.exitCode = exitCode;
    });
}

export async function runRestartCommand(opts = {}, deps = {}) {
  console.log(t("restart.restarting"));
  const exitCode = await runStopCommand(opts, deps);
  if (exitCode !== 0) return exitCode;
  await (deps.sleep ?? sleep)(500);
  await (deps.runServe ?? runServe)(opts, deps);
  return 0;
}
