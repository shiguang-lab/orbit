export function registerProvider(program) {
  program
    .command("provider [subcommand]")
    .description("Manage provider connections (use 'providers' for the full interface)")
    .allowUnknownOption()
    .allowExcessArguments()
    .action(() => {
      console.log(`
  Use \`shiguangGateway providers\` for the full provider management interface:

    shiguangGateway providers available   — show provider catalog
    shiguangGateway providers list        — list configured connections
    shiguangGateway providers test <name> — test a provider connection
    shiguangGateway providers test-all    — test all active connections
    shiguangGateway providers validate    — validate local configuration
    shiguangGateway providers add <id>    — add an API-key connection
    shiguangGateway providers auth <id>   — start an existing OAuth flow
    shiguangGateway providers remove <id> — remove a connection (requires confirmation)
`);
    });
}
