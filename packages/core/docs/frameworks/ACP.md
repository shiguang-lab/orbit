---
title: ACP CLI Agent Registry
---

# ACP CLI Agent Registry

The ACP surface is a control-plane inventory for locally installed coding CLIs. It detects known binaries, reads their versions, and lets administrators register additional CLI definitions. It does not spawn agents or execute tasks.

## Ownership

- HTTP endpoint: `apps/control-api/src/acp/`
- Detection runtime: `apps/control-api/src/acp/runtime/agent-registry.ts`
- Persistent custom definitions: control settings
- Dashboard: `/dashboard/acp-agents`

The runtime belongs to `control-api` because no other deployable application consumes it. Shared packages do not expose an ACP process manager or agent registry.

## Supported operations

| Method | Endpoint | Behavior |
| --- | --- | --- |
| `GET` | `/api/acp/agents` | Return built-in and custom definitions with installation/version status |
| `POST` | `/api/acp/agents` | Add a custom definition or refresh the detection cache |
| `DELETE` | `/api/acp/agents?id=<agent-id>` | Remove a custom definition |

Detection results are cached for 60 seconds. Refreshing clears the cache and probes again.

## Custom definitions

A custom definition contains:

```json
{
  "id": "my-cli",
  "name": "My CLI",
  "binary": "my-cli",
  "versionCommand": "my-cli --version",
  "providerAlias": "my-provider",
  "spawnArgs": [],
  "protocol": "stdio"
}
```

The version command is treated as untrusted input. It must invoke the configured binary directly, without shell metacharacters, and may use only a recognized version flag. The control API executes probes with `execFileSync`; Windows command shims use the platform-required shell behavior.

## What ACP does not do

ACP does not launch a CLI, write prompts to stdin, collect stdout, or manage process sessions. To run a local coding CLI against ShiguangGateway, use the app-owned CLI launcher documented in [CLI Integrations](../guides/CLI-INTEGRATIONS.md). For remote task execution, use the cloud-agent APIs described in [Agent Protocols Guide](./AGENT_PROTOCOLS_GUIDE.md).
