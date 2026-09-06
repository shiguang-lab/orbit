/**
 * Builds the agent-skill CLI registry from the published capability contract.
 *
 * The command application owns Commander registration. Shared domain code only
 * consumes the stable, data-only inventory and therefore has no dependency on
 * a checkout layout, caller working directory, or application source files.
 */

import {
  CLI_CAPABILITY_MANIFEST,
  assertCliCapabilityManifest,
  type CliCapability,
} from "@shiguang-gateway/contracts/cli-capabilities";
import type { SkillArea } from "./types.js";

export interface CliCommand {
  /** Canonical command string, e.g. "providers list". */
  name: string;
  description: string;
  flags: string[];
  isSubcommand: boolean;
}

export interface ParsedCliRegistry {
  commands: Map<string, CliCommand>;
  families: Map<SkillArea, CliCommand[]>;
}

/**
 * Strict builder exported for contract tests and alternate manifest consumers.
 * Invalid or duplicate entries throw; partial registries are never returned.
 */
export function buildCliRegistry(manifest: unknown): ParsedCliRegistry {
  assertCliCapabilityManifest(manifest);

  const commands = new Map<string, CliCommand>();
  const families = new Map<SkillArea, CliCommand[]>();

  for (const capability of manifest as readonly CliCapability[]) {
    const name = capability.path.join(" ");
    const command: CliCommand = {
      name,
      description: capability.description,
      flags: [...capability.flags],
      isSubcommand: capability.path.length > 1,
    };
    commands.set(name, command);

    const family = capability.family as SkillArea;
    const familyCommands = families.get(family);
    if (familyCommands) familyCommands.push(command);
    else families.set(family, [command]);
  }

  return { commands, families };
}

export function parseCliRegistry(): ParsedCliRegistry {
  return buildCliRegistry(CLI_CAPABILITY_MANIFEST);
}

export function getCommandsForFamily(family: SkillArea): string[] {
  return (parseCliRegistry().families.get(family) ?? []).map((command) => command.name);
}
