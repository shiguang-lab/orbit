import { printHeading, printInfo, printSuccess } from "../io.mjs";
import { readCliVersion } from "../app-paths.mjs";
import { t } from "../i18n.mjs";

export async function getCurrentVersion() {
  try {
    return readCliVersion();
  } catch {
    return null;
  }
}

export function registerUpdate(program) {
  program
    .command("update")
    .description(t("update.checking"))
    .option("--check", "Report the workspace-managed CLI version without modifying files")
    .action(async (opts, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const exitCode = await runUpdateCommand({ ...opts, output: globalOpts.output });
      if (exitCode !== 0) process.exit(exitCode);
    });
}

/**
 * The CLI is a private workspace application. Installation and upgrades are
 * owned by the workspace package manager, so this command is intentionally
 * read-only and never writes the application tree or a global npm prefix.
 */
export async function runUpdateCommand() {
  const current = await getCurrentVersion();
  if (!current) {
    printInfo("Could not determine the workspace CLI version.");
    return 1;
  }

  printHeading("Orbit Update");
  console.log(`  Current version: ${current}`);
  printSuccess("Version check complete (read-only).");
  printInfo("This private CLI is updated with the workspace package manager from the repository root.");
  return 0;
}
