import { t } from "../i18n.mjs";
import { isTermux } from "../runtime/platform.mjs";
import { holdForeground, resolveSplitPlan, startSplitServices } from "../runtime/splitLifecycle.mjs";
import { resolveExposureWarning, resolveServerHost } from "../utils/serverHost.mjs";

export function addPortOptions(command) {
  return command
    .option("--port <port>", t("serve.port"))
    .option("--control-port <port>", "Control API port (default: 8788)")
    .option("--realtime-port <port>", "Realtime health port (default: 8790)")
    .option("--live-ws-port <port>", "Realtime WebSocket port (default: 20132)")
    .option("--worker-command-port <port>", "Worker command port (default: 8791)");
}

export function registerServe(program) {
  return addPortOptions(
    program.command("serve", { isDefault: true }).description(t("serve.description"))
  )
    .option("--no-open", t("serve.no_open"))
    .option("--daemon", t("serve.daemon"))
    .option("--tray", t("serve.tray") || "Start in the system tray")
    .option("--no-tray", t("serve.no_tray") || "Disable system tray icon")
    .action(async (opts) => runServe(opts));
}

export async function runServe(opts = {}, deps = {}) {
  if (opts.tray === true) {
    throw new Error("--tray is not supported by the split runtime; use --daemon instead");
  }

  const env = {
    ...process.env,
    EDGE_GATEWAY_HOST: process.env.EDGE_GATEWAY_HOST ?? resolveServerHost(),
  };
  const plan = resolveSplitPlan(opts, env, deps.workspaceRoot);
  const warning = resolveExposureWarning();
  if (warning) console.warn(`\x1b[33m⚠ ${warning}\x1b[0m`);

  console.log("Starting split runtime: edge, control, realtime, worker...");
  const children = await startSplitServices(plan, { daemon: opts.daemon === true }, deps);
  const [edge, control, realtime, worker] = plan;
  console.log("\x1b[32m✔ Orbit split runtime is healthy\x1b[0m");
  console.log(`  Edge/API:       http://localhost:${edge.health.port}/v1`);
  console.log(`  Control API:    http://localhost:${control.health.port}`);
  console.log(`  Realtime:       http://localhost:${realtime.health.port}`);
  console.log(`  Realtime WS:    ws://localhost:${realtime.env.LIVE_WS_PORT}`);
  console.log(`  Worker command: http://localhost:${worker.health.port}`);

  if (opts.daemon !== true && opts.open !== false && !isTermux()) {
    const open = await import("open").then((module) => module.default).catch(() => null);
    await open?.(`http://localhost:${edge.health.port}`);
  }
  if (opts.daemon === true) return children;

  console.log("  Press Ctrl+C to stop all services");
  await holdForeground(children, deps);
  return children;
}
