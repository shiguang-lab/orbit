import { Command, Option } from "commander";
import { registerCommands } from "./commands/registry.mjs";
import { t } from "./i18n.mjs";
import { readCliVersion } from "./app-paths.mjs";

const version = readCliVersion();

export function createProgram() {
  const program = new Command();

  program
    .name("orbit")
    .description(t("program.description"))
    .version(version, "-v, --version", t("program.version"))
    .addOption(
      new Option("--output <format>", t("program.output"))
        .choices(["table", "json", "jsonl", "csv"])
        .default("table")
    )
    .addOption(new Option("-q, --quiet", t("program.quiet")))
    .addOption(new Option("--no-color", t("program.no_color")))
    .addOption(new Option("--timeout <ms>", t("program.timeout")).default("30000"))
    .addOption(new Option("--api-key <key>", t("program.api_key")).env("ORBIT_API_KEY"))
    .addOption(new Option("--base-url <url>", t("program.base_url")).env("ORBIT_BASE_URL"))
    .addOption(
      new Option(
        "--context <name>",
        t("program.context") || "Server context/profile to use for this command"
      ).env("ORBIT_CONTEXT")
    )
    .addOption(new Option("--lang <code>", t("program.lang")))
    .showHelpAfterError(true)
    .exitOverride();

  registerCommands(program);
  return program;
}
