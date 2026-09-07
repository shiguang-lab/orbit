export function registerProvider(program) {
  program
    .command("provider [subcommand]")
    .description("Manage provider connections (use 'providers' for the full interface)")
    .allowUnknownOption()
    .allowExcessArguments()
    .action(() => {
      console.log(`
  Use \`orbit providers\` for the full provider management interface:

    orbit providers available   — show provider catalog
    orbit providers list        — list configured connections
    orbit providers test <name> — test a provider connection
    orbit providers test-all    — test all active connections
    orbit providers validate    — validate local configuration
    orbit providers add <id>    — add an API-key connection
    orbit providers auth <id>   — start an existing OAuth flow
    orbit providers remove <id> — remove a connection (requires confirmation)
`);
    });
}
