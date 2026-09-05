import {
  Injectable,
  type OnApplicationBootstrap,
  type OnApplicationShutdown,
} from "@nestjs/common";
import type { Server } from "node:http";

@Injectable()
export class LiveServerService implements OnApplicationBootstrap, OnApplicationShutdown {
  private server: Server | null = null;
  private initialization: Promise<void> | null = null;

  initialize(): Promise<void> {
    if (!this.initialization) {
      this.initialization = this.start().catch((error) => {
        this.initialization = null;
        throw error;
      });
    }
    return this.initialization;
  }

  /**
   * Nest owns the sidecar lifecycle just like any other module resource.
   * Keeping startup here avoids a second, app-specific service lookup in
   * `main.ts` and makes `AppModule` self-contained for tests and embedders.
   */
  async onApplicationBootstrap(): Promise<void> {
    await this.initialize();
  }

  async onApplicationShutdown(): Promise<void> {
    const server = this.server;
    this.server = null;
    if (!server?.listening) return;
    await new Promise<void>((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
  }

  private async start(): Promise<void> {
    const { startLiveDashboardServer } = await import("../../live-ws/liveServer.js");
    this.server = await startLiveDashboardServer(
      Number(process.env.LIVE_WS_PORT ?? 20132),
      process.env.LIVE_WS_HOST ?? "0.0.0.0",
    );
  }
}
