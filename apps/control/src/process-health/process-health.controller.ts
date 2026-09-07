import { Controller, Get } from "@nestjs/common";

@Controller()
export class ProcessHealthController {
  @Get("livez")
  live() { return { status: "ok" as const }; }

  @Get("healthz")
  health() { return { status: "ok" as const }; }

  @Get("readyz")
  ready() { return { status: "ok" as const }; }
}
