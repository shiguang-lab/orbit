import { Inject, Injectable } from "@nestjs/common";
import { getSupervisor } from "@orbit/core/control/embedded-services-lifecycle";
import { getOrInitSupervisor as getOrInitCliproxySupervisor } from "./cliproxy/_lib.js";
import { getOrInitSupervisor as getOrInitMuxSupervisor } from "./mux/_lib.js";
import { BifrostService } from "../bifrost/bifrost.service.js";
import { DarioService } from "./dario/dario.service.js";
import { NinerouterService } from "./ninerouter/ninerouter.service.js";

export interface ServiceLogLine {
  line: string;
  [key: string]: unknown;
}

export interface ServiceLogBuffer {
  snapshot(): ServiceLogLine[];
  subscribe(listener: (line: ServiceLogLine) => void): () => void;
}

export interface LogSupervisor {
  getRingBuffer(): ServiceLogBuffer;
}

@Injectable()
export class EmbeddedServiceLogsService {
  constructor(
    @Inject(BifrostService) private readonly bifrost: BifrostService,
    @Inject(DarioService) private readonly dario: DarioService,
    @Inject(NinerouterService) private readonly ninerouter: NinerouterService,
  ) {}

  async resolveSupervisor(name: string): Promise<LogSupervisor | null> {
    const existing = getSupervisor(name);
    if (existing) return existing as unknown as LogSupervisor;
    if (name === "mux") return (await getOrInitMuxSupervisor()) as unknown as LogSupervisor;
    if (name === "cliproxy") return (await getOrInitCliproxySupervisor()) as unknown as LogSupervisor;
    if (name === "9router") return (await this.ninerouter.getOrInitSupervisor()) as unknown as LogSupervisor;
    if (name === "bifrost") return (await this.bifrost.getOrInitSupervisor()) as unknown as LogSupervisor;
    if (name === "dario") return (await this.dario.getOrInitSupervisor()) as unknown as LogSupervisor;
    return null;
  }

  async logs(name: string, request: Request): Promise<Response> {
    const url = new URL(request.url);
    const instanceId = url.searchParams.get("instanceId");

    if (name === "cliproxy" && instanceId) {
      try {
        const { getCliproxyInstance } = await import("@orbit/core/control/cliproxy");
        const instance = getCliproxyInstance(instanceId);
        if (instance && instance.type === "remote_agent") {
          const encoder = new TextEncoder();
          const chunk = (event: string, data: unknown) =>
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
          const stream = new ReadableStream<Uint8Array>({
            start: (controller) => {
              controller.enqueue(
                chunk("snapshot", [
                  {
                    line: `[${new Date().toISOString()}] [INFO] [remote-node] Attached to remote CLIProxyAPI instance: ${instance.name} (${instance.endpoint})`,
                  },
                  {
                    line: `[${new Date().toISOString()}] [INFO] [remote-node] Status: ${instance.status} | Latency: ${instance.latencyMs ?? "-"}ms | Registered accounts: ${instance.accountsCount}`,
                  },
                  {
                    line: `[${new Date().toISOString()}] [INFO] [remote-node] Remote traffic dispatch enabled (weight=${instance.weight}, tags=${JSON.stringify(instance.tags)})`,
                  },
                ])
              );
              const heartbeat = setInterval(() => {
                try {
                  controller.enqueue(chunk("heartbeat", {}));
                } catch {
                  clearInterval(heartbeat);
                }
              }, 15_000);
              request.signal.addEventListener(
                "abort",
                () => {
                  clearInterval(heartbeat);
                  try {
                    controller.close();
                  } catch {}
                },
                { once: true }
              );
            },
          });
          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache",
              Connection: "keep-alive",
              "X-Accel-Buffering": "no",
            },
          });
        }
      } catch {
        /* proceed to supervisor */
      }
    }

    const supervisor = await this.resolveSupervisor(name);
    if (!supervisor) return Response.json({ error: { message: `Service '${name}' not found`, type: "not_found" } }, { status: 404 });

    const tailRaw = url.searchParams.get("tail");
    const filterRaw = url.searchParams.get("filter");
    const tail = Math.min(tailRaw ? Math.max(0, Number.parseInt(tailRaw, 10) || 200) : 200, 1000);
    if (filterRaw !== null && filterRaw.length > 200) {
      return Response.json({ error: { message: "filter exceeds maximum length", type: "invalid_request" } }, { status: 400 });
    }

    const filterLower = filterRaw?.toLowerCase() ?? null;
    const buffer = supervisor.getRingBuffer();
    const encoder = new TextEncoder();
    const chunk = (event: string, data: unknown) => encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        const applyFilter = (line: ServiceLogLine) => filterLower === null || line.line.toLowerCase().includes(filterLower);
        controller.enqueue(chunk("snapshot", buffer.snapshot().filter(applyFilter).slice(-tail)));
        const unsubscribe = buffer.subscribe((line) => {
          if (!applyFilter(line)) return;
          try { controller.enqueue(chunk("log", line)); } catch { /* client disconnected */ }
        });
        const heartbeat = setInterval(() => {
          try { controller.enqueue(chunk("heartbeat", {})); } catch { clearInterval(heartbeat); }
        }, 15_000);
        request.signal.addEventListener("abort", () => {
          clearInterval(heartbeat);
          unsubscribe();
          try { controller.close(); } catch { /* already closed */ }
        }, { once: true });
      },
    });
    return new Response(stream, { headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache", Connection: "keep-alive", "X-Accel-Buffering": "no" } });
  }
}
