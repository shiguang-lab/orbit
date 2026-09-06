import { z } from "zod";

const optionalSecret = z.string().optional();
const version = { version: z.literal(1) } as const;

export const tunnelCommandSchema = z.discriminatedUnion("command", [
  z.object({ ...version, command: z.literal("cloudflared.status") }),
  z.object({ ...version, command: z.literal("cloudflared.enable") }),
  z.object({ ...version, command: z.literal("cloudflared.disable") }),
  z.object({ ...version, command: z.literal("ngrok.status") }),
  z.object({ ...version, command: z.literal("ngrok.enable"), authToken: optionalSecret }),
  z.object({ ...version, command: z.literal("ngrok.disable") }),
  z.object({ ...version, command: z.literal("tailscale.status") }),
  z.object({ ...version, command: z.literal("tailscale.check") }),
  z.object({
    ...version,
    command: z.literal("tailscale.enable"),
    sudoPassword: optionalSecret,
    hostname: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
  }),
  z.object({ ...version, command: z.literal("tailscale.disable"), sudoPassword: optionalSecret }),
  z.object({ ...version, command: z.literal("tailscale.login"), hostname: z.string().optional() }),
  z.object({ ...version, command: z.literal("tailscale.start-daemon"), sudoPassword: optionalSecret }),
  z.object({ ...version, command: z.literal("tailscale.install"), sudoPassword: optionalSecret }),
]);

export type TunnelCommand = z.infer<typeof tunnelCommandSchema>;
export type TunnelCommandPayload = TunnelCommand extends infer Command
  ? Command extends { version: 1 }
    ? Omit<Command, "version">
    : never
  : never;

export type TunnelInstallEvent =
  | { event: "progress"; data: { message: string } }
  | { event: "done"; data: { success: true } }
  | { event: "error"; data: { error: string } };
