import { Injectable } from "@nestjs/common";
import type { FastifyReply, FastifyRequest } from "fastify";
import { createHash } from "node:crypto";
import { globalTrafficBuffer } from "@orbit/core/control/traffic-inspector";
import {
  annotateRequest,
  captureHttpProxy,
  captureSystemProxy,
  deleteHost,
  exportHar,
  getRequest,
  ingestRequest,
  patchHost,
  replayRequest,
  toggleTlsIntercept,
} from "./traffic-inspector.handlers.js";

/** Application service for Traffic Inspector capture and request operations. */
@Injectable()
export class TrafficInspectorService {
  captureHttpProxy(request: Request) { return captureHttpProxy(request); }
  captureSystemProxy(request: Request) { return captureSystemProxy(request); }
  toggleTlsIntercept(request: Request) { return toggleTlsIntercept(request); }
  exportHar(request: Request) { return exportHar(request); }
  deleteHost(host: string) { return deleteHost(host); }
  patchHost(request: Request, host: string) { return patchHost(request, host); }
  ingestRequest(request: Request) { return ingestRequest(request); }
  getRequest(id: string) { return getRequest(id); }
  annotateRequest(request: Request, id: string) { return annotateRequest(request, id); }
  replayRequest(id: string) { return replayRequest(id); }

  /** Upgrade the inspector live stream directly on Fastify's raw socket. */
  async handleWebSocket(request: FastifyRequest, reply: FastifyReply): Promise<void> {
    if (String(request.headers.upgrade ?? "").toLowerCase() !== "websocket") {
      await reply.code(426).header("content-type", "application/json").header("upgrade", "websocket").send({ error: { message: "Upgrade Required" } });
      return;
    }
    const key = request.headers["sec-websocket-key"];
    const clientKey = Array.isArray(key) ? key[0] : key;
    const socket = (request.raw as unknown as { socket?: import("node:net").Socket }).socket;
    if (!clientKey || !socket) {
      await reply.code(400).send({ error: { message: clientKey ? "WebSocket upgrade unavailable" : "Missing Sec-WebSocket-Key" } });
      return;
    }
    const accept = createHash("sha1").update(`${clientKey}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
    const frame = (opcode: number, payload: Buffer): Buffer => {
      const length = payload.length;
      if (length < 126) return Buffer.concat([Buffer.from([0x80 | opcode, length]), payload]);
      const header = Buffer.alloc(length <= 0xffff ? 4 : 10);
      header[0] = 0x80 | opcode;
      if (length <= 0xffff) { header[1] = 126; header.writeUInt16BE(length, 2); }
      else { header[1] = 127; header.writeBigUInt64BE(BigInt(length), 2); }
      return Buffer.concat([header, payload]);
    };
    let cleanup = (): void => undefined;
    const send = (event: unknown): void => {
      try { socket.write(frame(0x01, Buffer.from(JSON.stringify(event), "utf8"))); } catch { cleanup(); }
    };
    socket.write(["HTTP/1.1 101 Switching Protocols", "Upgrade: websocket", "Connection: Upgrade", `Sec-WebSocket-Accept: ${accept}`, "\r\n"].join("\r\n"));
    send({ type: "snapshot", data: globalTrafficBuffer.list() });
    const unsubscribe = globalTrafficBuffer.subscribe(send);
    const timer = setInterval(() => { try { socket.write(frame(0x09, Buffer.alloc(0))); } catch { cleanup(); } }, 30_000);
    cleanup = (): void => { clearInterval(timer); unsubscribe(); };
    socket.once("close", cleanup);
    socket.once("error", cleanup);
    await new Promise<void>((resolve) => socket.once("close", resolve));
  }
}
